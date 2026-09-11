package com.spendwise.service;

import com.spendwise.model.RecurringTransaction;
import com.spendwise.model.Transaction;
import com.spendwise.repository.RecurringTransactionRepository;
import com.spendwise.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Generates due transactions for a single recurring rule. Split out from the
 * scheduler into its own Spring bean so {@code @Transactional} is applied
 * through the proxy — calling this method on {@code this} from within the
 * scheduler bean would bypass the proxy entirely and silently run with no
 * transaction, leaving the fetched entities detached.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RecurringTransactionProcessor {

    /**
     * Upper bound on how many transactions a single run will backfill for one
     * rule, so a long-dormant DAILY rule can't generate thousands of rows in
     * one pass. Any remaining catch-up continues on the next scheduled run.
     */
    private static final int MAX_CATCH_UP_PER_RUN = 90;

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final TransactionRepository transactionRepository;

    @Transactional
    public void process(RecurringTransaction rt, LocalDate today) {
        // Deactivate if end date has passed
        if (rt.getEndDate() != null && today.isAfter(rt.getEndDate())) {
            rt.setIsActive(false);
            recurringTransactionRepository.save(rt);
            return;
        }

        // Skip if start date hasn't arrived yet
        if (today.isBefore(rt.getStartDate())) {
            return;
        }

        LocalDate nextDueDate = calculateNextDueDate(rt);
        int created = 0;
        while (nextDueDate != null && !today.isBefore(nextDueDate) && created < MAX_CATCH_UP_PER_RUN) {
            // Stop if past end date
            if (rt.getEndDate() != null && nextDueDate.isAfter(rt.getEndDate())) {
                rt.setIsActive(false);
                break;
            }

            Transaction transaction = Transaction.builder()
                    .user(rt.getUser())
                    .category(rt.getCategory())
                    .amount(rt.getAmount())
                    .type(rt.getType())
                    .paymentMethod(rt.getPaymentMethod())
                    .description("[Auto] " + (rt.getDescription() != null ? rt.getDescription() : "Recurring transaction"))
                    .transactionDate(nextDueDate)
                    .build();

            transactionRepository.save(transaction);
            rt.setLastProcessedDate(nextDueDate);
            created++;
            log.info("Created transaction for recurring ID: {} on {}", rt.getId(), nextDueDate);

            nextDueDate = calculateNextDueDate(rt);
        }

        recurringTransactionRepository.save(rt);
    }

    private LocalDate calculateNextDueDate(RecurringTransaction rt) {
        LocalDate lastProcessed = rt.getLastProcessedDate();

        if (lastProcessed == null) {
            return rt.getStartDate();
        }

        return switch (rt.getFrequency()) {
            case DAILY -> lastProcessed.plusDays(1);
            case WEEKLY -> lastProcessed.plusWeeks(1);
            case MONTHLY -> lastProcessed.plusMonths(1);
            case YEARLY -> lastProcessed.plusYears(1);
        };
    }
}
