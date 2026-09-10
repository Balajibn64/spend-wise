package com.spendwise.dto.request;

import com.spendwise.model.enums.BorrowLendType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BorrowLendRequest {

    @NotNull(message = "Type is required")
    private BorrowLendType type;

    @NotBlank(message = "Person name is required")
    @Size(max = 100, message = "Person name must not exceed 100 characters")
    private String personName;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;

    @NotNull(message = "Date is required")
    private LocalDate date;

    private LocalDate dueDate;
}
