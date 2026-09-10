package com.spendwise.controller;

import com.spendwise.dto.response.ApiResponse;
import com.spendwise.dto.response.CategoryResponse;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Category management")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    @Operation(summary = "Get all categories")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAllCategories() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAllCategories()));
    }

    @GetMapping("/type/{type}")
    @Operation(summary = "Get categories by type (INCOME/EXPENSE)")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getCategoriesByType(
            @PathVariable TransactionType type) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getCategoriesByType(type)));
    }
}
