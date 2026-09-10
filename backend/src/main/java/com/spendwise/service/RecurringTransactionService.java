package com.spendwise.service;

import com.spendwise.dto.request.RecurringTransactionRequest;
import com.spendwise.dto.response.RecurringTransactionResponse;
import com.spendwise.exception.BadRequestException;
import com.spendwise.exception.ResourceNotFoundException;
import com.spendwise.model.Category;
import com.spendwise.model.RecurringTransaction;
import com.spendwise.model.User;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.CategoryRepository;
import com.spendwise.repository.RecurringTransactionRepository;
import com.spendwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RecurringTransactionService {

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public RecurringTransactionResponse create(UUID userId, RecurringTransactionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        validateCategoryType(category, request.getType());

        RecurringTransaction rt = RecurringTransaction.builder()
                .user(user)
                .category(category)
                .amount(request.getAmount())
                .type(request.getType())
                .paymentMethod(request.getPaymentMethod())
                .description(request.getDescription())
                .frequency(request.getFrequency())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isActive(true)
                .build();

        rt = recurringTransactionRepository.save(rt);
        return RecurringTransactionResponse.from(rt);
    }

    @Transactional(readOnly = true)
    public List<RecurringTransactionResponse> getAll(UUID userId) {
        return recurringTransactionRepository.findByUserId(userId).stream()
                .map(RecurringTransactionResponse::from)
                .toList();
    }

    @Transactional
    public RecurringTransactionResponse update(UUID userId, UUID id, RecurringTransactionRequest request) {
        RecurringTransaction rt = recurringTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringTransaction", "id", id));

        if (!rt.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("RecurringTransaction", "id", id);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        validateCategoryType(category, request.getType());

        rt.setCategory(category);
        rt.setAmount(request.getAmount());
        rt.setType(request.getType());
        rt.setPaymentMethod(request.getPaymentMethod());
        rt.setDescription(request.getDescription());
        rt.setFrequency(request.getFrequency());
        rt.setStartDate(request.getStartDate());
        rt.setEndDate(request.getEndDate());

        rt = recurringTransactionRepository.save(rt);
        return RecurringTransactionResponse.from(rt);
    }

    @Transactional
    public void toggleActive(UUID userId, UUID id) {
        RecurringTransaction rt = recurringTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringTransaction", "id", id));

        if (!rt.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("RecurringTransaction", "id", id);
        }

        rt.setIsActive(!rt.getIsActive());
        recurringTransactionRepository.save(rt);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        RecurringTransaction rt = recurringTransactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RecurringTransaction", "id", id));

        if (!rt.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("RecurringTransaction", "id", id);
        }

        recurringTransactionRepository.delete(rt);
    }

    private void validateCategoryType(Category category, TransactionType requestType) {
        if (category.getType() != requestType) {
            throw new BadRequestException(
                    "Category '" + category.getName() + "' is of type " + category.getType()
                            + " but transaction type is " + requestType);
        }
    }
}
