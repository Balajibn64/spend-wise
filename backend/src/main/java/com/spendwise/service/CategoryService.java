package com.spendwise.service;

import com.spendwise.dto.response.CategoryResponse;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getCategoriesByType(TransactionType type) {
        return categoryRepository.findByType(type).stream()
                .map(CategoryResponse::from)
                .toList();
    }
}
