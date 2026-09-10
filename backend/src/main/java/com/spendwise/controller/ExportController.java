package com.spendwise.controller;

import com.spendwise.security.UserPrincipal;
import com.spendwise.service.ExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@Tag(name = "Export", description = "Export transactions as CSV or PDF")
public class ExportController {

    private final ExportService exportService;

    @GetMapping("/csv")
    @Operation(summary = "Export transactions as CSV")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.of(2020, 1, 1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        byte[] data = exportService.exportCsv(user.getId(), start, end);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=transactions.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(data);
    }

    @GetMapping("/pdf")
    @Operation(summary = "Export transactions as PDF")
    public ResponseEntity<byte[]> exportPdf(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.of(2020, 1, 1);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        byte[] data = exportService.exportPdf(user.getId(), start, end);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=transactions.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data);
    }
}
