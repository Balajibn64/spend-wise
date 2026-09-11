-- Every hot-path query filters by user_id plus a date range or status; none
-- of it was indexed under ddl-auto: update.

CREATE INDEX idx_txn_user_date ON transactions (user_id, transaction_date DESC);
CREATE INDEX idx_txn_user_type_date ON transactions (user_id, type, transaction_date);
CREATE INDEX idx_txn_user_cat_date ON transactions (user_id, category_id, transaction_date);

CREATE INDEX idx_budgets_user_month_year ON budgets (user_id, month, year);

CREATE INDEX idx_recurring_active ON recurring_transactions (is_active) WHERE is_active;

CREATE INDEX idx_borrow_lend_user_status ON borrow_lends (user_id, status);

CREATE INDEX idx_categories_user ON categories (user_id);

-- Category names must be unique per owner (system defaults are one
-- namespace, each user's own categories are another), case-insensitively,
-- within a transaction type.
CREATE UNIQUE INDEX uq_categories_system_name_type
    ON categories (LOWER(name), type) WHERE user_id IS NULL;
CREATE UNIQUE INDEX uq_categories_user_name_type
    ON categories (user_id, LOWER(name), type) WHERE user_id IS NOT NULL;

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
