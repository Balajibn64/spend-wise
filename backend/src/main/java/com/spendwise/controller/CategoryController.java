package com.spendwise.controller;

import com.spendwise.dto.response.ApiResponse;
import com.spendwise.dto.response.CategoryResponse;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.security.UserPrincipal;
import com.spendwise.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Category management")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Get all categories visible to the current user (system defaults + their own)")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories(
            @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getVisibleCategories(user.getId())));
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get categories by type (INCOME/EXPENSE), visible to the current user")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategoriesByType(
            @AuthenticationPrincipal UserPrincipal user,
            @PathVariable TransactionType type) {
        return ResponseEntity.ok(ApiResponse.success(
                categoryService.getVisibleCategoriesByType(user.getId(), type)));
    }
}
