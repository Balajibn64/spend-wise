package com.spendwise.repository;

import com.spendwise.model.Category;
import com.spendwise.model.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByType(TransactionType type);

    List<Category> findByIsDefaultTrue();

    List<Category> findByParentCategoryId(Long parentId);

    boolean existsByNameAndType(String name, TransactionType type);
}
