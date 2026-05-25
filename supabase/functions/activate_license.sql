-- Database Function: activate_license
-- Called after successful payment to activate a license key

CREATE OR REPLACE FUNCTION activate_license(
    p_session_id UUID,
    p_stripe_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session checkout_sessions%ROWTYPE;
    v_license_key TEXT;
BEGIN
    -- Fetch session
    SELECT * INTO v_session FROM checkout_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Checkout session not found');
    END IF;

    IF v_session.status != 'pending' THEN
        RETURN jsonb_build_object('error', 'Session already ' || v_session.status);
    END IF;

    -- Generate unique license key
    v_license_key := upper(
        'OMN-' || CASE v_session.tier WHEN 'founder' THEN 'FDR' ELSE 'ELT' END ||
        '-' || encode(gen_random_bytes(8), 'hex')
    );

    -- Update session
    UPDATE checkout_sessions
    SET status = 'completed',
        stripe_id = COALESCE(p_stripe_id, stripe_id),
        license_key = v_license_key,
        completed_at = NOW()
    WHERE id = p_session_id;

    -- Create license record
    INSERT INTO licenses (user_id, tier, status, price, license_key, activated_at, expires_at)
    VALUES (
        v_session.user_id,
        v_session.tier,
        'active',
        v_session.amount,
        v_license_key,
        NOW(),
        NOW() + INTERVAL '365 days'
    );

    RETURN jsonb_build_object(
        'status', 'activated',
        'license_key', v_license_key,
        'tier', v_session.tier,
        'expires_at', (NOW() + INTERVAL '365 days')::TEXT
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION activate_license FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_license TO authenticated;
