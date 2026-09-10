package com.spendwise.controller;

import com.spendwise.dto.request.BorrowLendRequest;
import com.spendwise.dto.request.SettleRequest;
import com.spendwise.dto.response.ApiResponse;
import com.spendwise.dto.response.BorrowLendResponse;
import com.spendwise.dto.response.BorrowLendSummaryResponse;
import com.spendwise.model.enums.BorrowLendStatus;
import com.spendwise.model.enums.BorrowLendType;
import com.spendwise.security.UserPrincipal;
import com.spendwise.service.BorrowLendService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/borrow-lend")
@RequiredArgsConstructor
@Tag(name = "Borrow/Lend", description = "Track borrowed and lent money")
public class BorrowLendController {

    private final BorrowLendService borrowLendService;

    @PostMapping
    @Operation(summary = "Create a new borrow/lend entry")
    public ResponseEntity<ApiResponse<BorrowLendResponse>> create(
            @AuthenticationPrincipal UserPrincipal user,
            @Valid @RequestBody BorrowLendRequest request) {
        BorrowLendResponse response = borrowLendService.create(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Entry created", response));
    }

    @GetMapping
    @Operation(summary = "Get all borrow/lend entries with filters and pagination")
    public ResponseEntity<ApiResponse<Page<BorrowLendResponse>>> getAll(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestParam(required = false) BorrowLendType type,
            @RequestParam(required = false) BorrowLendStatus status,
            @PageableDefault(size = 20, sort = "date", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<BorrowLendResponse> page = borrowLendService.getAll(
                user.getId(), type, status, pageable);
        return ResponseEntity.ok(ApiResponse.success(page));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get borrow/lend summary totals")
    public ResponseEntity<ApiResponse<BorrowLendSummaryResponse>> getSummary(
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(borrowLendService.getSummary(user.getId())));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a borrow/lend entry by ID")
    public ResponseEntity<ApiResponse<BorrowLendResponse>> getById(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(borrowLendService.getById(user.getId(), id)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a borrow/lend entry")
    public ResponseEntity<ApiResponse<BorrowLendResponse>> update(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id,
            @Valid @RequestBody BorrowLendRequest request) {
        BorrowLendResponse response = borrowLendService.update(user.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Entry updated", response));
    }

    @PatchMapping("/{id}/settle")
    @Operation(summary = "Record a settlement (partial or full)")
    public ResponseEntity<ApiResponse<BorrowLendResponse>> settle(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id,
            @Valid @RequestBody SettleRequest request) {
        BorrowLendResponse response = borrowLendService.settle(user.getId(), id, request.getAmount());
        return ResponseEntity.ok(ApiResponse.success("Settlement recorded", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a borrow/lend entry")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable UUID id) {
        borrowLendService.delete(user.getId(), id);
        return ResponseEntity.ok(ApiResponse.success("Entry deleted", null));
    }
}
