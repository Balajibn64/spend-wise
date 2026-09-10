package com.spendwise.dto.response;

import com.spendwise.model.Category;
import com.spendwise.model.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@AllArgsConstructor
public class CategoryResponse {
    private Long id;
    private String name;
    private TransactionType type;
    private String icon;
    private String color;
    private Long parentCategoryId;
    private Boolean isDefault;

    public static CategoryResponse from(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .type(category.getType())
                .icon(category.getIcon())
                .color(category.getColor())
                .parentCategoryId(category.getParentCategory() != null
                        ? category.getParentCategory().getId() : null)
                .isDefault(category.getIsDefault())
                .build();
    }
}
