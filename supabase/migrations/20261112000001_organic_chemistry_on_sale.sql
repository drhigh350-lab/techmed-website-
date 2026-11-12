-- Organic Chemistry Mastery PDF and free preview are uploaded (paid-resources:
-- organic-chemistry-mastery.pdf, organic-chemistry-mastery-free-preview.pdf).
-- Put it on sale: ₦3,000 (compare-at ₦5,000), plan students 20% off in pay-initiate.
UPDATE public.products
SET is_active = true, price_ngn = 3000, compare_at_price_ngn = 5000, updated_at = now()
WHERE id = 'organic-chemistry-mastery';
