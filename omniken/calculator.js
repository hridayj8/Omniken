'use strict';

const MODELS = {
  gpt4o:  { name: 'GPT-4o',        ratePerM: 2.50, overhead: 0.00 },
  claude: { name: 'Claude 3.5',     ratePerM: 3.00, overhead: 0.12 },
  gemini: { name: 'Gemini 1.5 Pro', ratePerM: 1.25, overhead: 0.00 },
  llama:  { name: 'Llama 3 70B',    ratePerM: 0.60, overhead: 0.00 },
  opus:   { name: 'Claude 3 Opus',  ratePerM: 15.00, overhead: 0.00 },
  gpt4:   { name: 'GPT-4',          ratePerM: 30.00, overhead: 0.00 },
};

const PLANS = {
  founder: { name: "Founder's Pass", price: 89 },
  elite:   { name: 'Elite Agentic',   price: 179 },
};

let selectedModel = 'gpt4o';
let selectedPlan  = 'founder';

function effectiveRate(modelKey) {
  const m = MODELS[modelKey];
  return m.ratePerM * (1 + m.overhead);
}

function calculateSavings() {
  const dailyCalls      = parseInt(document.getElementById('dailyCalls').value, 10);
  const avgTokens       = parseInt(document.getElementById('avgTokens').value, 10);
  const compressionRate = parseInt(document.getElementById('compressionRate').value, 10) / 100;
  const planCost        = PLANS[selectedPlan].price;

  const tokSavedPerCall = avgTokens * compressionRate;
  const dailyTokSaved = dailyCalls * tokSavedPerCall;

  const results = {};
  let maxSaving = 0;

  for (const [key, model] of Object.entries(MODELS)) {
    const rate = effectiveRate(key);
    const dailySaving  = (dailyTokSaved / 1_000_000) * rate;
    const annualSaving = dailySaving * 365;
    results[key] = { dailySaving, annualSaving, rate };
    if (dailySaving > maxSaving) maxSaving = dailySaving;
  }

  const primaryDailySaving = results[selectedModel].dailySaving;
  const paybackDays = primaryDailySaving > 0 ? planCost / primaryDailySaving : Infinity;
  const annualSaving = results[selectedModel].annualSaving;
  const roi = annualSaving > 0 ? ((annualSaving - planCost) / planCost * 100) : 0;

  return { dailyCalls, avgTokens, compressionRate, planCost, results, paybackDays, annualSaving, roi, primaryDailySaving, tokSavedPerCall, dailyTokSaved, maxSaving };
}

function fmtCurrency(n, decimals = 2) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(decimals);
}

function fmtNum(n) {
  return n.toLocaleString('en-US');
}

