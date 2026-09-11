package com.spendwise.service;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.opencsv.CSVWriter;
import com.spendwise.model.Transaction;
import com.spendwise.model.enums.PaymentMethod;
import com.spendwise.model.enums.TransactionType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final TransactionService transactionService;
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");

    // ---- Violet theme colors ----
    private static final Color VIOLET_PRIMARY = new Color(124, 58, 237);   // #7C3AED
    private static final Color VIOLET_DARK = new Color(91, 33, 182);       // #5B21B6
    private static final Color VIOLET_LIGHT = new Color(237, 233, 254);    // #EDE9FE
    private static final Color GREEN = new Color(22, 163, 74);             // #16A34A
    private static final Color RED = new Color(220, 38, 38);               // #DC2626
    private static final Color TEXT_DARK = new Color(30, 27, 75);          // #1E1B4B
    private static final Color TEXT_MUTED = new Color(107, 114, 128);      // #6B7280
    private static final Color ROW_ALT = new Color(245, 243, 255);         // light violet tint

    // ========== CSV EXPORT ==========

    public byte[] exportCsv(UUID userId, LocalDate startDate, LocalDate endDate) {
        List<Transaction> transactions = transactionService.getTransactionsForExport(userId, startDate, endDate);

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        int incomeCount = 0;
        int expenseCount = 0;

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            // UTF-8 BOM so Excel recognizes the encoding and renders the ₹ symbol correctly.
            out.write(0xEF);
            out.write(0xBB);
            out.write(0xBF);

            try (CSVWriter writer = new CSVWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
                // Header row
                writer.writeNext(new String[]{
                        "Date", "Type", "Category", "Amount (₹)", "Payment Method", "Description"
                });

                // Data rows
                for (Transaction t : transactions) {
                    writer.writeNext(new String[]{
                            t.getTransactionDate().format(DATE_FMT),
                            formatType(t.getType()),
                            csvSafe(t.getCategory().getName()),
                            t.getAmount().toPlainString(),
                            formatPaymentMethod(t.getPaymentMethod()),
                            csvSafe(t.getDescription() != null ? t.getDescription() : "")
                    });

                    if (t.getType() == TransactionType.INCOME) {
                        totalIncome = totalIncome.add(t.getAmount());
                        incomeCount++;
                    } else {
                        totalExpense = totalExpense.add(t.getAmount());
                        expenseCount++;
                    }
                }

                // Blank separator row
                writer.writeNext(new String[]{""});

                // Summary rows
                writer.writeNext(new String[]{"SUMMARY", "", "", "", "", ""});
                writer.writeNext(new String[]{
                        "Total Income", String.valueOf(incomeCount) + " transactions", "",
                        totalIncome.toPlainString(), "", ""
                });
                writer.writeNext(new String[]{
                        "Total Expense", String.valueOf(expenseCount) + " transactions", "",
                        totalExpense.toPlainString(), "", ""
                });
                writer.writeNext(new String[]{
                        "Net Balance", (incomeCount + expenseCount) + " total transactions", "",
                        totalIncome.subtract(totalExpense).toPlainString(), "", ""
                });
                writer.writeNext(new String[]{
                        "Period", startDate.format(DATE_FMT) + " to " + endDate.format(DATE_FMT),
                        "", "", "", ""
                });
            }

            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export CSV", e);
        }
    }

    /**
     * Prefixes a value with a single quote if it starts with a character that
     * spreadsheet software (Excel, Sheets) would interpret as a formula
     * (=, +, -, @) or that could break out of a cell (tab, CR). Without this,
     * a category or description imported from user data could execute a
     * formula — e.g. a HYPERLINK() call — when the export is reopened.
     */
    private String csvSafe(String value) {
        if (value == null || value.isEmpty()) return value;
        char first = value.charAt(0);
        if (first == '=' || first == '+' || first == '-' || first == '@'
                || first == '\t' || first == '\r') {
            return "'" + value;
        }
        return value;
    }

    // ========== PDF EXPORT ==========

    public byte[] exportPdf(UUID userId, LocalDate startDate, LocalDate endDate) {
        List<Transaction> transactions = transactionService.getTransactionsForExport(userId, startDate, endDate);

        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        int incomeCount = 0;
        int expenseCount = 0;

        for (Transaction t : transactions) {
            if (t.getType() == TransactionType.INCOME) {
                totalIncome = totalIncome.add(t.getAmount());
                incomeCount++;
            } else {
                totalExpense = totalExpense.add(t.getAmount());
                expenseCount++;
            }
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate());
            PdfWriter.getInstance(document, out);
            document.open();

            // ---- Title ----
            Font titleFont = new Font(Font.HELVETICA, 20, Font.BOLD, VIOLET_DARK);
            Paragraph title = new Paragraph("SpendWise", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(4);
            document.add(title);

            Font reportFont = new Font(Font.HELVETICA, 13, Font.NORMAL, TEXT_DARK);
            Paragraph reportTitle = new Paragraph("Transaction Report", reportFont);
            reportTitle.setAlignment(Element.ALIGN_CENTER);
            reportTitle.setSpacingAfter(6);
            document.add(reportTitle);

            Font subtitleFont = new Font(Font.HELVETICA, 10, Font.NORMAL, TEXT_MUTED);
            Paragraph subtitle = new Paragraph(
                    "Period: " + startDate.format(DATE_FMT) + " to " + endDate.format(DATE_FMT) +
                    "  |  " + transactions.size() + " transactions", subtitleFont);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(16);
            document.add(subtitle);

            // ---- Summary Cards ----
            PdfPTable summaryTable = new PdfPTable(3);
            summaryTable.setWidthPercentage(80);
            summaryTable.setWidths(new float[]{1, 1, 1});
            summaryTable.setSpacingAfter(20);

            addSummaryCard(summaryTable, "Total Income",
                    formatINR(totalIncome), incomeCount + " transactions", GREEN);
            addSummaryCard(summaryTable, "Total Expense",
                    formatINR(totalExpense), expenseCount + " transactions", RED);

            BigDecimal netBalance = totalIncome.subtract(totalExpense);
            Color netColor = netBalance.compareTo(BigDecimal.ZERO) >= 0 ? GREEN : RED;
            addSummaryCard(summaryTable, "Net Balance",
                    formatINR(netBalance), (netBalance.compareTo(BigDecimal.ZERO) >= 0 ? "Surplus" : "Deficit"), netColor);

            document.add(summaryTable);

            // ---- Transaction Table ----
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{13, 10, 15, 13, 14, 35});

            // Table headers
            Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
            String[] headers = {"Date", "Type", "Category", "Amount (₹)", "Payment Method", "Description"};
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, headerFont));
                cell.setBackgroundColor(VIOLET_PRIMARY);
                cell.setPadding(8);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setBorderColor(VIOLET_DARK);
                table.addCell(cell);
            }

            // Table rows
            Font cellFont = new Font(Font.HELVETICA, 8, Font.NORMAL, TEXT_DARK);
            Font incomeFont = new Font(Font.HELVETICA, 8, Font.BOLD, GREEN);
            Font expenseFont = new Font(Font.HELVETICA, 8, Font.BOLD, RED);
            boolean alternate = false;

            for (Transaction t : transactions) {
                Color bgColor = alternate ? ROW_ALT : Color.WHITE;
                boolean isIncome = t.getType() == TransactionType.INCOME;

                addStyledCell(table, t.getTransactionDate().format(DATE_FMT), cellFont, bgColor, Element.ALIGN_CENTER);

                // Type with color
                Font typeFont = new Font(Font.HELVETICA, 8, Font.BOLD, isIncome ? GREEN : RED);
                addStyledCell(table, formatType(t.getType()), typeFont, bgColor, Element.ALIGN_CENTER);

                addStyledCell(table, t.getCategory().getName(), cellFont, bgColor, Element.ALIGN_LEFT);

                // Amount with color
                String amountStr = (isIncome ? "+ " : "- ") + formatINR(t.getAmount());
                addStyledCell(table, amountStr, isIncome ? incomeFont : expenseFont, bgColor, Element.ALIGN_RIGHT);

                addStyledCell(table, formatPaymentMethod(t.getPaymentMethod()), cellFont, bgColor, Element.ALIGN_CENTER);
                addStyledCell(table, t.getDescription() != null ? t.getDescription() : "-", cellFont, bgColor, Element.ALIGN_LEFT);

                alternate = !alternate;
            }

            document.add(table);

            // ---- Footer ----
            Paragraph footer = new Paragraph();
            footer.setSpacingBefore(20);
            Font footerFont = new Font(Font.HELVETICA, 8, Font.ITALIC, TEXT_MUTED);
            footer.add(new Phrase("Generated by SpendWise on " +
                    LocalDate.now().format(DATE_FMT), footerFont));
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to export PDF", e);
        }
    }

    // ========== HELPERS ==========

    private void addStyledCell(PdfPTable table, String text, Font font, Color bgColor, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bgColor);
        cell.setPadding(6);
        cell.setHorizontalAlignment(alignment);
        cell.setBorderColor(new Color(221, 214, 254)); // light violet border
        table.addCell(cell);
    }

    private void addSummaryCard(PdfPTable table, String label, String value, String subtext, Color accentColor) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(VIOLET_LIGHT);
        cell.setPadding(12);
        cell.setBorderColor(new Color(196, 181, 253)); // violet-300
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        Font labelFont = new Font(Font.HELVETICA, 9, Font.NORMAL, TEXT_MUTED);
        Font valueFont = new Font(Font.HELVETICA, 14, Font.BOLD, accentColor);
        Font subFont = new Font(Font.HELVETICA, 8, Font.NORMAL, TEXT_MUTED);

        Paragraph p = new Paragraph();
        p.setAlignment(Element.ALIGN_CENTER);
        p.add(new Phrase(label + "\n", labelFont));
        p.add(new Phrase(value + "\n", valueFont));
        p.add(new Phrase(subtext, subFont));
        cell.addElement(p);

        table.addCell(cell);
    }

    private String formatType(TransactionType type) {
        return type == TransactionType.INCOME ? "Income" : "Expense";
    }

    private String formatPaymentMethod(PaymentMethod pm) {
        return switch (pm) {
            case CASH -> "Cash";
            case UPI -> "UPI";
            case DEBIT_CARD -> "Debit Card";
            case CREDIT_CARD -> "Credit Card";
            case NET_BANKING -> "Net Banking";
            case WALLET -> "Wallet";
        };
    }

    private String formatINR(BigDecimal amount) {
        NumberFormat nf = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));
        nf.setMaximumFractionDigits(0);
        return nf.format(amount);
    }
}
