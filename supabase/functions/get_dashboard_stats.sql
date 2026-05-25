-- Database Function: get_dashboard_stats
-- Returns aggregate stats for the user's dashboard

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_prompts', COUNT(*),
        'total_tokens_in', COALESCE(SUM(prompt_in), 0),
        'total_tokens_out', COALESCE(SUM(prompt_out), 0),
        'total_saved', COALESCE(SUM(saved), 0),
        'avg_reduction', ROUND(COALESCE(AVG(reduction), 0)::NUMERIC, 1),
        'estimated_savings_usd', ROUND((COALESCE(SUM(saved), 0) * 0.000002)::NUMERIC, 2),
        'models_used', jsonb_agg(DISTINCT model),
        'by_model', (
            SELECT jsonb_agg(jsonb_build_object(
                'model', model,
                'prompts', COUNT(*),
                'tokens_saved', SUM(saved)
            ))
            FROM usage_logs
            WHERE user_id = p_user_id
            GROUP BY model
        )
    ) INTO v_result
    FROM usage_logs
    WHERE user_id = p_user_id;

    RETURN COALESCE(v_result, jsonb_build_object(
        'total_prompts', 0, 'total_saved', 0, 'estimated_savings_usd', 0
    ));
END;
$$;

REVOKE EXECUTE ON FUNCTION get_dashboard_stats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
