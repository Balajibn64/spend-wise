package com.spendwise.service;

import com.spendwise.dto.response.DashboardResponse;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getMonthlySummary(UUID userId, Integer month, Integer year) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        BigDecimal totalIncome = transactionRepository.sumByUserAndTypeAndDateRange(
                userId, TransactionType.INCOME, start, end);
        BigDecimal totalExpense = transactionRepository.sumByUserAndTypeAndDateRange(
                userId, TransactionType.EXPENSE, start, end);

        // Running balance: all income/expense up to and including this month, so a
        // month's ending balance carries forward as next month's starting point.
        BigDecimal cumulativeIncome = transactionRepository.sumByUserAndTypeUpTo(
                userId, TransactionType.INCOME, end);
        BigDecimal cumulativeExpense = transactionRepository.sumByUserAndTypeUpTo(
                userId, TransactionType.EXPENSE, end);

        List<DashboardResponse.CategoryBreakdown> categoryBreakdown = buildCategoryBreakdown(
                userId, TransactionType.EXPENSE, start, end);

        LocalDate sixMonthsAgo = start.minusMonths(5).withDayOfMonth(1);
        List<DashboardResponse.MonthlyComparison> monthlyComparison = buildMonthlyComparison(
                userId, sixMonthsAgo, end);

        List<DashboardResponse.PaymentMethodBreakdown> paymentMethodDist = buildPaymentMethodDistribution(
                userId, start, end);

        List<DashboardResponse.DailySpending> dailySpending = buildDailySpending(userId, start, end);

        return DashboardResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .balance(cumulativeIncome.subtract(cumulativeExpense))
                .categoryBreakdown(categoryBreakdown)
                .monthlyComparison(monthlyComparison)
                .paymentMethodDistribution(paymentMethodDist)
                .dailySpending(dailySpending)
                .build();
    }

    private List<DashboardResponse.DailySpending> buildDailySpending(
            UUID userId, LocalDate start, LocalDate end) {
        List<Object[]> data = transactionRepository.getDailyTotals(
                userId, TransactionType.EXPENSE, start, end);

        Map<Integer, BigDecimal> byDay = new HashMap<>();
        for (Object[] row : data) {
            byDay.put(((Number) row[0]).intValue(), (BigDecimal) row[1]);
        }

        List<DashboardResponse.DailySpending> result = new ArrayList<>();
        for (int day = 1; day <= end.getDayOfMonth(); day++) {
            result.add(DashboardResponse.DailySpending.builder()
                    .day(day)
                    .amount(byDay.getOrDefault(day, BigDecimal.ZERO))
                    .build());
        }
        return result;
    }

    private List<DashboardResponse.CategoryBreakdown> buildCategoryBreakdown(
            UUID userId, TransactionType type, LocalDate start, LocalDate end) {
        List<Object[]> data = transactionRepository.getCategoryBreakdown(userId, type, start, end);
        BigDecimal total = data.stream()
                .map(row -> (BigDecimal) row[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return data.stream()
                .map(row -> {
                    BigDecimal amount = (BigDecimal) row[1];
                    double pct = total.compareTo(BigDecimal.ZERO) > 0
                            ? amount.multiply(BigDecimal.valueOf(100))
                                .divide(total, 2, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    return DashboardResponse.CategoryBreakdown.builder()
                            .category((String) row[0])
                            .amount(amount)
                            .percentage(pct)
                            .build();
                })
                .toList();
    }

    private List<DashboardResponse.MonthlyComparison> buildMonthlyComparison(
            UUID userId, LocalDate start, LocalDate end) {
        List<Object[]> data = transactionRepository.getMonthlyComparison(userId, start, end);

        // Pre-populate every month in the range, in order, so a month with no
        // transactions still appears (zero-filled) instead of vanishing from
        // the chart entirely.
        Map<String, BigDecimal[]> monthMap = new LinkedHashMap<>();
        for (LocalDate cursor = start.withDayOfMonth(1); !cursor.isAfter(end); cursor = cursor.plusMonths(1)) {
            monthMap.put(monthKey(cursor.getMonthValue(), cursor.getYear()), new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }

        for (Object[] row : data) {
            int m = ((Number) row[0]).intValue();
            int y = ((Number) row[1]).intValue();
            TransactionType type = (TransactionType) row[2];
            BigDecimal amount = (BigDecimal) row[3];

            String key = monthKey(m, y);
            BigDecimal[] slot = monthMap.computeIfAbsent(key, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});

            if (type == TransactionType.INCOME) {
                slot[0] = amount;
            } else {
                slot[1] = amount;
            }
        }

        return monthMap.entrySet().stream()
                .map(e -> DashboardResponse.MonthlyComparison.builder()
                        .month(e.getKey())
                        .income(e.getValue()[0])
                        .expense(e.getValue()[1])
                        .build())
                .toList();
    }

    private String monthKey(int month, int year) {
        return Month.of(month).getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + year;
    }

    private List<DashboardResponse.PaymentMethodBreakdown> buildPaymentMethodDistribution(
            UUID userId, LocalDate start, LocalDate end) {
        List<Object[]> data = transactionRepository.getPaymentMethodDistribution(
                userId, TransactionType.EXPENSE, start, end);
        BigDecimal total = data.stream()
                .map(row -> (BigDecimal) row[1])
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return data.stream()
                .map(row -> {
                    BigDecimal amount = (BigDecimal) row[1];
                    double pct = total.compareTo(BigDecimal.ZERO) > 0
                            ? amount.multiply(BigDecimal.valueOf(100))
                                .divide(total, 2, RoundingMode.HALF_UP).doubleValue()
                            : 0.0;
                    return DashboardResponse.PaymentMethodBreakdown.builder()
                            .method(row[0].toString())
                            .amount(amount)
                            .percentage(pct)
                            .build();
                })
                .toList();
    }
}
