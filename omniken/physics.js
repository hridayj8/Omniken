'use strict';

const GRAVITY       = 0.35;
const DAMPING       = 0.78;
const FRICTION      = 0.99;
const RESTITUTION   = 0.65;
const MAX_PARTICLES = 120;
const SHOCKWAVE_FORCE  = 18;
const SHOCKWAVE_RADIUS = 200;

const INVADER_COLORS = ['#2997FF', '#64D2FF', '#40A9FF', '#F5F5F7', '#FF9F0A', '#FF4646'];

let canvas, ctx;
let particles = [];
let shockwaves = [];
let animId = null;
let isRunning = false;
let isDragging = false;
let dragPos = { x: 0, y: 0 };
let lastSpawn = 0;

function drawInvader(ctx, x, y, size, color) {
  const s = size / 8;
  ctx.fillStyle = color;
  const pixels = [
    [2,1],[3,1],[5,1],[6,1],
    [1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],
    [2,3],[3,3],[4,3],[5,3],[6,3],
    [0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],
    [0,5],[1,5],[3,5],[4,5],[6,5],[7,5],
    [0,6],[1,6],[7,6],[8,6],
    [2,6],[3,6],[5,6],[6,6]
  ];
  for (const [px, py] of pixels) {
    ctx.fillRect(x + px * s - (s * 4), y + py * s - (s * 4), s, s);
  }
}

class Invader {
  constructor(x, y, vx, vy, opts = {}) {
    this.x  = x;
    this.y  = y;
    this.vx = vx;
    this.vy = vy;
    this.size = opts.size ?? (12 + Math.random() * 20);
    this.color = opts.color ?? INVADER_COLORS[Math.floor(Math.random() * INVADER_COLORS.length)];
    this.opacity = 1.0;
    this.life    = 1.0;
    this.decay   = opts.decay ?? 0;
    this.angle   = Math.random() * Math.PI * 2;
    this.wobble  = Math.random() * 100;
    this.label   = opts.label ?? null;
  }

  update(W, H) {
    this.vy += GRAVITY;
    this.vx *= FRICTION;
    this.wobble += 0.05;

    this.x += this.vx + Math.sin(this.wobble) * 0.3;
    this.y += this.vy;

    if (this.x - this.size < 0) {
      this.x = this.size;
      this.vx = Math.abs(this.vx) * RESTITUTION;
      this.vy *= DAMPING;
    }
    if (this.x + this.size > W) {
      this.x = W - this.size;
      this.vx = -Math.abs(this.vx) * RESTITUTION;
      this.vy *= DAMPING;
    }
    if (this.y - this.size < 0) {
      this.y = this.size;
      this.vy = Math.abs(this.vy) * RESTITUTION;
    }
    if (this.y + this.size > H) {
      this.y = H - this.size;
      this.vy = -Math.abs(this.vy) * RESTITUTION;
      this.vx *= DAMPING;
    }

    if (this.decay > 0) {
      this.life -= this.decay;
      this.opacity = Math.max(0, this.life);
    }
  }

  isAlive() { return this.decay === 0 || this.life > 0; }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.translate(this.x, this.y);

    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 15;

    drawInvader(ctx, 0, 0, this.size, this.color);

    ctx.shadowBlur = 0;

