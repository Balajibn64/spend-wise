package com.spendwise.scheduler;

import com.spendwise.model.RecurringTransaction;
import com.spendwise.model.Transaction;
import com.spendwise.repository.RecurringTransactionRepository;
import com.spendwise.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecurringTransactionScheduler {

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final TransactionRepository transactionRepository;

    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Kolkata")
    public void processRecurringTransactions() {
        log.info("Processing recurring transactions...");
        LocalDate today = LocalDate.now();

        List<RecurringTransaction> activeRecurring = recurringTransactionRepository.findByIsActiveTrue();

        for (RecurringTransaction rt : activeRecurring) {
            try {
                processOneRecurring(rt, today);
            } catch (Exception e) {
                log.error("Failed to process recurring transaction ID {}: {}", rt.getId(), e.getMessage());
            }
        }

        log.info("Recurring transactions processing completed.");
    }

    @Transactional
    protected void processOneRecurring(RecurringTransaction rt, LocalDate today) {
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

        // Create all missed transactions (catches up if scheduler was down)
        LocalDate nextDueDate = calculateNextDueDate(rt);
        while (nextDueDate != null && !today.isBefore(nextDueDate)) {
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
