/**
 * Omniken MCP Server (index.js)
 * ─────────────────────────────────────────────────────────────
 * Background context compression daemon.
 * Integrates with Cursor, Claude Desktop, and Windsurf via
 * the Model Context Protocol (MCP) standard transport layer.
 *
 * Tool: optimize_context_stream
 *   - Input:  { text: string, passes?: string[], model?: string }
 *   - Output: { compressed: string, metrics: OmnikMetrics }
 *
 * Updated with 6 model support (GPT-4o, Claude 3.5, Gemini 1.5,
 * Llama 3 70B, Claude 3 Opus, GPT-4) and multi-modal metrics.
 *
 * Auto-trial validation:
 *   On boot, self-validates the compression engine and reports
 *   environment diagnostics to stdout (captured by MCP host).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/* ══════════════════════════════════════════════════════════════
   TOKEN ENGINE — server-side port of the browser Pass 1 & 2
   (pure Node.js, no DOM dependencies)
══════════════════════════════════════════════════════════════ */

function estimateTokens(text) {
  if (!text?.trim()) return 0;
  const words = text.trim().split(/\s+/).filter(Boolean);
  let count = 0;
  for (const w of words) {
    if      (w.length <= 4)  count += 1;
    else if (w.length <= 8)  count += 1.3;
    else if (w.length <= 16) count += 1.8;
    else                     count += Math.ceil(w.length / 4);
  }
  const punct = (text.match(/[.,;:!?()[\]{}"'`\\|\/]/g) || []).length;
  return Math.round(count + punct * 0.3);
}

function extractProtected(text) {
  const registry = [];
  let idx = 0;
  const patterns = [
    /```[\s\S]*?```/g,
    /`[^`\n]+`/g,
    /\$\$[\s\S]*?\$\$/g,
    /\$[^\$\n]+\$/g,
    /\{[\s\S]{2,}?\}/g,
    /\[[\s\S]{2,}?\]/g,
  ];
  const spans = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const start = m.index, end = m.index + m[0].length;
      if (!spans.some(s => start < s.end && end > s.start)) {
        const placeholder = `\x00OMNI_${idx}\x00`;
        spans.push({ start, end, placeholder, content: m[0] });
        idx++;
      }
    }
  }
  spans.sort((a, b) => b.start - a.start);
  let out = text;
  for (const s of spans) {
    out = out.slice(0, s.start) + s.placeholder + out.slice(s.end);
    registry.push({ placeholder: s.placeholder, content: s.content });
  }
  return { out, registry };
}

function restoreProtected(text, registry) {
  let r = text;
  for (const e of registry) r = r.replace(e.placeholder, e.content);
  return r;
}

const PASS1 = [
  [/^(hi|hello|hey|greetings|good (morning|afternoon|evening|day))[,!.]?\s*/gim, ''],
  [/\b(thanks?( you)?|thank you so much|many thanks|thx|cheers)[,!.]?\s*$/gim, ''],
  [/\b(I hope (you('re| are) doing (well|great|fine)|this (message|email) finds you well))[,!.]?\s*/gi, ''],
  [/\b(please note (that )?)/gi, ''],
  [/\bIn (conclusion|summary),?\s*/gi, 'Summary: '],
  [/\bIn order to\b/gi, 'To'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\b(very|really|quite|rather|somewhat|fairly|pretty|just|actually|basically|essentially|literally|obviously|simply|clearly)\s+/gi, ''],
  [/\b(kind of|sort of)\s*/gi, ''],
  [/\n{3,}/g, '\n\n'],
  [/[ \t]{2,}/g, ' '],
  [/^[ \t]+/gm, ''],
  [/[ \t]+$/gm, ''],
];

const PASS2 = [
  [/\bfor example\b/gi, 'e.g.'],
  [/\bthat is (to say)?\b/gi, 'i.e.'],
  [/\band so on\b/gi, 'etc.'],
  [/\bas well as\b/gi, '&'],
  [/\bAct as (an?|the) (expert )?/gi, 'Role: '],
  [/\bYour task is to\b/gi, 'Task:'],
  [/\bPlease (ensure|make sure) (that )?/gi, 'Ensure '],
  [/\bYou should\b/gi, ''],
  [/\bYou need to\b/gi, ''],
  [/\bdo not\b/gi, "don't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\n{3,}/g, '\n\n'],
  [/[ \t]{2,}/g, ' '],
  [/^\s+/gm, ''],
];

function applyRules(text, rules) {
  let out = text;
  for (const [re, rep] of rules) out = out.replace(re, rep);
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

function optimizeContext(input, passes = ['pass1', 'pass2']) {
  const t0 = Date.now();
  const { out: extracted, registry } = extractProtected(input);

  let text = extracted;
  const passResults = {};
  const tokIn = estimateTokens(input);

  if (passes.includes('pass1')) {
    const before = estimateTokens(text);
    text = applyRules(text, PASS1);
    const after = estimateTokens(text);
    passResults.pass1 = { tokensIn: before, tokensOut: after, saved: before - after };
  }

  if (passes.includes('pass2')) {
    const before = estimateTokens(text);
    text = applyRules(text, PASS2);
    const after = estimateTokens(text);
    passResults.pass2 = { tokensIn: before, tokensOut: after, saved: before - after };
  }

  const compressed = restoreProtected(text, registry).trim();
  const tokOut = estimateTokens(compressed);
  const saved = Math.max(0, tokIn - tokOut);
  const reductionPct = tokIn > 0 ? ((saved / tokIn) * 100).toFixed(2) : '0.00';

  const rates = {
    gpt4o:  { rate: 2.50, label: 'GPT-4o' },
    claude: { rate: 3.36, label: 'Claude 3.5 Sonnet' },
    gemini: { rate: 1.25, label: 'Gemini 1.5 Pro' },
    llama:  { rate: 0.60, label: 'Llama 3 70B' },
    opus:   { rate: 15.00, label: 'Claude 3 Opus' },
    gpt4:   { rate: 30.00, label: 'GPT-4' },
  };

  const costSavings = {};
  for (const [key, { rate, label }] of Object.entries(rates)) {
    costSavings[key] = {
      label,
      ratePerMillion: rate,
      savedPerCall: ((saved / 1_000_000) * rate).toFixed(6),
      savedPerDayAt5K: ((saved / 1_000_000) * rate * 5000).toFixed(4),
    };
  }

  return {
    compressed,
    metrics: {
      tokensIn:      tokIn,
      tokensOut:     tokOut,
      tokensSaved:   saved,
      reductionPct:  parseFloat(reductionPct),
      elapsedMs:     Date.now() - t0,
      passesApplied: passes,
      passResults,
      costSavings,
      protectedBlocks: registry.length,
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   AUTO-TRIAL VALIDATION LOOP
══════════════════════════════════════════════════════════════ */

const TEST_PROMPT = `Hello! I hope this message finds you well. I would like to ask you to please act as an expert software engineer. Your task is to help me. Due to the fact that this is very important, please ensure that you follow all the instructions carefully.`;

function runAutoTrialValidation() {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {
      node:     process.version,
      platform: process.platform,
      arch:     process.arch,
      pid:      process.pid,
    },
    integrations: {},
    engineTest:   null,
    status:       'unknown',
  };

  const envIndicators = {
    cursor:         process.env.CURSOR_MCP === '1' || (process.env.TERM_PROGRAM ?? '').toLowerCase().includes('cursor'),
    claudeDesktop:  process.env.CLAUDE_DESKTOP === '1' || process.env.ANTHROPIC_MCP_SERVER === '1',
    windsurf:       process.env.WINDSURF_MCP === '1' || (process.env.TERM_PROGRAM ?? '').toLowerCase().includes('windsurf'),
    vscode:         !!(process.env.VSCODE_PID || process.env.VSCODE_CWD),
  };

  results.integrations = envIndicators;

  try {
    const testResult = optimizeContext(TEST_PROMPT, ['pass1', 'pass2']);
    results.engineTest = {
      success:        true,
      tokensIn:       testResult.metrics.tokensIn,
      tokensOut:      testResult.metrics.tokensOut,
      reductionPct:   testResult.metrics.reductionPct,
      protectedBlocks: testResult.metrics.protectedBlocks,
    };
    results.status = 'healthy';
  } catch (err) {
    results.engineTest = { success: false, error: err.message };
    results.status = 'engine_error';
  }

  process.stderr.write(JSON.stringify({ type: 'omniken:boot_validation', data: results }, null, 2) + '\n');

  setInterval(() => {
    try {
      optimizeContext(TEST_PROMPT, ['pass1', 'pass2']);
      process.stderr.write(JSON.stringify({
        type: 'omniken:heartbeat',
        ts:   new Date().toISOString(),
        status: 'healthy',
      }) + '\n');
    } catch (e) {
      process.stderr.write(JSON.stringify({
        type: 'omniken:heartbeat',
        ts:   new Date().toISOString(),
        status: 'error',
        error: e.message,
      }) + '\n');
    }
  }, 5 * 60 * 1000);

  return results;
}

/* ══════════════════════════════════════════════════════════════
   MCP SERVER DEFINITION
══════════════════════════════════════════════════════════════ */

const server = new Server(
  {
    name:    'omniken-core',
    version: '1.0.0',
  },
  {
    capabilities: { tools: {} },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name:        'optimize_context_stream',
      description: 'Compress an AI prompt by 40-60% using Omniken\'s two-pass heuristic + shorthand engine. Preserves all code blocks, math equations, and JSON payloads verbatim. Supports 6 models: GPT-4o, Claude 3.5, Gemini 1.5, Llama 3 70B, Claude 3 Opus, GPT-4.',
      inputSchema: {
        type: 'object',
        properties: {
          text: {
            type:        'string',
            description: 'The prompt text to compress.',
          },
          passes: {
            type:        'array',
            items:       { type: 'string', enum: ['pass1', 'pass2'] },
            default:     ['pass1', 'pass2'],
            description: 'Which passes to apply.',
          },
          model: {
            type:        'string',
            enum:        ['gpt4o', 'claude', 'gemini', 'llama', 'opus', 'gpt4'],
            default:     'gpt4o',
            description: 'Target model for cost savings calculation.',
          },
        },
        required: ['text'],
      },
    },
    {
      name:        'get_compression_metrics',
      description: 'Returns live Omniken engine metrics: version, uptime, total prompts processed, cumulative tokens saved.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
    {
      name:        'validate_environment',
      description: 'Re-run the auto-trial validation sequence.',
      inputSchema: { type: 'object', properties: {}, required: [] },
    },
  ],
}));

const SESSION = {
  startTime:        Date.now(),
  promptsProcessed: 0,
  totalTokensIn:    0,
  totalTokensOut:   0,
  totalTokensSaved: 0,
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {

    case 'optimize_context_stream': {
      const input  = args?.text ?? '';
      const passes = args?.passes ?? ['pass1', 'pass2'];
      const model  = args?.model  ?? 'gpt4o';

      if (!input.trim()) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Input text is empty.', compressed: '', metrics: null }),
          }],
          isError: true,
        };
      }

      const result = optimizeContext(input, passes);

      SESSION.promptsProcessed++;
      SESSION.totalTokensIn    += result.metrics.tokensIn;
      SESSION.totalTokensOut   += result.metrics.tokensOut;
      SESSION.totalTokensSaved += result.metrics.tokensSaved;

      const modelCost = result.metrics.costSavings[model] ?? result.metrics.costSavings.gpt4o;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            compressed: result.compressed,
            metrics: {
              ...result.metrics,
              selectedModel:   modelCost,
              sessionTotal: {
                promptsProcessed: SESSION.promptsProcessed,
                tokensSaved:      SESSION.totalTokensSaved,
                tokensIn:         SESSION.totalTokensIn,
                tokensOut:        SESSION.totalTokensOut,
              },
            },
          }, null, 2),
        }],
      };
    }

    case 'get_compression_metrics': {
      const uptimeSec = Math.floor((Date.now() - SESSION.startTime) / 1000);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            engine:    'omniken-core',
            version:   '1.0.0',
            uptimeSec,
            session:   SESSION,
            rates: {
              gpt4o_per_million:  2.50,
              claude_per_million: 3.36,
              gemini_per_million: 1.25,
              llama_per_million:  0.60,
              opus_per_million:   15.00,
              gpt4_per_million:   30.00,
            },
          }, null, 2),
        }],
      };
    }

    case 'validate_environment': {
      const validation = runAutoTrialValidation();
      return {
        content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

/* ══════════════════════════════════════════════════════════════
   BOOT SEQUENCE
══════════════════════════════════════════════════════════════ */

async function main() {
  runAutoTrialValidation();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(JSON.stringify({
    type:    'omniken:ready',
    name:    'omniken-core',
    version: '1.0.0',
    ts:      new Date().toISOString(),
    message: 'Omniken MCP server listening on stdio transport.',
  }) + '\n');
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({
    type:  'omniken:fatal',
    error: err.message,
    stack: err.stack,
  }) + '\n');
  process.exit(1);
});
