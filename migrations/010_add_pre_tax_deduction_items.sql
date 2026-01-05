-- Migration: 010_add_pre_tax_deduction_items.sql
-- Description: Add support for storing pre-tax deduction items as JSON
-- Date: 2025-01-15
-- 
-- This migration doesn't add new columns since settings uses key-value pairs.
-- The pre_tax_deduction_items will be stored as a JSON string in the settings table
-- with key 'pre_tax_deduction_items'.
--
-- Example value:
-- [
--   {"id": "uuid-1", "name": "401k", "type": "percentage", "value": 10},
--   {"id": "uuid-2", "name": "Health Insurance", "type": "fixed", "value": 125},
--   {"id": "uuid-3", "name": "Dental", "type": "fixed", "value": 25}
-- ]
--
-- No schema changes needed - this is a documentation migration.


