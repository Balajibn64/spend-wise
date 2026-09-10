package com.spendwise.controller;

import com.spendwise.dto.response.ApiResponse;
import com.spendwise.dto.response.DashboardResponse;
import com.spendwise.security.UserPrincipal;
import com.spendwise.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Dashboard analytics APIs")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Get monthly dashboard summary with charts data")
    public ResponseEntity<ApiResponse<DashboardResponse>> getDashboard(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestParam Integer month,
            @RequestParam Integer year) {
        DashboardResponse response = dashboardService.getMonthlySummary(user.getId(), month, year);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
