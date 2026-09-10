package com.spendwise.config;

import com.spendwise.model.Category;
import com.spendwise.model.enums.TransactionType;
import com.spendwise.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final CategoryRepository categoryRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (categoryRepository.count() > 0) {
            log.info("Categories already seeded, skipping...");
            return;
        }

        log.info("Seeding default categories...");

        // Parent categories
        Category essentials = saveParent("Essentials", TransactionType.EXPENSE, "essential", "#EF4444");
        Category lifestyle = saveParent("Lifestyle", TransactionType.EXPENSE, "lifestyle", "#8B5CF6");
        Category financial = saveParent("Financial", TransactionType.EXPENSE, "financial", "#F59E0B");
        Category personal = saveParent("Personal", TransactionType.EXPENSE, "personal", "#EC4899");
        Category income = saveParent("Income", TransactionType.INCOME, "income", "#10B981");

        // Essentials
        saveChildren(essentials, TransactionType.EXPENSE, List.of(
                new String[]{"Food", "utensils", "#F87171"},
                new String[]{"Groceries", "shopping-cart", "#FB923C"},
                new String[]{"Rent", "home", "#FBBF24"},
                new String[]{"Bills", "file-text", "#A3E635"},
                new String[]{"Transport", "car", "#34D399"},
                new String[]{"Health", "heart-pulse", "#F472B6"}
        ));

        // Lifestyle
        saveChildren(lifestyle, TransactionType.EXPENSE, List.of(
                new String[]{"Shopping", "shopping-bag", "#C084FC"},
                new String[]{"Entertainment", "gamepad-2", "#818CF8"},
                new String[]{"Dining Out", "coffee", "#FB7185"},
                new String[]{"Subscriptions", "repeat", "#38BDF8"},
                new String[]{"Travel", "plane", "#2DD4BF"}
        ));

        // Financial
        saveChildren(financial, TransactionType.EXPENSE, List.of(
                new String[]{"EMI", "landmark", "#FCD34D"},
                new String[]{"Insurance", "shield", "#FCA5A1"},
                new String[]{"Investments", "trending-up", "#86EFAC"},
                new String[]{"Savings", "piggy-bank", "#93C5FD"},
                new String[]{"Tax", "receipt", "#FDE047"}
        ));

        // Personal
        saveChildren(personal, TransactionType.EXPENSE, List.of(
                new String[]{"Education", "graduation-cap", "#F9A8D4"},
                new String[]{"Gifts", "gift", "#FDA4AF"},
                new String[]{"Donations", "hand-heart", "#D8B4FE"},
                new String[]{"Personal Care", "sparkles", "#FBCFE8"}
        ));

        // Income
        saveChildren(income, TransactionType.INCOME, List.of(
                new String[]{"Salary", "banknote", "#34D399"},
                new String[]{"Freelance", "laptop", "#6EE7B7"},
                new String[]{"Interest", "percent", "#A7F3D0"},
                new String[]{"Refund", "undo", "#BBF7D0"},
                new String[]{"Other", "plus-circle", "#D1FAE5"}
        ));

        log.info("Default categories seeded successfully!");
    }

    private Category saveParent(String name, TransactionType type, String icon, String color) {
        return categoryRepository.save(Category.builder()
                .name(name)
                .type(type)
                .icon(icon)
                .color(color)
                .isDefault(true)
                .build());
    }

    private void saveChildren(Category parent, TransactionType type, List<String[]> children) {
        for (String[] child : children) {
            categoryRepository.save(Category.builder()
                    .name(child[0])
                    .type(type)
                    .icon(child[1])
                    .color(child[2])
                    .parentCategory(parent)
                    .isDefault(true)
                    .build());
        }
    }
}
