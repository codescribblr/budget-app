-- Migration 008: Add Merchant Groups and Mappings (Safe Version)
-- This migration safely creates or updates tables for intelligent merchant grouping

-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS merchant_mappings CASCADE;
DROP TABLE IF EXISTS merchant_groups CASCADE;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_merchant_updated_at() CASCADE;

-- Create merchant_groups table
CREATE TABLE merchant_groups (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, display_name)
);

-- Create merchant_mappings table
CREATE TABLE merchant_mappings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    merchant_group_id INTEGER REFERENCES merchant_groups(id) ON DELETE CASCADE,
    pattern VARCHAR(500) NOT NULL,
    normalized_pattern VARCHAR(500) NOT NULL,
    is_automatic BOOLEAN DEFAULT true,
    confidence_score DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, pattern)
);

-- Create indexes for performance
CREATE INDEX idx_merchant_groups_user_id ON merchant_groups(user_id);
CREATE INDEX idx_merchant_mappings_user_id ON merchant_mappings(user_id);
CREATE INDEX idx_merchant_mappings_pattern ON merchant_mappings(pattern);
CREATE INDEX idx_merchant_mappings_normalized_pattern ON merchant_mappings(normalized_pattern);
CREATE INDEX idx_merchant_mappings_merchant_group_id ON merchant_mappings(merchant_group_id);

-- Enable Row Level Security
ALTER TABLE merchant_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchant_groups
CREATE POLICY "Users can view their own merchant groups"
    ON merchant_groups FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own merchant groups"
    ON merchant_groups FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merchant groups"
    ON merchant_groups FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own merchant groups"
    ON merchant_groups FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for merchant_mappings
CREATE POLICY "Users can view their own merchant mappings"
    ON merchant_mappings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own merchant mappings"
    ON merchant_mappings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own merchant mappings"
    ON merchant_mappings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own merchant mappings"
    ON merchant_mappings FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE FUNCTION update_merchant_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_merchant_groups_updated_at
    BEFORE UPDATE ON merchant_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_updated_at();

CREATE TRIGGER update_merchant_mappings_updated_at
    BEFORE UPDATE ON merchant_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_merchant_updated_at();