function fmtTokens(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function updateCalculator() {
  const dailyVal  = parseInt(document.getElementById('dailyCalls').value, 10);
  const tokenVal  = parseInt(document.getElementById('avgTokens').value, 10);
  const compVal   = parseInt(document.getElementById('compressionRate').value, 10);

  document.getElementById('dailyCallsVal').textContent     = fmtNum(dailyVal);
  document.getElementById('avgTokensVal').textContent      = fmtNum(tokenVal);
  document.getElementById('compressionRateVal').textContent = compVal + '%';

  const calc = calculateSavings();

  const modelMap = { gpt4o: 'gpt4o', claude: 'claude', gemini: 'gemini', llama: 'llama', opus: 'opus', gpt4: 'gpt4' };
  for (const key of Object.keys(MODELS)) {
    const res = calc.results[key];
    const pct = calc.maxSaving > 0 ? (res.dailySaving / calc.maxSaving) * 100 : 0;

    const bar = document.getElementById('bar-' + key);
    const amt = document.getElementById('amt-' + key);
    if (bar) bar.style.width = Math.max(2, pct) + '%';
    if (amt) amt.textContent = fmtCurrency(res.dailySaving) + '/day';
  }

  const paybackEl  = document.getElementById('paybackDays');
  const paybackSub = document.getElementById('paybackSub');
  const annualEl   = document.getElementById('annualSavings');
  const roiEl      = document.getElementById('roiLabel');

  if (calc.paybackDays === Infinity) {
    paybackEl.textContent  = '∞ days';
    paybackSub.textContent = 'Increase usage to see payback';
  } else {
    const days = Math.ceil(calc.paybackDays);
    paybackEl.textContent  = days + ' days';

    const planLabel = PLANS[selectedPlan].name;
    const modelLabel = MODELS[selectedModel].name;
    paybackSub.textContent = `${planLabel} (${fmtCurrency(calc.planCost, 0)}) on ${modelLabel}`;

    const heroStat = document.getElementById('stat-payback');
    if (heroStat) heroStat.textContent = '<' + Math.max(1, days);
  }

  annualEl.textContent = fmtCurrency(calc.annualSaving, 0);
  roiEl.textContent    = 'ROI: ' + (calc.roi > 0 ? '+' + calc.roi.toFixed(0) + '%' : '—');

  renderMathProof(calc);
  updateModelTable(calc);
}

function renderMathProof(calc) {
  const el = document.getElementById('mathLines');
  if (!el) return;

  const rate = effectiveRate(selectedModel);
  const modelName = MODELS[selectedModel].name;
  const planPrice = PLANS[selectedPlan].price;
  const cr = (calc.compressionRate * 100).toFixed(0);

  el.innerHTML = `
<span style="color:var(--c-text-muted)">// Per-call token math</span>
tokens_per_call     = ${fmtNum(calc.avgTokens)}
compression_rate    = ${cr}%
tokens_saved/call   = ${fmtNum(calc.avgTokens)} × ${cr}% = <span style="color:var(--c-green)">${fmtTokens(calc.tokSavedPerCall)}</span>

<span style="color:var(--c-text-muted)">// Daily aggregate (${fmtNum(calc.dailyCalls)} calls)</span>
daily_tokens_saved  = ${fmtTokens(calc.tokSavedPerCall)} × ${fmtNum(calc.dailyCalls)} = <span style="color:var(--c-green)">${fmtTokens(calc.dailyTokSaved)}</span>

<span style="color:var(--c-text-muted)">// ${modelName} @ $${rate.toFixed(2)}/1M tokens</span>
daily_savings       = ${fmtTokens(calc.dailyTokSaved)} ÷ 1M × $${rate.toFixed(2)} = <span style="color:var(--c-green)">${fmtCurrency(calc.primaryDailySaving)}/day</span>
annual_savings      = ${fmtCurrency(calc.primaryDailySaving)}/day × 365 = <span style="color:var(--c-green)">${fmtCurrency(calc.annualSaving, 0)}/yr</span>

<span style="color:var(--c-text-muted)">// Payback calculation</span>
plan_cost           = <span style="color:var(--c-amber)">$${planPrice}</span>
payback             = $${planPrice} ÷ ${fmtCurrency(calc.primaryDailySaving)}/day = <span style="color:var(--c-accent-1)">${calc.paybackDays === Infinity ? '∞' : Math.ceil(calc.paybackDays)} days</span>
net_annual_profit   = ${fmtCurrency(calc.annualSaving, 0)} − $${planPrice} = <span style="color:var(--c-green)">${fmtCurrency(calc.annualSaving - planPrice, 0)}</span>
  `.trim();
}

function updateModelTable(calc) {
  const founderPrice = PLANS.founder.price;

  for (const [key, res] of Object.entries(calc.results)) {
    const savingsEl = document.getElementById(key + '-savings');
    const roiEl = document.getElementById(key + '-roi');
    if (savingsEl) savingsEl.textContent = fmtCurrency(res.annualSaving / 1000, 0) + 'K';
    if (roiEl) roiEl.textContent = '+' + (((res.annualSaving - founderPrice) / founderPrice) * 100).toFixed(0) + '%';
  }
}

function selectModel(key) {
  selectedModel = key;
  for (const k of Object.keys(MODELS)) {
    const chip = document.getElementById('chip-' + k);
    if (chip) {
      chip.classList.toggle('active', k === key);
      chip.setAttribute('aria-pressed', k === key ? 'true' : 'false');
    }
  }
  updateCalculator();
}

function selectPlan(key) {
  selectedPlan = key;
  document.getElementById('chip-founder-plan')?.classList.toggle('active', key === 'founder');
  document.getElementById('chip-elite-plan')?.classList.toggle('active', key === 'elite');
  document.getElementById('chip-founder-plan')?.setAttribute('aria-pressed', key === 'founder' ? 'true' : 'false');
  document.getElementById('chip-elite-plan')?.setAttribute('aria-pressed', key === 'elite' ? 'true' : 'false');
  updateCalculator();
}
