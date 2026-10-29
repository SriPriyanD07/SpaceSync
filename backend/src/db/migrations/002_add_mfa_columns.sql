-- SpaceSync Migration 002: Add Multi-Factor Authentication (MFA / TOTP) support
-- Encrypted MFA secret stored at rest; boolean flag tracks active status.

ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;
