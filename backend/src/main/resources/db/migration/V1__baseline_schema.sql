-- Baseline schema for SpendWise, replacing Hibernate's ddl-auto: update.
-- Written to match the JPA entity mappings exactly, so `ddl-auto: validate`
-- passes at startup.

CREATE TABLE users (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE categories (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    type                VARCHAR(20) NOT NULL,
    icon                VARCHAR(255),
    color               VARCHAR(255),
    parent_category_id  BIGINT REFERENCES categories (id),
    is_default          BOOLEAN NOT NULL DEFAULT false,
    -- NULL = system default category, visible to everyone; non-NULL = owned
    -- by that user (e.g. created via import). See CategoryRepository.
    user_id             UUID REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id                UUID PRIMARY KEY,
    user_id           UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id       BIGINT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type              VARCHAR(20) NOT NULL,
    payment_method    VARCHAR(20) NOT NULL,
    description       VARCHAR(255),
    transaction_date  DATE NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE budgets (
    id             UUID PRIMARY KEY,
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id    BIGINT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    monthly_limit  NUMERIC(12, 2) NOT NULL CHECK (monthly_limit > 0),
    month          INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year           INTEGER NOT NULL CHECK (year >= 2020),
    UNIQUE (user_id, category_id, month, year)
);

CREATE TABLE recurring_transactions (
    id                    UUID PRIMARY KEY,
    user_id               UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id           BIGINT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    amount                NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    type                  VARCHAR(20) NOT NULL,
    payment_method        VARCHAR(20) NOT NULL,
    description           VARCHAR(255),
    frequency             VARCHAR(20) NOT NULL,
    start_date            DATE NOT NULL,
    end_date              DATE,
    is_active             BOOLEAN NOT NULL DEFAULT true,
    last_processed_date   DATE,
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE borrow_lends (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL,
    person_name     VARCHAR(255) NOT NULL,
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    settled_amount  NUMERIC(12, 2) NOT NULL DEFAULT 0
                        CHECK (settled_amount >= 0 AND settled_amount <= amount),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    description     VARCHAR(255),
    date            DATE NOT NULL,
    due_date        DATE,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at  TIMESTAMP NOT NULL,
    revoked_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
