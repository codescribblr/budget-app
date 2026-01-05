-- Migration 010: Add Merchant Category Rules
-- This migration creates a new table to store auto-categorization rules
-- Separates category learning from merchant grouping

-- Create merchant_category_rules table
-- This stores which merchant groups should be auto-categorized to which categories
CREATE TABLE IF NOT EXISTS merchant_category_rules (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_group_id INTEGER REFERENCES merchant_groups(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    confidence_score INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 1,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Either merchant_group_id OR pattern must be set (for ungrouped merchants)
    pattern VARCHAR(500),
    normalized_pattern VARCHAR(500),
    -- Ensure we don't have duplicate rules
    UNIQUE(user_id, merchant_group_id, category_id),
    UNIQUE(user_id, pattern, category_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_user_id ON merchant_category_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_merchant_group_id ON merchant_category_rules(merchant_group_id);
CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_category_id ON merchant_category_rules(category_id);
CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_pattern ON merchant_category_rules(pattern);
CREATE INDEX IF NOT EXISTS idx_merchant_category_rules_normalized_pattern ON merchant_category_rules(normalized_pattern);

-- Enable Row Level Security
ALTER TABLE merchant_category_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own merchant category rules"
    ON merchant_category_rules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own merchant category rules"
    ON merchant_category_rules FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merchant category rules"
    ON merchant_category_rules FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own merchant category rules"
    ON merchant_category_rules FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_category_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_merchant_category_rules_updated_at
    BEFORE UPDATE ON merchant_category_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_category_rules_updated_at();


