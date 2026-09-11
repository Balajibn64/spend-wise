package com.spendwise.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class ImportResultResponse {
    private int imported;
    private int skipped;
    private List<String> categoriesCreated;
    private List<String> errors;
}
