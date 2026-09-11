-- System default categories (user_id NULL), replacing the CommandLineRunner
-- that used to seed these on first boot. Moving it into a migration means it
-- runs exactly once, in order, and is tracked like any other schema change.

INSERT INTO categories (name, type, icon, color, is_default, user_id) VALUES
    ('Essentials', 'EXPENSE', 'essential', '#EF4444', true, NULL),
    ('Lifestyle',  'EXPENSE', 'lifestyle', '#8B5CF6', true, NULL),
    ('Financial',  'EXPENSE', 'financial', '#F59E0B', true, NULL),
    ('Personal',   'EXPENSE', 'personal',  '#EC4899', true, NULL),
    ('Income',     'INCOME',  'income',    '#10B981', true, NULL);

-- Essentials
INSERT INTO categories (name, type, icon, color, is_default, user_id, parent_category_id)
SELECT v.name, 'EXPENSE', v.icon, v.color, true, NULL,
       (SELECT id FROM categories WHERE name = 'Essentials' AND type = 'EXPENSE' AND user_id IS NULL)
FROM (VALUES
    ('Food',        'utensils',       '#F87171'),
    ('Groceries',   'shopping-cart',  '#FB923C'),
    ('Rent',        'home',           '#FBBF24'),
    ('Bills',       'file-text',      '#A3E635'),
    ('Transport',   'car',            '#34D399'),
    ('Health',      'heart-pulse',    '#F472B6')
) AS v(name, icon, color);

-- Lifestyle
INSERT INTO categories (name, type, icon, color, is_default, user_id, parent_category_id)
SELECT v.name, 'EXPENSE', v.icon, v.color, true, NULL,
       (SELECT id FROM categories WHERE name = 'Lifestyle' AND type = 'EXPENSE' AND user_id IS NULL)
FROM (VALUES
    ('Shopping',      'shopping-bag', '#C084FC'),
    ('Entertainment', 'gamepad-2',    '#818CF8'),
    ('Dining Out',    'coffee',       '#FB7185'),
    ('Subscriptions', 'repeat',       '#38BDF8'),
    ('Travel',        'plane',        '#2DD4BF')
) AS v(name, icon, color);

-- Financial
INSERT INTO categories (name, type, icon, color, is_default, user_id, parent_category_id)
SELECT v.name, 'EXPENSE', v.icon, v.color, true, NULL,
       (SELECT id FROM categories WHERE name = 'Financial' AND type = 'EXPENSE' AND user_id IS NULL)
FROM (VALUES
    ('EMI',          'landmark',     '#FCD34D'),
    ('Insurance',    'shield',       '#FCA5A1'),
    ('Investments',  'trending-up',  '#86EFAC'),
    ('Savings',      'piggy-bank',   '#93C5FD'),
    ('Tax',          'receipt',      '#FDE047')
) AS v(name, icon, color);

-- Personal
INSERT INTO categories (name, type, icon, color, is_default, user_id, parent_category_id)
SELECT v.name, 'EXPENSE', v.icon, v.color, true, NULL,
       (SELECT id FROM categories WHERE name = 'Personal' AND type = 'EXPENSE' AND user_id IS NULL)
FROM (VALUES
    ('Education',     'graduation-cap', '#F9A8D4'),
    ('Gifts',         'gift',           '#FDA4AF'),
    ('Donations',     'hand-heart',     '#D8B4FE'),
    ('Personal Care', 'sparkles',       '#FBCFE8')
) AS v(name, icon, color);

-- Income
INSERT INTO categories (name, type, icon, color, is_default, user_id, parent_category_id)
SELECT v.name, 'INCOME', v.icon, v.color, true, NULL,
       (SELECT id FROM categories WHERE name = 'Income' AND type = 'INCOME' AND user_id IS NULL)
FROM (VALUES
    ('Salary',    'banknote',      '#34D399'),
    ('Freelance', 'laptop',        '#6EE7B7'),
    ('Interest',  'percent',       '#A7F3D0'),
    ('Refund',    'undo',          '#BBF7D0'),
    ('Other',     'plus-circle',   '#D1FAE5')
) AS v(name, icon, color);
