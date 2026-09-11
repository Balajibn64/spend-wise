package com.spendwise.service;

import com.spendwise.dto.request.BorrowLendRequest;
import com.spendwise.dto.response.BorrowLendResponse;
import com.spendwise.dto.response.BorrowLendSummaryResponse;
import com.spendwise.exception.BadRequestException;
import com.spendwise.exception.ResourceNotFoundException;
import com.spendwise.model.BorrowLend;
import com.spendwise.model.User;
import com.spendwise.model.enums.BorrowLendStatus;
import com.spendwise.model.enums.BorrowLendType;
import com.spendwise.repository.BorrowLendRepository;
import com.spendwise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BorrowLendService {

    private final BorrowLendRepository borrowLendRepository;
    private final UserRepository userRepository;

    @Transactional
    public BorrowLendResponse create(UUID userId, BorrowLendRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        BorrowLend borrowLend = BorrowLend.builder()
                .user(user)
                .type(request.getType())
                .personName(request.getPersonName())
                .amount(request.getAmount())
                .description(request.getDescription())
                .date(request.getDate())
                .dueDate(request.getDueDate())
                .build();

        borrowLend = borrowLendRepository.save(borrowLend);
        return BorrowLendResponse.from(borrowLend);
    }

    @Transactional(readOnly = true)
    public Page<BorrowLendResponse> getAll(UUID userId, BorrowLendType type,
                                            BorrowLendStatus status, Pageable pageable) {
        return borrowLendRepository.findByFilters(userId, type, status, pageable)
                .map(BorrowLendResponse::from);
    }

    @Transactional(readOnly = true)
    public BorrowLendResponse getById(UUID userId, UUID id) {
        BorrowLend borrowLend = findAndValidateOwnership(userId, id);
        return BorrowLendResponse.from(borrowLend);
    }

    @Transactional
    public BorrowLendResponse update(UUID userId, UUID id, BorrowLendRequest request) {
        BorrowLend borrowLend = findAndValidateOwnership(userId, id);

        borrowLend.setType(request.getType());
        borrowLend.setPersonName(request.getPersonName());
        borrowLend.setAmount(request.getAmount());
        borrowLend.setDescription(request.getDescription());
        borrowLend.setDate(request.getDate());
        borrowLend.setDueDate(request.getDueDate());

        // Recalculate status based on new amount
        recalculateStatus(borrowLend);

        borrowLend = borrowLendRepository.save(borrowLend);
        return BorrowLendResponse.from(borrowLend);
    }

    @Transactional
    public BorrowLendResponse settle(UUID userId, UUID id, BigDecimal settleAmount) {
        BorrowLend borrowLend = findAndValidateOwnership(userId, id);

        if (borrowLend.getStatus() == BorrowLendStatus.SETTLED) {
            throw new BadRequestException("This entry is already fully settled");
        }

        BigDecimal remaining = borrowLend.getAmount().subtract(borrowLend.getSettledAmount());
        if (settleAmount.compareTo(remaining) > 0) {
            throw new BadRequestException(
                    "Settlement amount (" + settleAmount + ") exceeds remaining amount (" + remaining + ")");
        }

        borrowLend.setSettledAmount(borrowLend.getSettledAmount().add(settleAmount));
        recalculateStatus(borrowLend);

        borrowLend = borrowLendRepository.save(borrowLend);
        return BorrowLendResponse.from(borrowLend);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        BorrowLend borrowLend = findAndValidateOwnership(userId, id);
        borrowLendRepository.delete(borrowLend);
    }

    @Transactional(readOnly = true)
    public BorrowLendSummaryResponse getSummary(UUID userId) {
        BigDecimal totalBorrowed = borrowLendRepository.sumTotalByType(userId, BorrowLendType.BORROWED);
        BigDecimal totalLent = borrowLendRepository.sumTotalByType(userId, BorrowLendType.LENT);
        BigDecimal borrowedPending = borrowLendRepository.sumPendingByType(userId, BorrowLendType.BORROWED);
        BigDecimal lentPending = borrowLendRepository.sumPendingByType(userId, BorrowLendType.LENT);
        Long activeCount = borrowLendRepository.countActive(userId);

        return BorrowLendSummaryResponse.builder()
                .totalBorrowed(totalBorrowed)
                .totalLent(totalLent)
                .borrowedPending(borrowedPending)
                .lentPending(lentPending)
                .netBalance(lentPending.subtract(borrowedPending))
                .activeCount(activeCount)
                .build();
    }

    private BorrowLend findAndValidateOwnership(UUID userId, UUID id) {
        return borrowLendRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("BorrowLend", "id", id));
    }

    private void recalculateStatus(BorrowLend borrowLend) {
        if (borrowLend.getSettledAmount().compareTo(borrowLend.getAmount()) >= 0) {
            borrowLend.setStatus(BorrowLendStatus.SETTLED);
        } else if (borrowLend.getSettledAmount().compareTo(BigDecimal.ZERO) > 0) {
            borrowLend.setStatus(BorrowLendStatus.PARTIALLY_SETTLED);
        } else {
            borrowLend.setStatus(BorrowLendStatus.PENDING);
        }
    }
}
