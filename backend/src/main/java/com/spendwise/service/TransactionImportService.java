package com.spendwise.service;

import com.spendwise.dto.response.ImportResultResponse;
import com.spendwise.exception.BadRequestException;
import com.spendwise.exception.ResourceNotFoundException;
import com.spendwise.model.Category;
import com.spendwise.model.Transaction;
import com.spendwise.model.User;
import com.spendwise.model.enums.PaymentMethod;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.CategoryRepository;
import com.spendwise.repository.TransactionRepository;
import com.spendwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class TransactionImportService {

    /** A single sheet holds at most this many data rows; larger files must be split. */
    private static final int MAX_ROWS = 5000;

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryService categoryService;
    private final UserRepository userRepository;

    @Transactional
    public ImportResultResponse importFromExcel(UUID userId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new BadRequestException("Uploaded file is empty");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        try (InputStream in = file.getInputStream(); Workbook workbook = WorkbookFactory.create(in)) {
            Sheet sheet = workbook.getSheetAt(0);
            int dataRows = sheet.getLastRowNum() - sheet.getFirstRowNum();
            if (dataRows > MAX_ROWS) {
                throw new BadRequestException(
                        "File has " + dataRows + " rows; the limit per import is " + MAX_ROWS
                                + ". Please split it into smaller files.");
            }
            return parseSheet(user, sheet);
        } catch (IOException e) {
            throw new BadRequestException("Could not read the uploaded file: " + e.getMessage());
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Could not parse the uploaded file. Is it a valid .xlsx/.xls file?");
        }
    }

    private record ParsedRow(
            int excelRowNumber, TransactionType type, LocalDate date, BigDecimal amount,
            String categoryName, PaymentMethod paymentMethod, String description) {
    }

    private ImportResultResponse parseSheet(User user, Sheet sheet) {
        Row headerRow = sheet.getRow(sheet.getFirstRowNum());
        if (headerRow == null) {
            throw new BadRequestException("The uploaded file has no header row");
        }
        Map<String, Integer> columns = indexColumns(headerRow);

        int dateCol = requireColumn(columns, "Date");
        int categoryCol = requireColumn(columns, "Category");
        int typeCol = requireColumn(columns, "Income/Expense");
        Integer amountCol = columns.getOrDefault("INR", columns.get("Amount"));
        if (amountCol == null) {
            throw new BadRequestException("Could not find an amount column (expected 'INR' or 'Amount')");
        }
        Integer accountCol = columns.get("Account");
        Integer subcategoryCol = columns.get("Subcategory");
        Integer noteCol = columns.get("Note");
        Integer descriptionCol = columns.get("Description");

        List<ParsedRow> parsedRows = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int skipped = 0;

        for (int r = sheet.getFirstRowNum() + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null || isRowBlank(row)) continue;

            int excelRowNumber = r + 1; // 1-based, for user-facing error messages
            try {
                TransactionType type = parseType(getCellString(row.getCell(typeCol)));

                LocalDate date = parseDate(row.getCell(dateCol));
                BigDecimal amount = parseAmount(row.getCell(amountCol));
                if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("amount must be positive");
                }

                String rawCategoryName = getCellString(row.getCell(categoryCol));
                String cleanCategoryName = cleanName(rawCategoryName);
                if (cleanCategoryName.isEmpty()) {
                    throw new IllegalArgumentException("missing category");
                }

                PaymentMethod paymentMethod = mapPaymentMethod(
                        accountCol != null ? getCellString(row.getCell(accountCol)) : null);

                String description = buildDescription(
                        subcategoryCol != null ? getCellString(row.getCell(subcategoryCol)) : "",
                        noteCol != null ? getCellString(row.getCell(noteCol)) : "",
                        descriptionCol != null ? getCellString(row.getCell(descriptionCol)) : "");

                parsedRows.add(new ParsedRow(excelRowNumber, type, date, amount, cleanCategoryName,
                        paymentMethod, description));
            } catch (Exception ex) {
                skipped++;
                errors.add("Row " + excelRowNumber + ": " + ex.getMessage());
            }
        }

        Set<String> existingSignatures = loadExistingSignatures(user.getId(), parsedRows);
        Set<String> seenInFile = new HashSet<>();
        Set<String> categoriesCreated = new LinkedHashSet<>();
        int imported = 0;
        int colorSeed = 0;

        for (ParsedRow pr : parsedRows) {
            String signature = signatureOf(pr.date(), pr.amount(), pr.type(), pr.categoryName(), pr.description());
            if (existingSignatures.contains(signature) || !seenInFile.add(signature)) {
                skipped++;
                errors.add("Row " + pr.excelRowNumber() + ": duplicate of an existing transaction, skipped");
                continue;
            }

            boolean isNewCategory = categoryRepository
                    .findVisibleToUserByTypeAndName(user.getId(), pr.type(), pr.categoryName())
                    .isEmpty();
            Category category = categoryService.findOrCreateForUser(user, pr.type(), pr.categoryName(), colorSeed);
            if (isNewCategory) {
                colorSeed++;
                categoriesCreated.add(pr.categoryName());
            }

            Transaction transaction = Transaction.builder()
                    .user(user)
                    .category(category)
                    .amount(pr.amount())
                    .type(pr.type())
                    .paymentMethod(pr.paymentMethod())
                    .description(pr.description())
                    .transactionDate(pr.date())
                    .build();
            transactionRepository.save(transaction);
            imported++;
        }

        return ImportResultResponse.builder()
                .imported(imported)
                .skipped(skipped)
                .categoriesCreated(new ArrayList<>(categoriesCreated))
                .errors(errors)
                .build();
    }

    private Set<String> loadExistingSignatures(UUID userId, List<ParsedRow> parsedRows) {
        if (parsedRows.isEmpty()) return Set.of();
        LocalDate min = parsedRows.stream().map(ParsedRow::date).min(LocalDate::compareTo).orElseThrow();
        LocalDate max = parsedRows.stream().map(ParsedRow::date).max(LocalDate::compareTo).orElseThrow();
        List<Transaction> existing = transactionRepository.findByUserIdAndDateRange(userId, min, max);
        Set<String> signatures = new HashSet<>();
        for (Transaction t : existing) {
            signatures.add(signatureOf(t.getTransactionDate(), t.getAmount(), t.getType(),
                    t.getCategory().getName(), t.getDescription()));
        }
        return signatures;
    }

    private String signatureOf(LocalDate date, BigDecimal amount, TransactionType type,
                                String categoryName, String description) {
        return date + "|" + amount.setScale(2, RoundingMode.HALF_UP) + "|" + type + "|"
                + categoryName.trim().toLowerCase(Locale.ROOT) + "|"
                + (description == null ? "" : description.trim().toLowerCase(Locale.ROOT));
    }

    private Map<String, Integer> indexColumns(Row headerRow) {
        Map<String, Integer> map = new LinkedHashMap<>();
        for (Cell cell : headerRow) {
            String name = getCellString(cell).trim();
            if (!name.isEmpty() && !map.containsKey(name)) {
                map.put(name, cell.getColumnIndex());
            }
        }
        return map;
    }

    private int requireColumn(Map<String, Integer> columns, String name) {
        Integer idx = columns.get(name);
        if (idx == null) {
            throw new BadRequestException("Missing required column: " + name);
        }
        return idx;
    }

    private boolean isRowBlank(Row row) {
        for (Cell cell : row) {
            if (cell.getCellType() != CellType.BLANK && !getCellString(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private TransactionType parseType(String raw) {
        String v = raw.trim();
        if (v.equalsIgnoreCase("expense")) return TransactionType.EXPENSE;
        if (v.equalsIgnoreCase("income")) return TransactionType.INCOME;
        throw new IllegalArgumentException("unrecognized type '" + raw + "'");
    }

    private LocalDate parseDate(Cell cell) {
        if (cell == null) throw new IllegalArgumentException("missing date");
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getLocalDateTimeCellValue().toLocalDate();
        }
        if (cell.getCellType() == CellType.NUMERIC) {
            double serial = cell.getNumericCellValue();
            return DateUtil.getJavaDate(serial).toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        String text = getCellString(cell).trim();
        for (String pattern : new String[]{"yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "dd-MM-yyyy"}) {
            try {
                return LocalDate.parse(text, java.time.format.DateTimeFormatter.ofPattern(pattern));
            } catch (Exception ignored) {
                // try next pattern
            }
        }
        throw new IllegalArgumentException("unrecognized date '" + text + "'");
    }

    private BigDecimal parseAmount(Cell cell) {
        if (cell == null) throw new IllegalArgumentException("missing amount");
        double numeric;
        if (cell.getCellType() == CellType.NUMERIC) {
            numeric = cell.getNumericCellValue();
        } else if (cell.getCellType() == CellType.FORMULA
                && cell.getCachedFormulaResultType() == CellType.NUMERIC) {
            numeric = cell.getNumericCellValue();
        } else {
            String text = getCellString(cell).trim();
            try {
                return new BigDecimal(text).setScale(2, RoundingMode.HALF_UP);
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("unrecognized amount '" + text + "'");
            }
        }
        return BigDecimal.valueOf(numeric).setScale(2, RoundingMode.HALF_UP);
    }

    private String cleanName(String raw) {
        return raw.replaceAll("^[^\\p{L}\\p{N}]+", "").trim();
    }

    private PaymentMethod mapPaymentMethod(String account) {
        if (account != null && account.trim().equalsIgnoreCase("cash")) {
            return PaymentMethod.CASH;
        }
        return PaymentMethod.UPI;
    }

    private String buildDescription(String subcategory, String note, String description) {
        List<String> parts = new ArrayList<>();
        for (String part : new String[]{subcategory, note, description}) {
            if (part != null && !part.isBlank()) {
                parts.add(part.trim());
            }
        }
        return String.join(" · ", parts);
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> DateUtil.isCellDateFormatted(cell)
                    ? cell.getLocalDateTimeCellValue().toLocalDate().toString()
                    : String.valueOf(cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> "";
        };
    }
}
