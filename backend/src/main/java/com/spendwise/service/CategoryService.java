package com.spendwise.service;

import com.spendwise.dto.response.CategoryResponse;
import com.spendwise.model.Category;
import com.spendwise.model.User;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private static final String[] AUTO_CATEGORY_COLORS = {
            "#EF4444", "#8B5CF6", "#F59E0B", "#EC4899", "#10B981",
            "#3B82F6", "#F97316", "#14B8A6", "#A855F7", "#84CC16",
    };

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getVisibleCategories(UUID userId) {
        return categoryRepository.findVisibleToUser(userId).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getVisibleCategoriesByType(UUID userId, TransactionType type) {
        return categoryRepository.findVisibleToUserByType(userId, type).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    /**
     * Looks up a category visible to this user by (type, name); creates a new
     * user-owned category if none exists yet. Used by transaction import,
     * where the spreadsheet may reference categories that don't exist yet.
     */
    @Transactional
    public Category findOrCreateForUser(User user, TransactionType type, String name, int colorSeed) {
        return categoryRepository.findVisibleToUserByTypeAndName(user.getId(), type, name)
                .orElseGet(() -> categoryRepository.save(Category.builder()
                        .name(name)
                        .type(type)
                        .icon("tag")
                        .color(AUTO_CATEGORY_COLORS[colorSeed % AUTO_CATEGORY_COLORS.length])
                        .isDefault(false)
                        .user(user)
                        .build()));
    }
}
