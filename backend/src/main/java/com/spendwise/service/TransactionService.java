package com.spendwise.service;

import com.spendwise.dto.request.TransactionRequest;
import com.spendwise.dto.response.TransactionResponse;
import com.spendwise.exception.BadRequestException;
import com.spendwise.exception.ResourceNotFoundException;
import com.spendwise.model.Category;
import com.spendwise.model.Transaction;
import com.spendwise.model.User;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.CategoryRepository;
import com.spendwise.repository.TransactionRepository;
import com.spendwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    @Transactional
    public TransactionResponse createTransaction(UUID userId, TransactionRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        validateCategoryType(category, request.getType());

        Transaction transaction = Transaction.builder()
                .user(user)
                .category(category)
                .amount(request.getAmount())
                .type(request.getType())
                .paymentMethod(request.getPaymentMethod())
                .description(request.getDescription())
                .transactionDate(request.getTransactionDate())
                .build();

        transaction = transactionRepository.save(transaction);
        return TransactionResponse.from(transaction);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResponse> getTransactions(UUID userId, TransactionType type,
                                                      Long categoryId, LocalDate startDate,
                                                      LocalDate endDate, Pageable pageable) {
        return transactionRepository.findByFilters(userId, type, categoryId, startDate, endDate, pageable)
                .map(TransactionResponse::from);
    }

    @Transactional(readOnly = true)
    public TransactionResponse getTransaction(UUID userId, UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", "id", transactionId));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Transaction", "id", transactionId);
        }
        return TransactionResponse.from(transaction);
    }

    @Transactional
    public TransactionResponse updateTransaction(UUID userId, UUID transactionId, TransactionRequest request) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", "id", transactionId));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Transaction", "id", transactionId);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        validateCategoryType(category, request.getType());

        transaction.setCategory(category);
        transaction.setAmount(request.getAmount());
        transaction.setType(request.getType());
        transaction.setPaymentMethod(request.getPaymentMethod());
        transaction.setDescription(request.getDescription());
        transaction.setTransactionDate(request.getTransactionDate());

        transaction = transactionRepository.save(transaction);
        return TransactionResponse.from(transaction);
    }

    @Transactional
    public void deleteTransaction(UUID userId, UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", "id", transactionId));

        if (!transaction.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Transaction", "id", transactionId);
        }

        transactionRepository.delete(transaction);
    }

    @Transactional(readOnly = true)
    public List<Transaction> getTransactionsForExport(UUID userId, LocalDate startDate, LocalDate endDate) {
        return transactionRepository.findByUserIdAndDateRange(userId, startDate, endDate);
    }

    private void validateCategoryType(Category category, TransactionType requestType) {
        if (category.getType() != requestType) {
            throw new BadRequestException(
                    "Category '" + category.getName() + "' is of type " + category.getType()
                            + " but transaction type is " + requestType);
        }
    }
}
