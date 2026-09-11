package com.spendwise.repository;

import com.spendwise.model.Category;
import com.spendwise.model.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByIsDefaultTrue();

    List<Category> findByParentCategoryId(Long parentId);

    /** System defaults (user IS NULL) plus this user's own categories. */
    @Query("SELECT c FROM Category c WHERE c.user IS NULL OR c.user.id = :userId")
    List<Category> findVisibleToUser(@Param("userId") UUID userId);

    @Query("SELECT c FROM Category c WHERE (c.user IS NULL OR c.user.id = :userId) AND c.type = :type")
    List<Category> findVisibleToUserByType(@Param("userId") UUID userId, @Param("type") TransactionType type);

    @Query("SELECT c FROM Category c WHERE (c.user IS NULL OR c.user.id = :userId) "
            + "AND c.type = :type AND LOWER(c.name) = LOWER(:name)")
    Optional<Category> findVisibleToUserByTypeAndName(
            @Param("userId") UUID userId, @Param("type") TransactionType type, @Param("name") String name);

    /** Ownership check used before letting a transaction/budget/recurring row reference this category. */
    @Query("SELECT c FROM Category c WHERE c.id = :id AND (c.user IS NULL OR c.user.id = :userId)")
    Optional<Category> findByIdVisibleToUser(@Param("id") Long id, @Param("userId") UUID userId);
}
