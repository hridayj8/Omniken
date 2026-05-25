-- Database Function: log_usage
-- Records a token optimization event

CREATE OR REPLACE FUNCTION log_usage(
    p_user_id UUID,
    p_prompt_in INT,
    p_prompt_out INT,
    p_model TEXT DEFAULT 'gpt4o',
    p_input_type TEXT DEFAULT 'text',
    p_context_cache BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_saved INT;
    v_reduction FLOAT;
    v_usage_id UUID;
BEGIN
    v_saved := GREATEST(0, p_prompt_in - p_prompt_out);
    v_reduction := CASE WHEN p_prompt_in > 0
        THEN ROUND((v_saved::FLOAT / p_prompt_in) * 100, 1)
        ELSE 0
    END;

    INSERT INTO usage_logs (user_id, prompt_in, prompt_out, saved, reduction, model, input_type, context_cache)
    VALUES (p_user_id, p_prompt_in, p_prompt_out, v_saved, v_reduction, p_model, p_input_type, p_context_cache)
    RETURNING id INTO v_usage_id;

    RETURN jsonb_build_object(
        'id', v_usage_id,
        'saved', v_saved,
        'reduction', v_reduction,
        'model', p_model
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION log_usage FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_usage TO authenticated;
