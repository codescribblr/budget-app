-- Add linked_loan_id column to goals table for loan debt-paydown goals
ALTER TABLE goals
ADD COLUMN linked_loan_id INTEGER REFERENCES loans(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_goals_linked_loan_id ON goals(linked_loan_id);

-- Add comment
COMMENT ON COLUMN goals.linked_loan_id IS 'For debt-paydown goals: links to a loan that this goal is tracking';


