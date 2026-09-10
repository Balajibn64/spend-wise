package com.spendwise.dto.response;

import com.spendwise.model.RecurringTransaction;
import com.spendwise.model.enums.Frequency;
import com.spendwise.model.enums.PaymentMethod;
import com.spendwise.model.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
public class RecurringTransactionResponse {
    private UUID id;
    private Long categoryId;
    private String categoryName;
    private BigDecimal amount;
    private TransactionType type;
    private PaymentMethod paymentMethod;
    private String description;
    private Frequency frequency;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;
    private LocalDate lastProcessedDate;

    public static RecurringTransactionResponse from(RecurringTransaction rt) {
        return RecurringTransactionResponse.builder()
                .id(rt.getId())
                .categoryId(rt.getCategory().getId())
                .categoryName(rt.getCategory().getName())
                .amount(rt.getAmount())
                .type(rt.getType())
                .paymentMethod(rt.getPaymentMethod())
                .description(rt.getDescription())
                .frequency(rt.getFrequency())
                .startDate(rt.getStartDate())
                .endDate(rt.getEndDate())
                .isActive(rt.getIsActive())
                .lastProcessedDate(rt.getLastProcessedDate())
                .build();
    }
}
