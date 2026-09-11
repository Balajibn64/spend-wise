package com.spendwise.repository;

import com.spendwise.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BudgetRepository extends JpaRepository<Budget, UUID> {

    Optional<Budget> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT b FROM Budget b JOIN FETCH b.category "
            + "WHERE b.user.id = :userId AND b.month = :month AND b.year = :year")
    List<Budget> findByUserIdAndMonthAndYear(
            @Param("userId") UUID userId, @Param("month") Integer month, @Param("year") Integer year);

    Optional<Budget> findByUserIdAndCategoryIdAndMonthAndYear(
            UUID userId, Long categoryId, Integer month, Integer year);

    List<Budget> findByUserId(UUID userId);
}
