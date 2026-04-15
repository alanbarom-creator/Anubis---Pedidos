-- ============================================================
-- SUMEFRA OS — Patch: Add 'oro' column to pedidos table
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS oro TEXT;

-- Optional: verify
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pedidos';
