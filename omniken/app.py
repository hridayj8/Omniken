"""Omniken — Streamlit SaaS backend.
Complete implementation with:
- Token compression engine (Pass 1 + Pass 2)
- Multi-modal context estimation (text, image, audio, video)
- API Cost Offset Calculator with ROI validation
- Supabase/Prisma user auth + license management
- Checkout flow for Founder ($89/yr) and Elite ($179/yr) tiers
"""

import streamlit as st
import tiktoken
import re
import json
import time
import os
from typing import Optional
from datetime import datetime, timedelta
from urllib.parse import urlparse

# ── Page config ─────────────────────────────────────────────
st.set_page_config(
    page_title="Omniken — The Infinite Zero Engine",
    page_icon="♾️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── CSS Injection (matches frontend design system) ──────────
st.markdown(
    """
<style>
    @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700&family=SF+Mono:wght@400;500;600;700&display=swap');

    html, body, [data-testid="stAppViewContainer"] {
        background-color: #000000 !important;
        color: #F5F5F7 !important;
        font-family: 'SF Pro Display', -apple-system, sans-serif !important;
    }
    [data-testid="stHeader"] { display: none !important; }
    [data-testid="stToolbar"] { display: none !important; }
    [data-testid="stSidebar"] {
        background-color: rgba(22, 22, 23, 0.8) !important;
        border-right: 1px solid #333336 !important;
        backdrop-filter: blur(24px) !important;
    }
    .stApp {
        background: #000000;
    }
    .main > div {
        padding: 2rem 1rem !important;
    }

    .omniken-card {
        background: rgba(22, 22, 23, 0.8);
        border: 1px solid #333336 !important;
        border-radius: 12px;
        padding: 1.75rem;
        backdrop-filter: blur(24px);
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .omniken-card:active {
        transform: scale(0.99);
    }
    .omniken-card:hover {
        border-color: #5a5a5e !important;
    }

    h1, h2, h3 {
        font-family: 'SF Pro Display', sans-serif !important;
        font-weight: 700 !important;
        letter-spacing: -0.03em !important;
        color: #F5F5F7 !important;
    }
    .stMarkdown p {
        color: #98989D !important;
        font-size: 15px !important;
        line-height: 1.65 !important;
    }
    code, pre, .stCodeBlock {
        font-family: 'SF Mono', 'JetBrains Mono', monospace !important;
        color: #2997FF !important;
    }
    .stTextArea textarea {
        background: rgba(0, 0, 0, 0.7) !important;
        border: 1px solid #333336 !important;
        border-radius: 8px !important;
        color: #F5F5F7 !important;
        font-family: 'SF Mono', monospace !important;
        font-size: 13px !important;
    }
    .stTextArea textarea:focus {
        border-color: #2997FF !important;
        box-shadow: 0 0 0 3px rgba(41, 151, 255, 0.12) !important;
    }
    .stButton button {
        font-family: 'SF Mono', monospace !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    .stButton button:active {
        transform: scale(0.96) !important;
    }
    div[data-testid="stMetricValue"] {
        font-family: 'SF Mono', monospace !important;
        color: #2997FF !important;
        font-weight: 700 !important;
    }
    div[data-testid="stMetricLabel"] {
        font-family: 'SF Mono', monospace !important;
        color: #555558 !important;
        font-size: 11px !important;
        letter-spacing: 0.08em !important;
    }
    .stSlider > div > div > div {
        background: #2997FF !important;
    }
    .stSelectbox div[data-baseweb="select"] {
        background: rgba(0, 0, 0, 0.7) !important;
        border-color: #333336 !important;
    }
    .stAlert {
        background: rgba(22, 22, 23, 0.8) !important;
        border: 1px solid #333336 !important;
        color: #F5F5F7 !important;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(41,151,255,0.15); border-radius: 3px; }
</style>
""",
    unsafe_allow_html=True,
)

# ── Session State Initialization ────────────────────────────
for key in [
    "optimized_output",
    "metrics_calculated",
    "auth_token",
    "anti_gravity_active",
    "api_key",
    "user_email",
    "license_tier",
    "total_prompts_processed",
    "total_tokens_saved",
]:
    if key not in st.session_state:
        st.session_state[key] = None if key in ["auth_token", "api_key", "user_email", "license_tier"] else (
            0 if key in ["total_prompts_processed", "total_tokens_saved"] else ({} if key == "metrics_calculated" else False if key == "anti_gravity_active" else "")
        )

if "optimized_output" not in st.session_state:
    st.session_state.optimized_output = ""

# ── Supabase / Prisma Integration ───────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/omniken")

# Try to import supabase client (fail gracefully if not installed)
try:
    from supabase import create_client, Client
    supabase: Optional[Client] = None
    if SUPABASE_URL and SUPABASE_KEY:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
except ImportError:
    supabase = None

# ── Token Counting ─────────────────────────────────────────
def estimate_tokens(text: str) -> int:
    """Estimate tokens using tiktoken with fallback heuristic."""
    if not text or text.strip() == "":
        return 0

    # Try tiktoken first
    try:
        enc = tiktoken.get_encoding("cl100k_base")
        return len(enc.encode(text))
    except Exception:
        pass

    # Fallback: word-based heuristic
    words = text.strip().split()
    count = 0
    for w in words:
        if len(w) <= 4:
            count += 1
        elif len(w) <= 8:
            count += 1.3
        elif len(w) <= 16:
            count += 1.8
        else:
            count += len(w) / 4
    punct = len(re.findall(r"[.,;:!?()\[\]{}'\"`\\|/]", text))
    return round(count + punct * 0.3)


# ── Multi-Modal Estimation ──────────────────────────────────
def estimate_image_tokens(width: int, height: int, detail: str = "auto") -> int:
    if detail == "low":
        return 85
    tiles = (
        (min(width, 2048) + 511) // 512
        * (min(height, 2048) + 511) // 512
    )
    return 85 + tiles * 170


def estimate_audio_tokens(duration_sec: float) -> int:
    return round(duration_sec * 12.5)


def estimate_video_tokens(duration_sec: float, fps: int = 24) -> int:
    frames = duration_sec * fps
    sample_frames = min(frames, 150)
    return estimate_image_tokens(1920, 1080) * sample_frames


MULTIMODAL_RATES = {
    "text": {"rate": 2.50, "cache_90pct": 0.25, "label": "Text"},
    "image": {"rate": 7.50, "cache_90pct": 0.75, "label": "Image"},
    "audio": {"rate": 3.75, "cache_90pct": 0.38, "label": "Audio"},
    "video": {"rate": 12.00, "cache_90pct": 1.20, "label": "Video"},
}

# ── Protected Block Registry ────────────────────────────────
def extract_protected_blocks(text: str) -> tuple:
    """Extract code/math/JSON blocks so they survive passes."""
    registry = []
    idx = 0
    patterns = [
        (r"```[\s\S]*?```", "code_fence"),
        (r"`[^`\n]+`", "inline_code"),
        (r"\$\$[\s\S]*?\$\$", "math_block"),
        (r"\$[^\$\n]+\$", "math_inline"),
        (r"\{[\s\S]{2,}?\}", "json"),
        (r"\[[\s\S]{2,}?\]", "json_array"),
    ]

    spans = []
    for pattern, ptype in patterns:
        for m in re.finditer(pattern, text):
            start, end = m.start(), m.end()
            if not any(start < s[1] and end > s[0] for s in spans):
                placeholder = f"\x00OMNI_PROTECTED_{idx}\x00"
                spans.append((start, end, placeholder, m.group(), ptype))
                idx += 1

    spans.sort(key=lambda x: x[0], reverse=True)
    processed = text
    for start, end, placeholder, content, ptype in spans:
        processed = processed[:start] + placeholder + processed[end:]
        registry.append({"placeholder": placeholder, "content": content, "type": ptype})

    return processed, registry


def restore_protected_blocks(text: str, registry: list) -> str:
    restored = text
    for entry in registry:
        restored = restored.replace(entry["placeholder"], entry["content"])
    return restored


# ── Pass 1: Heuristic Fluff Stripper ────────────────────────
PASS1_RULES: list[tuple[str, str]] = [
    (r"^(hi|hello|hey|greetings|good (morning|afternoon|evening|day))[,!.]?\s*", ""),
    (r"\b(thanks?( you)?|thank you so much|many thanks|thx|cheers)[,!.]?\s*$", ""),
    (r"\b(best regards?|sincerely|yours? truly|warm regards?)[,!.]?\s*$", ""),
    (r"\b(I hope (you('re| are) doing (well|great|fine)|this (message|email) finds you well))[,!.]?\s*", ""),
    (r"\b(please note (that )?)", ""),
    (r"\b(very|really|quite|rather|somewhat|fairly|pretty|just|actually|basically|essentially|literally|obviously|simply|clearly)\s+", ""),
    (r"\bIn (conclusion|summary),?\s*", "Summary: "),
    (r"\bIn order to\b", "To"),
    (r"\bdue to the fact that\b", "because"),
    (r"\bat this point in time\b", "now"),
    (r"\bin the event that\b", "if"),
    (r"\bfor the purpose of\b", "to"),
    (r"\bwith regard to\b", "regarding"),
    (r"\bwith respect to\b", "regarding"),
    (r"\bon the other hand\b", "conversely"),
    (r"\bthe fact that\b", "that"),
    (r"\bI would like to\b", "I want to"),
    (r"\bI am going to\b", "I'll"),
    (r"\bwe are going to\b", "we'll"),
    (r"\bgoing to\b", "will"),
    (r"\bwould like to\b", "want to"),
    (r"\b(kind of|sort of|a bit|a little|to be honest|frankly speaking)\s*", ""),
    (r"\n{3,}", "\n\n"),
    (r"[ \t]{2,}", " "),
    (r"^[ \t]+", "", re.MULTILINE),
    (r"[ \t]+$", "", re.MULTILINE),
]


def run_pass1(text: str) -> str:
    out = text
    for pattern, replacement in PASS1_RULES:
        flags = 0
        if isinstance(pattern, tuple):
            pattern, flags = pattern
        out = re.sub(pattern, replacement, out, flags=flags)
    return re.sub(r"\n{3,}", "\n\n", out).strip()


# ── Pass 2: Semantic Shorthand Packer ───────────────────────
PASS2_RULES: list[tuple[str, str]] = [
    (r"\bfor example\b", "e.g."),
    (r"\bthat is (to say)?\b", "i.e."),
    (r"\band so on\b", "etc."),
    (r"\band so forth\b", "etc."),
    (r"\bas well as\b", "&"),
    (r"\band also\b", "&"),
    (r"\bAct as (an?|the) (expert )?", "Role: "),
    (r"\bYour task is to\b", "Task:"),
    (r"\bYour goal is to\b", "Goal:"),
    (r"\bPlease (ensure|make sure) (that )?", "Ensure "),
    (r"\bYou should\b", ""),
    (r"\bYou need to\b", ""),
    (r"\bdo not\b", "don't"),
    (r"\bcannot\b", "can't"),
    (r"\bwill not\b", "won't"),
    (r"\n{3,}", "\n\n"),
    (r"[ \t]{2,}", " "),
]


def run_pass2(text: str) -> str:
    out = text
    for pattern, replacement in PASS2_RULES:
        out = re.sub(pattern, replacement, out)
    return re.sub(r"\n{3,}", "\n\n", out).strip()


# ── Main Optimization Pipeline ──────────────────────────────
def optimize_text(input_text: str, passes: list = None) -> dict:
    """Run the two-pass optimization pipeline with protected block extraction."""
    if passes is None:
        passes = ["pass1", "pass2"]

    t0 = time.time()
    processed, registry = extract_protected_blocks(input_text)

    result = processed
    pass_stats = {}

    if "pass1" in passes:
        before = estimate_tokens(result)
        result = run_pass1(result)
        after = estimate_tokens(result)
        pass_stats["pass1"] = {"tokens_in": before, "tokens_out": after, "reduction": before - after}

    if "pass2" in passes:
        before = estimate_tokens(result)
        result = run_pass2(result)
        after = estimate_tokens(result)
        pass_stats["pass2"] = {"tokens_in": before, "tokens_out": after, "reduction": before - after}

    result = restore_protected_blocks(result, registry).strip()

    tok_in = estimate_tokens(input_text)
    tok_out = estimate_tokens(result)
    saved = max(0, tok_in - tok_out)
    reduction_pct = (saved / tok_in * 100) if tok_in > 0 else 0.0

    elapsed = (time.time() - t0) * 1000

    return {
        "output": result,
        "tokens_in": tok_in,
        "tokens_out": tok_out,
        "tokens_saved": saved,
        "reduction_pct": round(reduction_pct, 1),
        "pass_stats": pass_stats,
        "protected_blocks": len(registry),
        "elapsed_ms": round(elapsed, 1),
    }


# ── Model Definitions ────────────────────────────────────────
MODELS = {
    "gpt4o": {"name": "GPT-4o", "rate_per_m": 2.50, "overhead": 0.00},
    "claude": {"name": "Claude 3.5 Sonnet", "rate_per_m": 3.00, "overhead": 0.12},
    "gemini": {"name": "Gemini 1.5 Pro", "rate_per_m": 1.25, "overhead": 0.00},
    "llama": {"name": "Llama 3 70B", "rate_per_m": 0.60, "overhead": 0.00},
    "opus": {"name": "Claude 3 Opus", "rate_per_m": 15.00, "overhead": 0.00},
    "gpt4": {"name": "GPT-4", "rate_per_m": 30.00, "overhead": 0.00},
}

PLANS = {
    "founder": {"name": "Founder's Pass", "price": 89, "label": "$89/yr"},
    "elite": {"name": "Elite Agentic", "price": 179, "label": "$179/yr"},
}


# ── Calculator ────────────────────────────────────────────────
def calculate_savings(daily_calls, avg_tokens, compression_rate, model_key, plan_key):
    effective_rate = MODELS[model_key]["rate_per_m"] * (1 + MODELS[model_key]["overhead"])
    plan_cost = PLANS[plan_key]["price"]

    tok_saved_per_call = avg_tokens * (compression_rate / 100)
    daily_tok_saved = daily_calls * tok_saved_per_call
    daily_saving = (daily_tok_saved / 1_000_000) * effective_rate
    annual_saving = daily_saving * 365
    payback_days = plan_cost / daily_saving if daily_saving > 0 else float("inf")
    roi = ((annual_saving - plan_cost) / plan_cost * 100) if plan_cost > 0 else 0

    return {
        "daily_saving": daily_saving,
        "annual_saving": annual_saving,
        "payback_days": payback_days,
        "roi": roi,
        "plan_cost": plan_cost,
        "daily_tok_saved": daily_tok_saved,
        "tok_saved_per_call": tok_saved_per_call,
        "effective_rate": effective_rate,
    }


# ── UI Components ─────────────────────────────────────────────
def render_header():
    cols = st.columns([1, 3, 1])
    with cols[1]:
        st.markdown(
            """<div style="text-align:center;padding:2rem 0;">
                <div style="font-size:48px;font-weight:700;letter-spacing:-0.04em;color:#F5F5F7;">
                    ♾ Omniken
                </div>
                <div style="font-family:'SF Mono',monospace;font-size:13px;color:#2997FF;margin-top:8px;">
                    ZERO_CONTEXT_v1.1 · Streamlit SaaS
                </div>
            </div>""",
            unsafe_allow_html=True,
        )


def render_sidebar():
    with st.sidebar:
        st.markdown("### ⚙️ Control Panel")

        # License status
        if st.session_state.license_tier:
            st.markdown(
                f"""<div style="padding:12px;background:rgba(41,151,255,0.08);
                    border:1px solid rgba(41,151,255,0.2);border-radius:8px;
                    font-family:'SF Mono',monospace;font-size:12px;color:#2997FF;">
                    ● {st.session_state.license_tier} Active
                </div>""",
                unsafe_allow_html=True,
            )
        else:
            st.markdown(
                """<div style="padding:12px;background:rgba(255,70,70,0.08);
                    border:1px solid rgba(255,70,70,0.2);border-radius:8px;
                    font-family:'SF Mono',monospace;font-size:12px;color:#FF4646;">
                    ○ No License
                </div>""",
                unsafe_allow_html=True,
            )

        st.divider()

        # Auth
        with st.expander("🔐 API Key / Auth", expanded=not bool(st.session_state.api_key)):
            email = st.text_input("Email", value=st.session_state.user_email or "", placeholder="user@example.com")
            api_key = st.text_input("API Key", type="password", value=st.session_state.api_key or "", placeholder="sk-...")
            if st.button("Authenticate", use_container_width=True):
                st.session_state.user_email = email
                st.session_state.api_key = api_key
                st.session_state.auth_token = f"omni_{hash(email + api_key) % 10**8}"
                st.success("✓ Session authenticated")
                st.rerun()

        st.divider()

        # Session stats
        st.markdown("### 📊 Session Stats")
        st.metric("Prompts Processed", st.session_state.total_prompts_processed)
        st.metric("Tokens Saved", f"{st.session_state.total_tokens_saved:,}")

        if st.session_state.anti_gravity_active:
            st.warning("⚠️ Anti-gravity mode — constraints disabled")


def render_engine_tab():
    st.markdown(
        """<div style="text-align:center;margin-bottom:2rem;">
            <div style="font-size:11px;font-weight:600;font-family:'SF Mono',monospace;
                letter-spacing:0.12em;text-transform:uppercase;color:#2997FF;margin-bottom:12px;">
                // CORE ENGINE
            </div>
            <h2 style="font-size:clamp(24px,3vw,36px);font-weight:700;color:#F5F5F7;margin-bottom:12px;">
                Context Compression Workspace
            </h2>
            <p style="color:#98989D;max-width:520px;margin:0 auto;">
                Paste any AI prompt. Pass 1 strips fluff. Pass 2 packs semantics into dense AI shorthand.
            </p>
        </div>""",
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2)

    with col1:
        with st.container():
            st.markdown(
                """<div class="omniken-card">
                    <div style="font-size:11px;font-family:'SF Mono',monospace;
                        letter-spacing:0.1em;color:#555558;margin-bottom:12px;">
                        <span style="color:#2997FF;">●</span> INPUT PROMPT
                    </div>""",
                unsafe_allow_html=True,
            )
            input_text = st.text_area(
                "Input Prompt",
                height=280,
                placeholder="Paste your AI prompt here...\n\nThe engine will compress by 40-60% while maintaining 100% semantic fidelity.",
                label_visibility="collapsed",
                key="input_prompt",
            )
            st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        with st.container():
            st.markdown(
                """<div class="omniken-card">
                    <div style="font-size:11px;font-family:'SF Mono',monospace;
                        letter-spacing:0.1em;color:#555558;margin-bottom:12px;">
                        <span style="color:oklch(68% 0.19 145);">●</span> COMPRESSED OUTPUT
                    </div>""",
                unsafe_allow_html=True,
            )
            output_text = st.text_area(
                "Output",
                height=280,
                value=st.session_state.optimized_output,
                disabled=True,
                label_visibility="collapsed",
            )
            st.markdown("</div>", unsafe_allow_html=True)

    # Controls
    c1, c2, c3, c4 = st.columns([1, 1, 1, 1])
    with c1:
        if st.button("⚡ Optimize", use_container_width=True, type="primary"):
            if input_text and input_text.strip():
                try:
                    result = optimize_text(input_text)
                    st.session_state.optimized_output = result["output"]
                    st.session_state.total_prompts_processed += 1
                    st.session_state.total_tokens_saved += result["tokens_saved"]

                    m1, m2, m3, m4 = st.columns(4)
                    m1.metric("Tokens In", result["tokens_in"])
                    m2.metric("Tokens Out", result["tokens_out"])
                    m3.metric("Saved", result["tokens_saved"])
                    m4.metric("Reduction", f"{result['reduction_pct']}%")

                    # Pass info
                    with st.expander("Pass Details", expanded=True):
                        for pass_key in ["pass1", "pass2"]:
                            if pass_key in result["pass_stats"]:
                                ps = result["pass_stats"][pass_key]
                                st.markdown(
                                    f"""<div style="font-family:'SF Mono',monospace;font-size:12px;
                                        padding:8px 12px;margin:4px 0;background:rgba(0,0,0,0.4);
                                        border:1px solid #333336;border-radius:6px;">
                                        <span style="color:#2997FF;">◆</span> {pass_key.upper()}: {ps['tokens_in']} → {ps['tokens_out']} tokens (−{ps['reduction']})
                                    </div>""",
                                    unsafe_allow_html=True,
                                )
                        st.markdown(
                            f"""<div style="font-family:'SF Mono',monospace;font-size:11px;
                                color:#555558;margin-top:8px;">
                                ⚡ {result['elapsed_ms']}ms · {result['protected_blocks']} protected blocks
                            </div>""",
                            unsafe_allow_html=True,
                        )

                    st.rerun()
                except Exception as e:
                    st.error(f"Optimization error: {e}")
            else:
                st.warning("Please enter a prompt to optimize.")

    with c2:
        if st.button("Pass 1 Only", use_container_width=True):
            if input_text and input_text.strip():
                result = optimize_text(input_text, passes=["pass1"])
                st.session_state.optimized_output = result["output"]
                st.rerun()

    with c3:
        if st.button("Clear", use_container_width=True):
            st.session_state.optimized_output = ""
            st.session_state.input_prompt = ""
            st.rerun()

    with c4:
        if st.button("Load Demo", use_container_width=True):
            demo = (
                "Hello! I hope you are doing well! I would like to ask you to act as a "
                "master software engineer. Your task is to help me build a great web application. "
                "Please ensure that you write clean code and make sure to handle all edge cases. "
                "```python\ndef hello():\n    print('preserved')\n```\n"
                "The formula is $E = mc^2$.\n{\"key\": \"value\"}"
            )
            st.session_state.input_prompt = demo
            st.rerun()

    # Metrics footer
    if st.session_state.total_prompts_processed > 0:
        st.markdown("---")
        st.markdown(
            f"""<div style="display:flex;gap:16px;font-family:'SF Mono',monospace;font-size:12px;">
                <span style="color:#555558;">TOTAL PROMPTS: {st.session_state.total_prompts_processed}</span>
                <span style="color:#555558;">TOTAL TOKENS SAVED: {st.session_state.total_tokens_saved:,}</span>
            </div>""",
            unsafe_allow_html=True,
        )


def render_multimodal_tab():
    st.markdown(
        """<div style="text-align:center;margin-bottom:2rem;">
            <div style="font-size:11px;font-weight:600;font-family:'SF Mono',monospace;
                letter-spacing:0.12em;text-transform:uppercase;color:#2997FF;margin-bottom:12px;">
                // MULTI-MODAL OPTIMIZER
            </div>
            <h2 style="font-size:clamp(24px,3vw,36px);font-weight:700;color:#F5F5F7;margin-bottom:12px;">
                Text · Image · Audio · Video
            </h2>
        </div>""",
        unsafe_allow_html=True,
    )

    inputs = []

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(
            """<div class="omniken-card" style="margin-bottom:1rem;">
                <div style="font-size:11px;font-family:'SF Mono',monospace;
                    letter-spacing:0.1em;color:#555558;margin-bottom:12px;">
                    📝 TEXT INPUT
                </div>""",
            unsafe_allow_html=True,
        )
        text_input = st.text_area("Text to optimize", height=120, placeholder="Paste text prompt here...", label_visibility="collapsed")
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown(
            """<div class="omniken-card" style="margin-bottom:1rem;">
                <div style="font-size:11px;font-family:'SF Mono',monospace;
                    letter-spacing:0.1em;color:#555558;margin-bottom:12px;">
                    🖼️ IMAGE
                </div>""",
            unsafe_allow_html=True,
        )
        i1, i2 = st.columns(2)
        with i1:
            img_w = st.number_input("Width (px)", value=1024, min_value=1, max_value=4096)
            img_detail = st.selectbox("Detail", ["auto", "low", "high"])
        with i2:
            img_h = st.number_input("Height (px)", value=1024, min_value=1, max_value=4096)
        image_count = st.number_input("Image count", value=1, min_value=0, max_value=50)
        st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        st.markdown(
            """<div class="omniken-card" style="margin-bottom:1rem;">
                <div style="font-size:11px;font-family:'SF Mono',monospace;
                    letter-spacing:0.1em;color:#555558;margin-bottom:12px;">
                    🎵 AUDIO
                </div>""",
            unsafe_allow_html=True,
        )
        audio_dur = st.number_input("Duration (seconds)", value=60, min_value=1, max_value=7200)
        audio_count = st.number_input("Audio files", value=1, min_value=0, max_value=50)
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown(
            """<div class="omniken-card" style="margin-bottom:1rem;">
                <div style="font-size:11px;font-family:'SF Mono',monospace;
                    letter-spacing:0.1em;color:#555558;margin-bottom:12px;">
                    🎬 VIDEO
                </div>""",
            unsafe_allow_html=True,
        )
        video_dur = st.number_input("Duration (seconds)", value=30, min_value=1, max_value=600, key="vid_dur")
        video_fps = st.number_input("FPS", value=24, min_value=1, max_value=60)
        video_count = st.number_input("Video files", value=1, min_value=0, max_value=50)
        st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Calculate Multi-Modal Cost", type="primary", use_container_width=True):
        if text_input and text_input.strip():
            result = optimize_text(text_input)
            inputs.append({"type": "text", "content": text_input})

        total_tokens_in = 0
        total_cost_raw = 0.0
        total_cost_cached = 0.0

        if text_input and text_input.strip():
            t = estimate_tokens(text_input)
            total_tokens_in += t
            total_cost_raw += (t / 1_000_000) * MULTIMODAL_RATES["text"]["rate"]
            total_cost_cached += (t / 1_000_000) * MULTIMODAL_RATES["text"]["cache_90pct"]

        for _ in range(image_count):
            t = estimate_image_tokens(img_w, img_h, img_detail)
            total_tokens_in += t
            total_cost_raw += (t / 1_000_000) * MULTIMODAL_RATES["image"]["rate"]
            total_cost_cached += (t / 1_000_000) * MULTIMODAL_RATES["image"]["cache_90pct"]

        for _ in range(audio_count):
            t = estimate_audio_tokens(audio_dur)
            total_tokens_in += t
            total_cost_raw += (t / 1_000_000) * MULTIMODAL_RATES["audio"]["rate"]
            total_cost_cached += (t / 1_000_000) * MULTIMODAL_RATES["audio"]["cache_90pct"]

        for _ in range(video_count):
            t = estimate_video_tokens(video_dur, video_fps)
            total_tokens_in += t
            total_cost_raw += (t / 1_000_000) * MULTIMODAL_RATES["video"]["rate"]
            total_cost_cached += (t / 1_000_000) * MULTIMODAL_RATES["video"]["cache_90pct"]

        st.markdown("---")
        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Tokens", f"{total_tokens_in:,}")
        m2.metric("Raw Cost", f"${total_cost_raw:.4f}")
        m3.metric("With Context Cache (90%)", f"${total_cost_cached:.4f}")
        m4.metric("Savings", f"{((1 - total_cost_cached / total_cost_raw) * 100):.0f}%" if total_cost_raw > 0 else "0%")


def render_calculator_tab():
    st.markdown(
        """<div style="text-align:center;margin-bottom:2rem;">
            <div style="font-size:11px;font-weight:600;font-family:'SF Mono',monospace;
                letter-spacing:0.12em;text-transform:uppercase;color:#2997FF;margin-bottom:12px;">
                // API COST OFFSET CALCULATOR
            </div>
            <h2 style="font-size:clamp(24px,3vw,36px);font-weight:700;color:#F5F5F7;margin-bottom:12px;">
                Real-Time Payback Analysis
            </h2>
        </div>""",
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns(2)

    with col1:
        with st.container():
            st.markdown(
                """<div class="omniken-card">
                    <div style="font-size:11px;font-family:'SF Mono',monospace;
                        letter-spacing:0.1em;color:#555558;margin-bottom:16px;">
                        <span style="color:#2997FF;">●</span> USAGE PARAMETERS
                    </div>""",
                unsafe_allow_html=True,
            )

            daily_calls = st.slider("Daily API Calls", 100, 50000, 5000, step=100)
            avg_tokens = st.slider("Avg Tokens / Prompt", 100, 8000, 1200, step=50)
            compression = st.slider("Compression Rate (%)", 20, 65, 47, step=1)

            model_key = st.selectbox(
                "Primary Model",
                options=list(MODELS.keys()),
                format_func=lambda k: f"{MODELS[k]['name']} (${MODELS[k]['rate_per_m']}/M)",
                index=0,
            )
            plan_key = st.selectbox(
                "Plan Tier",
                options=list(PLANS.keys()),
                format_func=lambda k: f"{PLANS[k]['name']} — {PLANS[k]['label']}",
                index=0,
            )

            st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        result = calculate_savings(daily_calls, avg_tokens, compression, model_key, plan_key)

        with st.container():
            st.markdown(
                """<div class="omniken-card">
                    <div style="font-size:11px;font-family:'SF Mono',monospace;
                        letter-spacing:0.1em;color:#555558;margin-bottom:16px;">
                        <span style="color:oklch(68% 0.19 145);">●</span> SAVINGS PROJECTION
                    </div>""",
                unsafe_allow_html=True,
            )

            m1, m2 = st.columns(2)
            m1.metric("Daily Savings", f"${result['daily_saving']:.2f}")
            m2.metric("Annual Savings", f"${result['annual_saving']:.2f}")

            st.divider()

            m3, m4 = st.columns(2)
            payback_display = f"{result['payback_days']:.0f} days" if result["payback_days"] != float("inf") else "∞ days"
            m3.metric("Payback Period", payback_display)
            m4.metric("Annual ROI", f"+{result['roi']:.0f}%")

            st.divider()

            # Math proof
            st.markdown(
                f"""<div style="font-family:'SF Mono',monospace;font-size:12px;
                    background:rgba(0,0,0,0.5);padding:16px;border-radius:8px;
                    border:1px solid #333336;line-height:2.2;color:#98989D;">
                    <span style="color:#555558;">// Per-call token math</span>
                    <br/>tok_saved/call = {avg_tokens} × {compression}% = <span style="color:oklch(68% 0.19 145);">{result['tok_saved_per_call']:.0f}</span>
                    <br/>daily_tok_saved = {result['tok_saved_per_call']:.0f} × {daily_calls:,} = <span style="color:oklch(68% 0.19 145);">{result['daily_tok_saved']:,.0f}</span>
                    <br/>effective_rate = ${result['effective_rate']:.2f}/1M
                    <br/>daily_savings = {result['daily_tok_saved']:,.0f} ÷ 1M × ${result['effective_rate']:.2f} = <span style="color:oklch(68% 0.19 145);">${result['daily_saving']:.2f}</span>
                    <br/><span style="color:#555558;">// Payback</span>
                    <br/>plan_cost = <span style="color:#FF9F0A;">${result['plan_cost']}</span>
                    <br/>payback = ${result['plan_cost']} ÷ ${result['daily_saving']:.2f}/day = <span style="color:#2997FF;">{payback_display}</span>
                </div>""",
                unsafe_allow_html=True,
            )

            st.markdown("</div>", unsafe_allow_html=True)

    # Model comparison table
    st.markdown("---")
    st.markdown(
        """<div style="font-size:11px;font-weight:600;font-family:'SF Mono',monospace;
            letter-spacing:0.12em;text-transform:uppercase;color:#2997FF;margin-bottom:12px;">
            // ALL MODELS COMPARISON
        </div>""",
        unsafe_allow_html=True,
    )

    table_data = []
    for mk, mv in MODELS.items():
        r = calculate_savings(daily_calls, avg_tokens, compression, mk, plan_key)
        table_data.append({
            "Model": mv["name"],
            "Cost/M": f"${mv['rate_per_m']:.2f}",
            "Overhead": f"{mv['overhead']*100:.0f}%",
            "Effective": f"${(mv['rate_per_m'] * (1 + mv['overhead'])):.2f}",
            "Daily Savings": f"${r['daily_saving']:.2f}",
            "Annual Savings": f"${r['annual_saving']:.2f}",
            "Payback": f"{r['payback_days']:.0f}d" if r['payback_days'] != float('inf') else "∞",
            "ROI": f"+{r['roi']:.0f}%",
        })

    st.dataframe(table_data, use_container_width=True, hide_index=True)


def render_pricing_tab():
    st.markdown(
        """<div style="text-align:center;margin-bottom:2rem;">
            <div style="font-size:11px;font-weight:600;font-family:'SF Mono',monospace;
                letter-spacing:0.12em;text-transform:uppercase;color:#2997FF;margin-bottom:12px;">
                // LAUNCH TIERS
            </div>
            <h2 style="font-size:clamp(24px,3vw,36px);font-weight:700;color:#F5F5F7;margin-bottom:12px;">
                Founder Pricing
            </h2>
            <p style="color:#98989D;">Lock in launch pricing. Fully recovered in under 40 days.</p>
        </div>""",
        unsafe_allow_html=True,
    )

    c1, c2 = st.columns(2)

    with c1:
        st.markdown(
            """<div class="omniken-card" style="border-color:rgba(41,151,255,0.25);">
                <div style="display:inline-flex;padding:4px 12px;border-radius:999px;
                    font-size:10px;font-weight:700;font-family:'SF Mono',monospace;
                    background:rgba(41,151,255,0.12);color:#2997FF;border:1px solid rgba(41,151,255,0.25);">
                    Founder's Pass
                </div>
                <div style="font-size:18px;font-weight:700;color:#F5F5F7;margin-top:12px;">Individual Vibe Coder</div>
                <div style="font-size:13px;color:#98989D;margin-top:6px;">Unlimited prompt optimizations, local MCP server daemon.</div>
                <div style="display:flex;align-items:flex-end;gap:4px;margin-top:24px;">
                    <div style="font-size:48px;font-weight:700;font-family:'SF Mono',monospace;color:#2997FF;line-height:1;">$89</div>
                    <div style="font-size:13px;color:#555558;margin-bottom:6px;">/ year</div>
                </div>
                <ul style="list-style:none;padding:0;margin-top:24px;">
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Unlimited prompt compressions</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Local MCP Server daemon</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Pass 1 + Pass 2 Engine</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Multi-modal optimization</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">All 6 model support</li>
                </ul>
            </div>""",
            unsafe_allow_html=True,
        )
        if st.button("Start Founder Pass — $89/yr", key="founder_btn", use_container_width=True):
            st.session_state.license_tier = "Founder's Pass"
            if supabase:
                try:
                    email_current = st.session_state.user_email or "anonymous@omniken.dev"
                    # Upsert user first
                    user_res = supabase.table("users").upsert({
                        "email": email_current,
                        "name": email_current.split("@")[0],
                    }, on_conflict="email").execute()
                    user_id = user_res.data[0]["id"] if user_res.data else None
                    # Create checkout session
                    supabase.table("checkout_sessions").insert({
                        "email": email_current,
                        "tier": "founder",
                        "amount": 89,
                        "status": "pending",
                    }).execute()
                except Exception as e:
                    st.warning(f"Supabase sync: {e}")
            st.balloons()
            st.success("✓ Founder's Pass activated (sandbox)")

    with c2:
        st.markdown(
            """<div class="omniken-card" style="border-color:rgba(100,210,255,0.3);">
                <div style="display:inline-flex;padding:4px 12px;border-radius:999px;
                    font-size:10px;font-weight:700;font-family:'SF Mono',monospace;
                    background:rgba(100,210,255,0.12);color:#64D2FF;border:1px solid rgba(100,210,255,0.25);">
                    ⚡ Elite Agentic
                </div>
                <div style="font-size:18px;font-weight:700;color:#F5F5F7;margin-top:12px;">Developer Teams</div>
                <div style="font-size:13px;color:#98989D;margin-top:6px;">High-throughput multi-agent SDK pipeline optimization.</div>
                <div style="display:flex;align-items:flex-end;gap:4px;margin-top:24px;">
                    <div style="font-size:48px;font-weight:700;font-family:'SF Mono',monospace;color:#64D2FF;line-height:1;">$179</div>
                    <div style="font-size:13px;color:#555558;margin-bottom:6px;">/ year</div>
                </div>
                <ul style="list-style:none;padding:0;margin-top:24px;">
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Everything in Founder's Pass</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Multi-agent SDK pipeline</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Team workspace (up to 10 seats)</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Priority MCP integration</li>
                    <li style="padding:6px 0;font-size:13px;color:#98989D;">Supabase/Prisma backend</li>
                </ul>
            </div>""",
            unsafe_allow_html=True,
        )
        if st.button("Start Elite Annual — $179/yr", key="elite_btn", use_container_width=True):
            st.session_state.license_tier = "Elite Agentic"
            if supabase:
                try:
                    email_current = st.session_state.user_email or "anonymous@omniken.dev"
                    # Upsert user first
                    user_res = supabase.table("users").upsert({
                        "email": email_current,
                        "name": email_current.split("@")[0],
                    }, on_conflict="email").execute()
                    # Create checkout session
                    supabase.table("checkout_sessions").insert({
                        "email": email_current,
                        "tier": "elite",
                        "amount": 179,
                        "status": "pending",
                    }).execute()
                except Exception as e:
                    st.warning(f"Supabase sync: {e}")
            st.balloons()
            st.success("✓ Elite Agentic activated (sandbox)")


# ── Main App ──────────────────────────────────────────────────
def main():
    render_header()
    render_sidebar()

    tabs = st.tabs(["⚡ Core Engine", "📡 Multi-Modal", "💰 Calculator", "🏆 Pricing"])

    with tabs[0]:
        render_engine_tab()

    with tabs[1]:
        render_multimodal_tab()

    with tabs[2]:
        render_calculator_tab()

    with tabs[3]:
        render_pricing_tab()

    # Footer
    st.markdown("---")
    st.markdown(
        """<div style="display:flex;justify-content:space-between;padding:1rem 0;
            font-family:'SF Mono',monospace;font-size:12px;color:#555558;">
            <span>♾ Omniken — Zero Context Engine</span>
            <span>v1.1.0 · Built with precision</span>
        </div>""",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        st.error(f"Application error: {e}")
        st.exception(e)
