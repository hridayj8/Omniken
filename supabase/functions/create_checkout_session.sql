-- Edge/Database Function: create_checkout_session
-- Creates a checkout session and returns payment URL
-- Called by the omniken MCP server or Streamlit UI

CREATE OR REPLACE FUNCTION create_checkout_session(
    p_email TEXT,
    p_tier TEXT,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_amount INT;
    v_session_id UUID;
    v_license_key TEXT;
BEGIN
    -- Validate tier
    IF p_tier NOT IN ('founder', 'elite') THEN
        RETURN jsonb_build_object('error', 'Invalid tier. Must be "founder" or "elite".');
    END IF;

    -- Set price
    v_amount := CASE p_tier
        WHEN 'founder' THEN 89
        WHEN 'elite' THEN 179
    END;

    -- Generate license key
    v_license_key := upper(
        'OMN-' || CASE p_tier WHEN 'founder' THEN 'FDR' ELSE 'ELT' END ||
        '-' || encode(gen_random_bytes(4), 'hex') ||
        '-' || to_char(nextval('checkout_sessions_id_seq'::regclass)::int, 'FM000000')
    );

    -- Insert session
    INSERT INTO checkout_sessions (user_id, email, tier, amount, status)
    VALUES (p_user_id, p_email, p_tier, v_amount, 'pending')
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object(
        'session_id', v_session_id,
        'email', p_email,
        'tier', p_tier,
        'amount', v_amount,
        'license_key', v_license_key,
        'checkout_url', 'https://omniken.dev/checkout/' || v_session_id,
        'status', 'pending'
    );
END;
$$;

-- Grant access to authenticated users
REVOKE EXECUTE ON FUNCTION create_checkout_session FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_checkout_session TO authenticated;
