package com.spendwise.dto.response;

import com.spendwise.model.BorrowLend;
import com.spendwise.model.enums.BorrowLendStatus;
import com.spendwise.model.enums.BorrowLendType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class BorrowLendResponse {
    private UUID id;
    private BorrowLendType type;
    private String personName;
    private BigDecimal amount;
    private BigDecimal settledAmount;
    private BigDecimal remainingAmount;
    private BorrowLendStatus status;
    private String description;
    private LocalDate date;
    private LocalDate dueDate;
    private LocalDateTime createdAt;

    public static BorrowLendResponse from(BorrowLend bl) {
        return BorrowLendResponse.builder()
                .id(bl.getId())
                .type(bl.getType())
                .personName(bl.getPersonName())
                .amount(bl.getAmount())
                .settledAmount(bl.getSettledAmount())
                .remainingAmount(bl.getAmount().subtract(bl.getSettledAmount()))
                .status(bl.getStatus())
                .description(bl.getDescription())
                .date(bl.getDate())
                .dueDate(bl.getDueDate())
                .createdAt(bl.getCreatedAt())
                .build();
    }
}
