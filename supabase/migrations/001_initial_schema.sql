-- Migration 001: Initial Omniken Schema
-- Run via: supabase migration up

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Licenses
CREATE TABLE IF NOT EXISTS licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL CHECK (tier IN ('founder', 'elite')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    price INT NOT NULL,
    license_key TEXT UNIQUE,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_license_key ON licenses(license_key);
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash TEXT UNIQUE NOT NULL,
    label TEXT,
    last_used TIMESTAMPTZ,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Usage Logs
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_in INT NOT NULL,
    prompt_out INT NOT NULL,
    saved INT NOT NULL,
    reduction FLOAT NOT NULL,
    model TEXT DEFAULT 'gpt4o',
    input_type TEXT DEFAULT 'text' CHECK (input_type IN ('text', 'image', 'audio', 'video')),
    context_cache BOOLEAN DEFAULT FALSE,
    cache_hits INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Checkout Sessions
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    email TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('founder', 'elite')),
    amount INT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    stripe_id TEXT UNIQUE,
    license_key TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkout_sessions_email ON checkout_sessions(email);
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
