package com.spendwise.dto.response;

import com.spendwise.model.Budget;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class BudgetResponse {
    private UUID id;
    private Long categoryId;
    private String categoryName;
    private BigDecimal monthlyLimit;
    private BigDecimal spent;
    private BigDecimal remaining;
    private Double percentUsed;
    private Integer month;
    private Integer year;
    private String alertLevel; // NORMAL, WARNING (80%), EXCEEDED (100%)

    public static BudgetResponse from(Budget budget, BigDecimal spent) {
        BigDecimal limit = budget.getMonthlyLimit();
        BigDecimal remaining = limit.subtract(spent);

        double percent = 0.0;
        if (limit.compareTo(BigDecimal.ZERO) > 0) {
            percent = spent.doubleValue() / limit.doubleValue() * 100;
        }

        String alert = "NORMAL";
        if (percent >= 100) alert = "EXCEEDED";
        else if (percent >= 80) alert = "WARNING";

        return BudgetResponse.builder()
                .id(budget.getId())
                .categoryId(budget.getCategory().getId())
                .categoryName(budget.getCategory().getName())
                .monthlyLimit(limit)
                .spent(spent)
                .remaining(remaining)
                .percentUsed(Math.round(percent * 100.0) / 100.0)
                .month(budget.getMonth())
                .year(budget.getYear())
                .alertLevel(alert)
                .build();
    }
}
