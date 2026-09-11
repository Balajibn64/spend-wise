package com.spendwise.controller;

import com.spendwise.dto.request.BudgetRequest;
import com.spendwise.dto.response.ApiResponse;
import com.spendwise.dto.response.BudgetResponse;
import com.spendwise.security.UserPrincipal;
import com.spendwise.service.BudgetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
@Validated
@Tag(name = "Budgets", description = "Monthly budget management with alerts")
public class BudgetController {

    private final BudgetService budgetService;

    @PostMapping
    @Operation(summary = "Create a budget for a category")
    public ResponseEntity<ApiResponse<BudgetResponse>> create(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody BudgetRequest request) {
        BudgetResponse response = budgetService.createBudget(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Budget created", response));
    }

    @GetMapping
    @Operation(summary = "Get budgets for a month/year")
    public ResponseEntity<ApiResponse<List<BudgetResponse>>> getBudgets(
            @AuthenticationPrincipal UserPrincipal user,
            @NotNull @Min(1) @Max(12) @RequestParam Integer month,
            @NotNull @Min(2000) @Max(2100) @RequestParam Integer year) {
        return ResponseEntity.ok(ApiResponse.success(budgetService.getBudgets(user.getId(), month, year)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a budget")
    public ResponseEntity<ApiResponse<BudgetResponse>> update(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id,
            @Valid @RequestBody BudgetRequest request) {
        BudgetResponse response = budgetService.updateBudget(user.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Budget updated", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a budget")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id) {
        budgetService.deleteBudget(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Budget deleted", null));
    }
}
