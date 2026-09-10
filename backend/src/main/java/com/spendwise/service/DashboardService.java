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

        List<DashboardResponse.CategoryBreakdown> categoryBreakdown = buildCategoryBreakdown(
                userId, TransactionType.EXPENSE, start, end);

        LocalDate sixMonthsAgo = start.minusMonths(5).withDayOfMonth(1);
        List<DashboardResponse.MonthlyComparison> monthlyComparison = buildMonthlyComparison(
                userId, sixMonthsAgo, end);

        List<DashboardResponse.PaymentMethodBreakdown> paymentMethodDist = buildPaymentMethodDistribution(
                userId, start, end);

        return DashboardResponse.builder()
                .totalIncome(totalIncome)
                .totalExpense(totalExpense)
                .balance(totalIncome.subtract(totalExpense))
                .categoryBreakdown(categoryBreakdown)
                .monthlyComparison(monthlyComparison)
                .paymentMethodDistribution(paymentMethodDist)
                .build();
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

        Map<String, BigDecimal[]> monthMap = new LinkedHashMap<>();
        for (Object[] row : data) {
            int m = ((Number) row[0]).intValue();
            int y = ((Number) row[1]).intValue();
            TransactionType type = (TransactionType) row[2];
            BigDecimal amount = (BigDecimal) row[3];

            String key = Month.of(m).getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + y;
            monthMap.computeIfAbsent(key, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});

            if (type == TransactionType.INCOME) {
                monthMap.get(key)[0] = amount;
            } else {
                monthMap.get(key)[1] = amount;
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
