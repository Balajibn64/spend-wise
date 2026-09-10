package com.spendwise.repository;

import com.spendwise.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    List<Budget> findByUserIdAndMonthAndYear(UUID userId, Integer month, Integer year);

    Optional<Budget> findByUserIdAndCategoryIdAndMonthAndYear(
            UUID userId, Long categoryId, Integer month, Integer year);

    List<Budget> findByUserId(UUID userId);
}
