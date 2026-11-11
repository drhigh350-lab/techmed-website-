-- Organic Chemistry Mastery is listed but its PDF is not uploaded yet.
-- Deactivating the product stops pay-initiate from selling it ("not currently
-- available"), while Mastery/Ultimate students keep their lifetime access
-- rows, so the book appears in their library the moment the PDF is uploaded.
-- To put it on sale: UPDATE public.products SET is_active = true WHERE id = 'organic-chemistry-mastery';
UPDATE public.products SET is_active = false, updated_at = now() WHERE id = 'organic-chemistry-mastery';
