package com.spendwise.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class DashboardResponse {
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;
    private BigDecimal balance;
    private List<CategoryBreakdown> categoryBreakdown;
    private List<MonthlyComparison> monthlyComparison;
    private List<PaymentMethodBreakdown> paymentMethodDistribution;
    private List<DailySpending> dailySpending;

    @Data
    @Builder
    @AllArgsConstructor
    public static class CategoryBreakdown {
        private String category;
        private BigDecimal amount;
        private Double percentage;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class MonthlyComparison {
        private String month;
        private BigDecimal income;
        private BigDecimal expense;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class PaymentMethodBreakdown {
        private String method;
        private BigDecimal amount;
        private Double percentage;
    }

    @Data
    @Builder
    @AllArgsConstructor
    public static class DailySpending {
        private Integer day;
        private BigDecimal amount;
    }
}
