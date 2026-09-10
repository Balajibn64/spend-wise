package com.spendwise.service;

import com.spendwise.dto.request.BudgetRequest;
import com.spendwise.dto.response.BudgetResponse;
import com.spendwise.exception.DuplicateResourceException;
import com.spendwise.exception.ResourceNotFoundException;
import com.spendwise.model.Budget;
import com.spendwise.model.Category;
import com.spendwise.model.User;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.BudgetRepository;
import com.spendwise.repository.CategoryRepository;
import com.spendwise.repository.TransactionRepository;
import com.spendwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;

    @Transactional
    public BudgetResponse createBudget(UUID userId, BudgetRequest request) {
        if (budgetRepository.findByUserIdAndCategoryIdAndMonthAndYear(
                userId, request.getCategoryId(), request.getMonth(), request.getYear()).isPresent()) {
            throw new DuplicateResourceException("Budget already exists for this category and month");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        Budget budget = Budget.builder()
                .user(user)
                .category(category)
                .monthlyLimit(request.getMonthlyLimit())
                .month(request.getMonth())
                .year(request.getYear())
                .build();

        budget = budgetRepository.save(budget);
        BigDecimal spent = getSpentAmount(userId, category.getId(), request.getMonth(), request.getYear());
        return BudgetResponse.from(budget, spent);
    }

    @Transactional(readOnly = true)
    public List<BudgetResponse> getBudgets(UUID userId, Integer month, Integer year) {
        List<Budget> budgets = budgetRepository.findByUserIdAndMonthAndYear(userId, month, year);
        return budgets.stream()
                .map(budget -> {
                    BigDecimal spent = getSpentAmount(userId, budget.getCategory().getId(), month, year);
                    return BudgetResponse.from(budget, spent);
                })
                .toList();
    }

    @Transactional
    public BudgetResponse updateBudget(UUID userId, UUID budgetId, BudgetRequest request) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget", "id", budgetId));

        if (!budget.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Budget", "id", budgetId);
        }

        // Check for duplicate if category/month/year changed
        Optional<Budget> existing = budgetRepository.findByUserIdAndCategoryIdAndMonthAndYear(
                userId, request.getCategoryId(), request.getMonth(), request.getYear());
        if (existing.isPresent() && !existing.get().getId().equals(budgetId)) {
            throw new DuplicateResourceException("Budget already exists for this category and month");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        budget.setCategory(category);
        budget.setMonthlyLimit(request.getMonthlyLimit());
        budget.setMonth(request.getMonth());
        budget.setYear(request.getYear());

        budget = budgetRepository.save(budget);
        BigDecimal spent = getSpentAmount(userId, category.getId(), request.getMonth(), request.getYear());
        return BudgetResponse.from(budget, spent);
    }

    @Transactional
    public void deleteBudget(UUID userId, UUID budgetId) {
        Budget budget = budgetRepository.findById(budgetId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget", "id", budgetId));

        if (!budget.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Budget", "id", budgetId);
        }
        budgetRepository.delete(budget);
    }

    private BigDecimal getSpentAmount(UUID userId, Long categoryId, Integer month, Integer year) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        return transactionRepository.sumByUserAndCategoryAndDateRange(
                userId, categoryId, TransactionType.EXPENSE, start, end);
    }
}
