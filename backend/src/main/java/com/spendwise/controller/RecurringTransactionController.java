package com.spendwise.controller;

import com.spendwise.dto.request.RecurringTransactionRequest;
import com.spendwise.dto.response.ApiResponse;
import com.spendwise.dto.response.RecurringTransactionResponse;
import com.spendwise.security.UserPrincipal;
import com.spendwise.service.RecurringTransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/recurring-transactions")
@RequiredArgsConstructor
@Tag(name = "Recurring Transactions", description = "Manage recurring transactions")
public class RecurringTransactionController {

    private final RecurringTransactionService recurringTransactionService;

    @PostMapping
    @Operation(summary = "Create a recurring transaction")
    public ResponseEntity<ApiResponse<RecurringTransactionResponse>> create(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody RecurringTransactionRequest request) {
        RecurringTransactionResponse response = recurringTransactionService.create(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Recurring transaction created", response));
    }

    @GetMapping
    @Operation(summary = "Get all recurring transactions")
    public ResponseEntity<ApiResponse<List<RecurringTransactionResponse>>> getAll(
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(recurringTransactionService.getAll(user.getId())));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a recurring transaction")
    public ResponseEntity<ApiResponse<RecurringTransactionResponse>> update(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id,
            @Valid @RequestBody RecurringTransactionRequest request) {
        RecurringTransactionResponse response = recurringTransactionService.update(user.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Recurring transaction updated", response));
    }

    @PatchMapping("/{id}/toggle")
    @Operation(summary = "Toggle active/inactive")
    public ResponseEntity<ApiResponse<Void>> toggle(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id) {
        recurringTransactionService.toggleActive(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Toggled successfully", null));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a recurring transaction")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id) {
        recurringTransactionService.delete(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Recurring transaction deleted", null));
    }
}
