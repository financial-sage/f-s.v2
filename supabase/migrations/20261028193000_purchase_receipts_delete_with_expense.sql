-- Soft-delete of expenses is handled in app code; this covers hard deletes.
-- Also drop any orphaned receipts left after SET NULL.

ALTER TABLE public.purchase_receipts
  DROP CONSTRAINT IF EXISTS purchase_receipts_expense_id_fkey;

ALTER TABLE public.purchase_receipts
  ADD CONSTRAINT purchase_receipts_expense_id_fkey
  FOREIGN KEY (expense_id)
  REFERENCES public.expenses(id)
  ON DELETE CASCADE;

-- Remove receipts whose expense was soft-deleted or unlinked.
DELETE FROM public.purchase_receipts pr
WHERE pr.expense_id IS NULL
   OR EXISTS (
     SELECT 1
     FROM public.expenses e
     WHERE e.id = pr.expense_id
       AND e.is_active = false
   );
