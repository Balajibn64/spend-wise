package com.spendwise.scheduler;

import com.spendwise.model.RecurringTransaction;
import com.spendwise.repository.RecurringTransactionRepository;
import com.spendwise.service.RecurringTransactionProcessor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecurringTransactionScheduler {

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final RecurringTransactionProcessor processor;

    @Scheduled(cron = "0 0 1 * * *", zone = "Asia/Kolkata")
    public void processRecurringTransactions() {
        log.info("Processing recurring transactions...");
        LocalDate today = LocalDate.now();

        List<RecurringTransaction> activeRecurring = recurringTransactionRepository.findByIsActiveTrueFetchOwner();

        int failures = 0;
        for (RecurringTransaction rt : activeRecurring) {
            try {
                processor.process(rt, today);
            } catch (Exception e) {
                failures++;
                log.error("Failed to process recurring transaction ID {}: {}", rt.getId(), e.getMessage(), e);
            }
        }

        log.info("Recurring transactions processing completed: {} rules, {} failures",
                activeRecurring.size(), failures);
    }
}
