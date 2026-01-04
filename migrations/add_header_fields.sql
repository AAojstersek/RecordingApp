-- Migration: Add header extraction fields to recordings table
-- Run this in Supabase SQL Editor

ALTER TABLE recordings
ADD COLUMN IF NOT EXISTS client_company TEXT,
ADD COLUMN IF NOT EXISTS client_person TEXT,
ADD COLUMN IF NOT EXISTS transcript_body TEXT;

-- All new columns are nullable for backward compatibility with existing recordings

