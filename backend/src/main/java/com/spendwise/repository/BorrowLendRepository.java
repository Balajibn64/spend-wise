package com.spendwise.repository;

import com.spendwise.model.BorrowLend;
import com.spendwise.model.enums.BorrowLendStatus;
import com.spendwise.model.enums.BorrowLendType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

public interface BorrowLendRepository extends JpaRepository<BorrowLend, UUID> {

    Optional<BorrowLend> findByIdAndUserId(UUID id, UUID userId);

    @Query("SELECT bl FROM BorrowLend bl WHERE bl.user.id = :userId " +
            "AND (:type IS NULL OR bl.type = :type) " +
            "AND (:status IS NULL OR bl.status = :status) " +
            "ORDER BY bl.date DESC")
    Page<BorrowLend> findByFilters(
            @Param("userId") UUID userId,
            @Param("type") BorrowLendType type,
            @Param("status") BorrowLendStatus status,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(bl.amount), 0) FROM BorrowLend bl " +
            "WHERE bl.user.id = :userId AND bl.type = :type")
    BigDecimal sumTotalByType(
            @Param("userId") UUID userId,
            @Param("type") BorrowLendType type);

    @Query("SELECT COALESCE(SUM(bl.amount - bl.settledAmount), 0) FROM BorrowLend bl " +
            "WHERE bl.user.id = :userId AND bl.type = :type AND bl.status != 'SETTLED'")
    BigDecimal sumPendingByType(
            @Param("userId") UUID userId,
            @Param("type") BorrowLendType type);

    @Query("SELECT COUNT(bl) FROM BorrowLend bl " +
            "WHERE bl.user.id = :userId AND bl.status != 'SETTLED'")
    Long countActive(@Param("userId") UUID userId);
}
