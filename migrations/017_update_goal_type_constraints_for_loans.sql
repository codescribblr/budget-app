-- Update goal_type_constraints to allow debt-paydown goals to link to either credit cards OR loans
-- Drop the old constraint
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goal_type_constraints;

-- Add the updated constraint
ALTER TABLE goals ADD CONSTRAINT goal_type_constraints CHECK (
  (
    goal_type = 'envelope' 
    AND linked_category_id IS NOT NULL 
    AND linked_account_id IS NULL 
    AND linked_credit_card_id IS NULL
    AND linked_loan_id IS NULL
  )
  OR
  (
    goal_type = 'account-linked' 
    AND linked_account_id IS NOT NULL 
    AND linked_category_id IS NULL 
    AND linked_credit_card_id IS NULL
    AND linked_loan_id IS NULL
  )
  OR
  (
    goal_type = 'debt-paydown' 
    AND (
      (linked_credit_card_id IS NOT NULL AND linked_loan_id IS NULL)
      OR
      (linked_loan_id IS NOT NULL AND linked_credit_card_id IS NULL)
    )
    AND linked_account_id IS NULL 
    AND linked_category_id IS NULL
  )
);