    if (this.label) {
      ctx.globalAlpha = this.opacity * 0.8;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `600 7px 'SF Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(this.label, 0, this.size + 8);
    }

    ctx.restore();
  }
}

class Shockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = SHOCKWAVE_RADIUS;
    this.alpha = 0.8;
    this.speed = 8;
  }

  update() {
    this.radius += this.speed;
    this.alpha = Math.max(0, 0.8 * (1 - this.radius / this.maxRadius));
    this.speed *= 0.97;
  }

  isAlive() { return this.radius < this.maxRadius && this.alpha > 0.01; }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(41, 151, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.radius > 20) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 210, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  applyForce(particles) {
    for (const p of particles) {
      const dx = p.x - this.x;
      const dy = p.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.maxRadius && dist < this.radius + 20 && dist > this.radius - 40) {
        const force = SHOCKWAVE_FORCE / Math.max(1, dist * 0.1);
        const nx = dx / Math.max(1, dist);
        const ny = dy / Math.max(1, dist);
        p.vx += nx * force;
        p.vy += ny * force;
      }
    }
  }
}

const LABELS = [
  'GPT-4o', 'CTX', 'TOKEN', 'PASS1', 'PASS2', 'MCP',
  'API', 'OMNI', '47%', 'SDK', 'LLM', '♾',
  'ZERO', 'CACHE', 'PROMPT', '100%', '$89', 'ROI',
];
let labelIdx = 0;
function nextLabel() {
  const l = LABELS[labelIdx % LABELS.length];
  labelIdx++;
  return Math.random() < 0.35 ? l : null;
}

function spawnInvader(x, y, burst = false) {
  if (particles.length >= MAX_PARTICLES) return;
  const vx = (Math.random() - 0.5) * (burst ? 12 : 6);
  const vy = burst ? -(4 + Math.random() * 8) : (Math.random() - 0.8) * 4;
  const p = new Invader(x, y, vx, vy, {
    label: nextLabel(),
    size: burst ? 10 + Math.random() * 14 : 8 + Math.random() * 16,
  });
  particles.push(p);
  updateParticleCount();
}

function addParticleBurst() {
  if (!canvas) initPhysics();
  const W = canvas.width;
  const H = canvas.height;
  const x = W * (0.2 + Math.random() * 0.6);
  const y = H * 0.3;

  for (let i = 0; i < 12; i++) {
    setTimeout(() => spawnInvader(x, y, true), i * 30);
  }

  shockwaves.push(new Shockwave(x, y));

  if (!isRunning) startPhysics();
}

function clearParticles() {
  particles = [];
  shockwaves = [];
  updateParticleCount();
}

function updateParticleCount() {
  const el = document.getElementById('particleCount');
  if (el) el.textContent = particles.length + ' invaders';
}

function render() {
  const rect = canvas.getBoundingClientRect();
  const W = rect.width;
  const H = rect.height;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(41, 151, 255, 0.04)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < W; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.applyForce(particles);
    sw.update();
    sw.draw(ctx);
    if (!sw.isAlive()) shockwaves.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update(W, H);
    p.draw(ctx);
    if (!p.isAlive()) particles.splice(i, 1);
  }

  if (isDragging) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(dragPos.x, dragPos.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(41, 151, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(41, 151, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#F5F5F7';
  ctx.font = '10px SF Mono, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${particles.length}/${MAX_PARTICLES} invaders`, W - 12, 20);
  ctx.restore();

  updateParticleCount();
  animId = requestAnimationFrame(render);
}

function initPhysics() {
  canvas = document.getElementById('physicsCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resizeCanvas();
  bindEvents();
}

function resizeCanvas() {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width;
  canvas.height = rect.height;
}

window.addEventListener('resize', () => {
  if (canvas) resizeCanvas();
});

function bindEvents() {
  if (!canvas) return;

  canvas.addEventListener('click', (e) => {
    const { x, y } = getCanvasPos(e);
    shockwaves.push(new Shockwave(x, y));
    if (!isRunning) startPhysics();
  });

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragPos = getCanvasPos(e);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    dragPos = getCanvasPos(e);
    const now = performance.now();
    if (now - lastSpawn > 80) {
      spawnInvader(dragPos.x, dragPos.y);
      lastSpawn = now;
      if (!isRunning) startPhysics();
    }
  });

  canvas.addEventListener('mouseup',   () => { isDragging = false; });
  canvas.addEventListener('mouseleave',() => { isDragging = false; });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const { x, y } = getTouchPos(e);
    shockwaves.push(new Shockwave(x, y));
    if (!isRunning) startPhysics();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const { x, y } = getTouchPos(e);
    const now = performance.now();
    if (now - lastSpawn > 60) {
      spawnInvader(x, y);
      lastSpawn = now;
      if (!isRunning) startPhysics();
    }
  }, { passive: false });
}

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function startPhysics() {
  if (!canvas) initPhysics();
  if (isRunning) return;
  isRunning = true;

  if (particles.length === 0) {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    for (let i = 0; i < 12; i++) {
      const x = 60 + Math.random() * (W - 120);
      const y = 30 + Math.random() * (H * 0.4);
      spawnInvader(x, y, true);
    }
  }

  const hint = document.getElementById('physicsHint');
  if (hint) hint.textContent = 'Click for shockwave · Drag to spawn invaders';

  animId = requestAnimationFrame(render);
}

function stopPhysics() {
  isRunning = false;
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
  if (ctx && canvas) {
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
  }
}

window.addEventListener('load', () => {
  initPhysics();
  if (ctx && canvas) {
    resizeCanvas();
    const W = canvas.getBoundingClientRect().width;
    const H = canvas.getBoundingClientRect().height;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(41, 151, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '12px SF Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ Activate Gravity to launch physics simulation', W / 2, H / 2);
    ctx.font = '11px SF Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillText('or click anywhere on canvas', W / 2, H / 2 + 24);
  }
});
