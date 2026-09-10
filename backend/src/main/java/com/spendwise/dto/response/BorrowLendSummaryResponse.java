package com.spendwise.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
public class BorrowLendSummaryResponse {
    private BigDecimal totalBorrowed;
    private BigDecimal totalLent;
    private BigDecimal borrowedPending;
    private BigDecimal lentPending;
    private BigDecimal netBalance;
    private Long activeCount;
}
