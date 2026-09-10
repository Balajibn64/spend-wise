package com.spendwise.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SettleRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Settlement amount must be greater than 0")
    private BigDecimal amount;
}
