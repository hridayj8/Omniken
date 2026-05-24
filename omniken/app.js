'use strict';

function estimateTokens(text) {
  if (!text || text.trim() === '') return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  let tokenCount = 0;
  for (const word of words) {
    if (word.length <= 4)      tokenCount += 1;
    else if (word.length <= 8) tokenCount += 1.3;
    else if (word.length <= 16) tokenCount += 1.8;
    else                        tokenCount += Math.ceil(word.length / 4);
  }
  const punctMatches = text.match(/[.,;:!?()[\]{}"'`\\|\/]/g);
  if (punctMatches) tokenCount += punctMatches.length * 0.3;
  return Math.round(tokenCount);
}

/* ── Multi-modal cost estimation ─────────────────────────── */
function estimateImageTokens(width, height, detail = 'auto') {
  if (detail === 'low') return 85;
  const tiles = Math.ceil(Math.min(width, 2048) / 512) * Math.ceil(Math.min(height, 2048) / 512);
  return 85 + tiles * 170;
}

function estimateAudioTokens(durationSec) {
  return Math.round(durationSec * 12.5);
}

function estimateVideoTokens(durationSec, fps = 24) {
  const frames = durationSec * fps;
  const sampleFrames = Math.min(frames, 150);
  return estimateImageTokens(1920, 1080) * sampleFrames;
}

const MULTIMODAL_RATES = {
  text:  { rate: 2.50, cache90pct: 0.25, label: 'Text' },
  image: { rate: 7.50, cache90pct: 0.75, label: 'Image' },
  audio: { rate: 3.75, cache90pct: 0.38, label: 'Audio' },
  video: { rate: 12.00, cache90pct: 1.20, label: 'Video' },
};

/* ── Protected Block Registry ────────────────────────────── */
function extractProtectedBlocks(text) {
  const registry = [];
  let idx = 0;

  const patterns = [
    { regex: /```[\s\S]*?```/g, type: 'code_fence' },
    { regex: /`[^`\n]+`/g, type: 'inline_code' },
    { regex: /\$\$[\s\S]*?\$\$/g, type: 'math_block' },
    { regex: /\$[^\$\n]+\$/g, type: 'math_inline' },
    { regex: /\{[\s\S]{2,}?\}/g, type: 'json' },
    { regex: /\[[\s\S]{2,}?\]/g, type: 'json_array' },
  ];

  const spans = [];

  for (const { regex, type } of patterns) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text)) !== null) {
      const start = m.index;
      const end = m.index + m[0].length;
      const overlaps = spans.some(s => start < s.end && end > s.start);
      if (!overlaps) {
        const placeholder = `\x00OMNI_PROTECTED_${idx}\x00`;
        spans.push({ start, end, placeholder, content: m[0], type });
        idx++;
      }
    }
  }

  spans.sort((a, b) => b.start - a.start);

  let processed = text;
  for (const span of spans) {
    processed = processed.slice(0, span.start) + span.placeholder + processed.slice(span.end);
    registry.push({ placeholder: span.placeholder, content: span.content, type: span.type });
  }

  return { processed, registry };
}

function restoreProtectedBlocks(text, registry) {
  let restored = text;
  for (const entry of registry) {
    restored = restored.replace(entry.placeholder, entry.content);
  }
  return restored;
}

/* ── Multi-modal optimization pipeline ───────────────────── */
function optimizeMultiModal(inputs) {
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCostWithoutCache = 0;
  let totalCostWithCache = 0;
  const breakdown = [];

  for (const { type, content, params } of inputs) {
    let tokensIn = 0;
    let tokensOut = 0;
    let costWithoutCache = 0;
    let costWithCache = 0;

    if (type === 'text') {
      tokensIn = estimateTokens(content);
      const { output } = optimizeText(content, ['pass1', 'pass2']);
      tokensOut = estimateTokens(output);
      costWithoutCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.text.rate;
      costWithCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.text.cache90pct;
      breakdown.push({ type: 'text', tokensIn, tokensOut, costWithoutCache, costWithCache, output });
    } else if (type === 'image') {
      tokensIn = estimateImageTokens(params.width, params.height, params.detail);
      tokensOut = tokensIn;
      costWithoutCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.image.rate;
      costWithCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.image.cache90pct;
      breakdown.push({ type: 'image', tokensIn, tokensOut, costWithoutCache, costWithCache });
    } else if (type === 'audio') {
      tokensIn = estimateAudioTokens(params.durationSec);
      tokensOut = tokensIn;
      costWithoutCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.audio.rate;
      costWithCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.audio.cache90pct;
      breakdown.push({ type: 'audio', tokensIn, tokensOut, costWithoutCache, costWithCache });
    } else if (type === 'video') {
      tokensIn = estimateVideoTokens(params.durationSec, params.fps);
      tokensOut = tokensIn;
      costWithoutCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.video.rate;
      costWithCache = (tokensIn / 1_000_000) * MULTIMODAL_RATES.video.cache90pct;
      breakdown.push({ type: 'video', tokensIn, tokensOut, costWithoutCache, costWithCache });
    }

    totalTokensIn += tokensIn;
    totalTokensOut += tokensOut;
    totalCostWithoutCache += costWithoutCache;
    totalCostWithCache += costWithCache;
  }

  const reductionPct = totalTokensIn > 0 ? ((totalTokensIn - totalTokensOut) / totalTokensIn * 100).toFixed(1) : '0.0';

  return { totalTokensIn, totalTokensOut, reductionPct, totalCostWithoutCache, totalCostWithCache, breakdown };
}

/* ── Pass 1: Heuristic Fluff Stripper ────────────────────── */
const PASS1_RULES = [
  { pattern: /^(hi|hello|hey|greetings|good (morning|afternoon|evening|day))[,!.]?\s*/gim, replacement: '' },
  { pattern: /\b(thanks?( you)?|thank you so much|many thanks|thx|cheers)[,!.]?\s*$/gim, replacement: '' },
  { pattern: /\b(best regards?|sincerely|yours? truly|warm regards?)[,!.]?\s*$/gim, replacement: '' },
  { pattern: /\b(I hope (you('re| are) doing (well|great|fine)|this (message|email) finds you well))[,!.]?\s*/gi, replacement: '' },
  { pattern: /\b(absolutely[,!]?\s*|certainly[,!]?\s*|of course[,!]?\s*|sure[,!]?\s*)(I (can|will|would|am happy to))/gi, replacement: 'I $3' },
  { pattern: /\b(I'?m (happy|glad|pleased|delighted) to (help|assist)[.!]?\s*)/gi, replacement: '' },
  { pattern: /\b(great (question|point|idea)[!.]?\s*)/gi, replacement: '' },
  { pattern: /\b(of course[,!]\s*)/gi, replacement: '' },
  { pattern: /\b(certainly[,!]\s*)/gi, replacement: '' },
  { pattern: /\b(absolutely[,!]\s*)/gi, replacement: '' },
  { pattern: /\bIn (conclusion|summary|closing),?\s*/gi, replacement: 'Summary: ' },
  { pattern: /\bIt is (important|worth noting|crucial|essential) (to note |to mention |that )?/gi, replacement: '' },
  { pattern: /\bPlease note (that )?/gi, replacement: '' },
  { pattern: /\bAs (I|we) (mentioned|said|noted|discussed) (above|earlier|previously|before),?\s*/gi, replacement: '' },
  { pattern: /\b(First and foremost|First of all|To begin with|To start with),?\s*/gi, replacement: '' },
  { pattern: /\bIn order to\b/gi, replacement: 'To' },
  { pattern: /\bdue to the fact that\b/gi, replacement: 'because' },
  { pattern: /\bat this point in time\b/gi, replacement: 'now' },
  { pattern: /\bin the event that\b/gi, replacement: 'if' },
  { pattern: /\bfor the purpose of\b/gi, replacement: 'to' },
  { pattern: /\bwith regard to\b/gi, replacement: 'regarding' },
  { pattern: /\bwith respect to\b/gi, replacement: 'regarding' },
  { pattern: /\bon the other hand\b/gi, replacement: 'conversely' },
  { pattern: /\bthe fact that\b/gi, replacement: 'that' },
  { pattern: /\bit should be noted that\b/gi, replacement: '' },
  { pattern: /\bit is worth mentioning that\b/gi, replacement: '' },
  { pattern: /\bI would like to\b/gi, replacement: 'I want to' },
  { pattern: /\bI am going to\b/gi, replacement: "I'll" },
  { pattern: /\bwe are going to\b/gi, replacement: "we'll" },
  { pattern: /\bgoing to\b/gi, replacement: 'will' },
  { pattern: /\bwould like to\b/gi, replacement: 'want to' },
  { pattern: /\b(very|really|quite|rather|somewhat|fairly|pretty|just|actually|basically|essentially|literally|obviously|simply|clearly)\s+/gi, replacement: '' },
  { pattern: /\b(kind of|sort of|a bit|a little|to be honest|to be frank|frankly speaking)\s*/gi, replacement: '' },
  { pattern: /\byou know[,\s]/gi, replacement: '' },
  { pattern: /\bI mean[,\s]/gi, replacement: '' },
  { pattern: /\n{3,}/g, replacement: '\n\n' },
  { pattern: /[ \t]{2,}/g, replacement: ' ' },
  { pattern: /^[ \t]+/gm, replacement: '' },
  { pattern: /[ \t]+$/gm, replacement: '' },
];

function runPass1(text) {
  let out = text;
  for (const rule of PASS1_RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

/* ── Pass 2: Semantic Shorthand Packer ───────────────────── */
const PASS2_RULES = [
  { pattern: /\bPlease (ensure|make sure) (that )?/gi, replacement: 'Ensure ' },
  { pattern: /\bMake sure (that )?/gi, replacement: 'Ensure ' },
  { pattern: /\bYou should\b/gi, replacement: '' },
  { pattern: /\bYou need to\b/gi, replacement: '' },
  { pattern: /\bYou must\b/gi, replacement: 'Must' },
  { pattern: /\bWhat you need to do is\b/gi, replacement: '' },
  { pattern: /\bfor example\b/gi, replacement: 'e.g.' },
  { pattern: /\bthat is (to say)?\b/gi, replacement: 'i.e.' },
  { pattern: /\band so on\b/gi, replacement: 'etc.' },
  { pattern: /\band so forth\b/gi, replacement: 'etc.' },
  { pattern: /\bas well as\b/gi, replacement: '&' },
  { pattern: /\band also\b/gi, replacement: '&' },
  { pattern: /\bbetween\b/gi, replacement: 'btw' },
  { pattern: /\bwithout\b/gi, replacement: 'w/o' },
  { pattern: /\bwith\b/gi, replacement: 'w/' },
  { pattern: /\bAct as (an?|the) (expert )?/gi, replacement: 'Role: ' },
  { pattern: /\bYour task is to\b/gi, replacement: 'Task:' },
  { pattern: /\bYour goal is to\b/gi, replacement: 'Goal:' },
  { pattern: /\bYour job is to\b/gi, replacement: 'Job:' },
  { pattern: /\bI want you to\b/gi, replacement: '' },
  { pattern: /\bI need you to\b/gi, replacement: '' },
  { pattern: /\bCan you please\b/gi, replacement: '' },
  { pattern: /\bCould you please\b/gi, replacement: '' },
  { pattern: /\bWould you (please|kindly)?\b/gi, replacement: '' },
  { pattern: /\bThe following (is|are) (a )?(list of |the )?/gi, replacement: '' },
  { pattern: /\bHere (is|are) (a )?(list of |the )?/gi, replacement: '' },
  { pattern: /\bBelow (is|are) (a )?(list of |the )?/gi, replacement: '' },
  { pattern: /\bdo not\b/gi, replacement: "don't" },
  { pattern: /\bcannot\b/gi, replacement: "can't" },
  { pattern: /\bwill not\b/gi, replacement: "won't" },
  { pattern: /\bshould not\b/gi, replacement: "shouldn't" },
  { pattern: /\bmust not\b/gi, replacement: "mustn't" },
  { pattern: /\n{3,}/g, replacement: '\n\n' },
  { pattern: /[ \t]{2,}/g, replacement: ' ' },
  { pattern: /^\s+/gm, replacement: '' },
];

function runPass2(text) {
  let out = text;
  for (const rule of PASS2_RULES) {
    out = out.replace(rule.pattern, rule.replacement);
  }
  out = out.replace(/\n{3,}/g, '\n\n').trim();
  return out;
}

/* ── Main Optimizer Pipeline ─────────────────────────────── */
function optimizeText(input, passes = ['pass1', 'pass2']) {
  const t0 = performance.now();

  const { processed: protected_text, registry } = extractProtectedBlocks(input);

  let result = protected_text;
  const stats = { pass1: null, pass2: null };

  if (passes.includes('pass1')) {
    const before = estimateTokens(result);
    result = runPass1(result);
    const after = estimateTokens(result);
    stats.pass1 = { tokensIn: before, tokensOut: after, reduction: before - after };
  }

  if (passes.includes('pass2')) {
    const before = estimateTokens(result);
    result = runPass2(result);
    const after = estimateTokens(result);
    stats.pass2 = { tokensIn: before, tokensOut: after, reduction: before - after };
  }

  result = restoreProtectedBlocks(result, registry);
  result = result.trim();

  const elapsed = performance.now() - t0;
  return { output: result, stats, elapsed, registry };
}

/* ── UI Integration ──────────────────────────────────────── */
const $ = id => document.getElementById(id);

let gravityActive = false;
let currentModel = 'gpt4o';

const MODEL_RATES = {
  gpt4o:  { rate: 2.50, label: 'GPT-4o', overhead: 0 },
  claude: { rate: 3.00, label: 'Claude 3.5', overhead: 0.12 },
  gemini: { rate: 1.25, label: 'Gemini 1.5 Pro', overhead: 0 },
  llama:  { rate: 0.60, label: 'Llama 3 70B', overhead: 0 },
  opus:   { rate: 15.00, label: 'Claude 3 Opus', overhead: 0 },
  gpt4:   { rate: 30.00, label: 'GPT-4', overhead: 0 },
};

function getEffectiveRate(modelKey) {
  const m = MODEL_RATES[modelKey];
  return m.rate * (1 + m.overhead);
}

function formatNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function updateInputMetrics(text) {
  const tokens = estimateTokens(text);
  const chars  = text.length;
  const words  = text.trim().split(/\s+/).filter(Boolean).length;
  $('inputTokens').textContent = formatNum(tokens);
  $('inputChars').textContent  = formatNum(chars);
  $('inputWords').textContent  = formatNum(words);
}

function updateOutputMetrics(input, output) {
  const tokIn  = estimateTokens(input);
  const tokOut = estimateTokens(output);
  const saved  = Math.max(0, tokIn - tokOut);
  const pct    = tokIn > 0 ? ((saved / tokIn) * 100).toFixed(1) : '0.0';

  const rate = getEffectiveRate(currentModel);
  const costSaved = (saved / 1_000_000) * rate;

  $('outputTokens').textContent = formatNum(tokOut);
  $('savedTokens').textContent  = formatNum(saved);
  $('reductionPct').textContent = pct + '%';
  $('costSaved').textContent    = '$' + costSaved.toFixed(4);

  if (tokIn > 0) $('stat-reduction').textContent = pct + '%';
}

function setPassStatus(pass, active, stats) {
  const dot = $(pass + 'Status');
  const statsEl = $(pass + 'Stats');
  if (active) {
    dot.style.background = pass === 'pass1Status' ? 'var(--c-accent-1)' : 'var(--c-accent-2)';
    dot.style.boxShadow = '0 0 6px currentColor';
    if (stats) {
      statsEl.textContent = `−${formatNum(stats.reduction)} tokens (${stats.tokensIn} → ${stats.tokensOut})`;
    }
  } else {
    dot.style.background = 'var(--c-text-muted)';
    dot.style.boxShadow = 'none';
    statsEl.textContent = 'idle';
  }
}

function runOptimizer() {
  const input = $('inputPrompt').value;
  if (!input.trim()) {
    $('outputPrompt').innerHTML = '<span style="color:var(--c-amber)">⚠ Paste a prompt to optimize.</span>';
    return;
  }

  const btn = $('optimizeBtn');
  btn.textContent = '⚡ Processing...';
  btn.disabled = true;

  setTimeout(() => {
    const { output, stats, elapsed } = optimizeText(input, ['pass1', 'pass2']);

    $('outputPrompt').textContent = output;

    if (stats.pass1) setPassStatus('pass1', true, stats.pass1);
    if (stats.pass2) setPassStatus('pass2', true, stats.pass2);

    updateOutputMetrics(input, output);

    btn.textContent = `⚡ Optimized (${elapsed.toFixed(1)}ms)`;
    btn.disabled = false;

    const tokIn  = estimateTokens(input);
    const tokOut = estimateTokens(output);
    if (tokIn > 0) {
      const actualPct = ((tokIn - tokOut) / tokIn) * 100;
      const slider = $('compressionRate');
      slider.value = Math.round(actualPct);
      $('compressionRateVal').textContent = Math.round(actualPct) + '%';
      updateCalculator();
    }

    setTimeout(() => { btn.textContent = '⚡ Optimize'; }, 2000);
  }, 80);
}

function runPass1Only() {
  const input = $('inputPrompt').value;
  if (!input.trim()) return;

  const { output, stats } = optimizeText(input, ['pass1']);
  $('outputPrompt').textContent = output;

  if (stats.pass1) setPassStatus('pass1', true, stats.pass1);
  setPassStatus('pass2', false, null);

  updateOutputMetrics(input, output);
}

function clearAll() {
  $('inputPrompt').value = '';
  $('outputPrompt').innerHTML = '<span style="color:var(--c-text-muted);font-size:12px;">// Compressed output will appear here...</span>';
  updateInputMetrics('');
  updateOutputMetrics('', '');
  setPassStatus('pass1', false, null);
  setPassStatus('pass2', false, null);
}

function copyOutput() {
  const text = $('outputPrompt').textContent;
  if (!text || text.startsWith('//')) return;
  navigator.clipboard.writeText(text).then(() => {
    const btn = $('copyBtn');
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = '> Copy Output'; }, 2000);
  });
}

const DEMO_PROMPT = `Hello! I hope you are doing well and having a great day! Thank you so much for taking the time to read this prompt.

I would like to ask you to act as a master software engineer. Your task is to help me build a really great web application. I am going to need you to please make sure that you follow all of the instructions below very carefully.

First of all, I want you to know that this is very important to me. In order to complete this task, you will need to do the following things:

1. Please ensure that you write clean and well-documented code
2. Make sure to handle all edge cases appropriately
3. You should implement proper error handling as well

Here is a code example that must be preserved exactly:
\`\`\`python
def optimize_tokens(text: str) -> dict:
    """Compress prompt tokens by 40-60%."""
    tokens_in = count_tokens(text)
    compressed = run_passes(text)
    return {"output": compressed, "reduction": 1 - len(compressed)/len(text)}
\`\`\`

The mathematical formula for our savings calculation is $S = T_i \\cdot r \\cdot C_m$ where $T_i$ is input tokens, $r$ is the reduction rate, and $C_m$ is the cost per million tokens.

Configuration payload (preserve exactly):
{"model": "gpt-4o", "compression_rate": 0.47, "pass1": true, "pass2": true}

It is worth mentioning that the application should basically be able to handle a really large number of requests. Due to the fact that we are dealing with high-throughput scenarios, you should definitely make sure to optimize for performance.

Best regards and thank you once again!`;

function loadDemo() {
  $('inputPrompt').value = DEMO_PROMPT;
  updateInputMetrics(DEMO_PROMPT);
  runOptimizer();
}

function toggleGravity() {
  gravityActive = !gravityActive;
  const sw = $('gravitySwitch');
  const toggle = $('gravityToggle');
  sw.classList.toggle('active', gravityActive);
  toggle.setAttribute('aria-checked', gravityActive);

  if (gravityActive) {
    startPhysics();
    document.getElementById('physics-section').scrollIntoView({ behavior: 'smooth' });
  } else {
    stopPhysics();
  }
}

function togglePhysicsMode() {
  gravityActive = !gravityActive;
  const btn = $('togglePhysicsBtn');
  const statusText = $('physicsStatusText');

  if (gravityActive) {
    startPhysics();
    btn.textContent = '⏸ Deactivate Gravity';
    statusText.textContent = 'Physics: Active';
  } else {
    stopPhysics();
    btn.textContent = '⚡ Activate Gravity';
    statusText.textContent = 'Physics: Inactive';
  }

  const sw = $('gravitySwitch');
  const gravToggle = $('gravityToggle');
  sw.classList.toggle('active', gravityActive);
  gravToggle.setAttribute('aria-checked', gravityActive);
}

function scrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handleCheckout(tier) {
  const modal = $('checkoutModal');
  const title = $('modal-title');
  const desc  = $('modal-desc');
  const body  = $('modal-body');

  const tierData = {
    founder: { name: "Founder's Annual Pass", price: '$89/year', color: 'var(--c-accent-1)' },
    elite:   { name: 'Elite Agentic Annual', price: '$179/year', color: 'var(--c-accent-2)' },
  }[tier];

  title.textContent = '♾ ' + tierData.name;
  desc.textContent  = tierData.price + ' · Billed annually';
  body.innerHTML = `
    <div style="background:rgba(0,0,0,0.5);border:1px solid var(--c-border);border-radius:var(--r-md);padding:20px;font-size:13px;font-family:var(--font-mono);color:var(--c-text-secondary);line-height:2;">
      <div style="color:${tierData.color};font-weight:700;margin-bottom:8px;">OMNIKEN LICENSE ACTIVATION</div>
      <div>Plan: ${tierData.name}</div>
      <div>Price: ${tierData.price}</div>
      <div>Status: <span style="color:var(--c-green);">✓ Session initialized</span></div>
      <div style="margin-top:12px;color:var(--c-text-muted);font-size:11px;">
        Supabase/Prisma checkout ready.<br />
        Connect Stripe to activate payment flow.<br />
        MCP license key will be emailed on confirmation.
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  modal.focus();
}

function closeModal() {
  $('checkoutModal').style.display = 'none';
}

$('checkoutModal').addEventListener('click', (e) => {
  if (e.target === $('checkoutModal')) closeModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

$('inputPrompt').addEventListener('input', (e) => {
  updateInputMetrics(e.target.value);
});

$('inputPrompt').addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runOptimizer();
  }
});

/* ── Flow pulse on optimize ───────────────────────────────── */
document.addEventListener('click', (e) => {
  if (e.target.closest('#optimizeBtn')) {
    const diagram = document.getElementById('flowDiagram');
    if (diagram) {
      diagram.classList.add('flow-flash');
      setTimeout(() => diagram.classList.remove('flow-flash'), 1000);

      const dots = diagram.querySelectorAll('.flow-dot');
      dots.forEach((dot, i) => {
        setTimeout(() => {
          dot.style.fill = 'var(--c-green)';
          setTimeout(() => { dot.style.fill = ''; }, 300);
        }, i * 200);
      });
    }
  }
});

updateCalculator();
