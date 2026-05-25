-- ============================================================
-- Omniken — Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- USERS
-- Users can read and update only their own record
-- ============================================================
CREATE POLICY "users_select_own" ON users
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "users_update_own" ON users
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow anonymous registration
CREATE POLICY "users_insert_anon" ON users
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- ============================================================
-- LICENSES
-- Users can view own licenses; service role manages all
-- ============================================================
CREATE POLICY "licenses_select_own" ON licenses
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "licenses_insert_service" ON licenses
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "licenses_update_service" ON licenses
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- API KEYS
-- Users can manage own keys; key_hash is never readable
-- ============================================================
CREATE POLICY "api_keys_select_own" ON api_keys
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "api_keys_insert_own" ON api_keys
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_update_own" ON api_keys
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "api_keys_delete_own" ON api_keys
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- USAGE LOGS
-- Users can view own usage; insert via API
-- ============================================================
CREATE POLICY "usage_logs_select_own" ON usage_logs
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "usage_logs_insert" ON usage_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- CHECKOUT SESSIONS
-- Users can view own checkout sessions
-- ============================================================
CREATE POLICY "checkout_sessions_select_own" ON checkout_sessions
    FOR SELECT
    TO authenticated
    USING (email = auth.jwt() ->> 'email');

CREATE POLICY "checkout_sessions_insert" ON checkout_sessions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "checkout_sessions_update" ON checkout_sessions
    FOR UPDATE
    TO authenticated
    USING (email = auth.jwt() ->> 'email')
    WITH CHECK (email = auth.jwt() ->> 'email');
