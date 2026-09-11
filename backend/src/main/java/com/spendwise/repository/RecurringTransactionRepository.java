package com.spendwise.repository;

import com.spendwise.model.RecurringTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecurringTransactionRepository extends JpaRepository<RecurringTransaction, UUID> {

    Optional<RecurringTransaction> findByIdAndUserId(UUID id, UUID userId);

    List<RecurringTransaction> findByUserId(UUID userId);

    @Query("SELECT r FROM RecurringTransaction r JOIN FETCH r.user JOIN FETCH r.category WHERE r.isActive = true")
    List<RecurringTransaction> findByIsActiveTrueFetchOwner();
}
