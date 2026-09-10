package com.spendwise.dto.response;

import com.spendwise.model.Transaction;
import com.spendwise.model.enums.PaymentMethod;
import com.spendwise.model.enums.TransactionType;
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
public class TransactionResponse {
    private UUID id;
    private BigDecimal amount;
    private TransactionType type;
    private PaymentMethod paymentMethod;
    private String description;
    private LocalDate transactionDate;
    private String categoryName;
    private Long categoryId;
    private LocalDateTime createdAt;

    public static TransactionResponse from(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .amount(t.getAmount())
                .type(t.getType())
                .paymentMethod(t.getPaymentMethod())
                .description(t.getDescription())
                .transactionDate(t.getTransactionDate())
                .categoryName(t.getCategory().getName())
                .categoryId(t.getCategory().getId())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
