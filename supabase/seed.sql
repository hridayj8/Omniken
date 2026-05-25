-- ============================================================
-- Omniken — Seed Data
-- Sample users, licenses, and test data for development
-- ============================================================

-- Sample user (replace with real registration)
INSERT INTO users (email, name) VALUES
    ('demo@omniken.dev', 'Demo User'),
    ('founder@omniken.dev', 'Founder Pass Holder')
ON CONFLICT (email) DO NOTHING;

-- Sample founder license
INSERT INTO licenses (user_id, tier, status, price, license_key, activated_at, expires_at)
SELECT
    id,
    'founder',
    'active',
    89,
    'OMN-FOUNDER-DEMO-000001',
    NOW(),
    NOW() + INTERVAL '365 days'
FROM users
WHERE email = 'founder@omniken.dev'
ON CONFLICT (license_key) DO NOTHING;

-- Sample usage logs for dashboard demo
INSERT INTO usage_logs (user_id, prompt_in, prompt_out, saved, reduction, model, input_type, context_cache)
SELECT
    id,
    12450, 6750, 5700, 45.8, 'gpt4o', 'text', true
FROM users
WHERE email = 'demo@omniken.dev';

INSERT INTO usage_logs (user_id, prompt_in, prompt_out, saved, reduction, model, input_type)
SELECT
    id,
    8900, 4200, 4700, 52.8, 'claude3.5', 'text'
FROM users
WHERE email = 'demo@omniken.dev';

INSERT INTO usage_logs (user_id, prompt_in, prompt_out, saved, reduction, model, input_type, context_cache)
SELECT
    id,
    32000, 17500, 14500, 45.3, 'gpt4o', 'image', true
FROM users
WHERE email = 'founder@omniken.dev';

-- ============================================================
-- Helper: Get user savings summary
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_savings_summary(p_user_id UUID)
RETURNS TABLE (
    total_prompts BIGINT,
    total_tokens_in BIGINT,
    total_tokens_out BIGINT,
    total_saved BIGINT,
    avg_reduction FLOAT,
    cash_saved FLOAT
) LANGUAGE SQL STABLE AS $$
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(prompt_in), 0)::BIGINT,
        COALESCE(SUM(prompt_out), 0)::BIGINT,
        COALESCE(SUM(saved), 0)::BIGINT,
        COALESCE(AVG(reduction), 0.0)::FLOAT,
        COALESCE(SUM(saved) * 0.000002, 0.0)::FLOAT  -- ~$2/1M tokens GPT-4o
    FROM usage_logs
    WHERE user_id = p_user_id;
$$;

-- ============================================================
-- Helper: Verify license key
-- ============================================================
CREATE OR REPLACE FUNCTION verify_license(p_license_key TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    tier TEXT,
    expires_at TIMESTAMPTZ
) LANGUAGE SQL STABLE AS $$
    SELECT
        status = 'active' AND (expires_at IS NULL OR expires_at > NOW()),
        tier,
        expires_at
    FROM licenses
    WHERE license_key = p_license_key;
$$;
