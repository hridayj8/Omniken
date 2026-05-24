# Omniken: The Infinite Zero Context Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully realized, production-quality web application for Omniken — a context-token compression engine with premium dark glassmorphic UI, interactive physics sandbox, API cost savings calculator, and MCP server integration.

**Architecture:** Pure HTML/CSS/JS frontend (`omniken/`) + Node.js MCP server (`omniken/mcp-server/`). No build pipeline needed for the frontend — it runs directly in browser. The MCP server is a standalone Node.js daemon.

**Tech Stack:** Vanilla HTML5, CSS3 (OKLCH, glassmorphism), JavaScript ES2024, HTML5 Canvas (physics sim), tiktoken-compatible token counting via JS, Node.js 20+, @modelcontextprotocol/sdk

---

### Task 1: Project Scaffold & Directory Structure

**Files:**
- Create: `omniken/index.html`
- Create: `omniken/app.css`
- Create: `omniken/app.js`
- Create: `omniken/physics.js`
- Create: `omniken/calculator.js`
- Create: `omniken/mcp-server/index.js`
- Create: `omniken/mcp-server/package.json`
- Create: `omniken/requirements.txt`

- [x] Create the directory structure and all empty files
- [x] Commit scaffold: `git commit -m "chore: scaffold omniken project structure"`

### Task 2: Core CSS Design System

**Files:**
- Modify: `omniken/app.css`

- [x] Implement the full CSS design system
- [x] Commit: `git commit -m "feat: implement omniken pitch-black glassmorphic design system"`

### Task 3: HTML Shell & Layout

**Files:**
- Modify: `omniken/index.html`

- [x] Build complete HTML structure
- [x] Commit: `git commit -m "feat: build omniken HTML layout shell"`

### Task 4: Token Engine & Optimizer Logic

**Files:**
- Modify: `omniken/app.js`

- [x] Implement heuristic pass-1 and shorthand pass-2 engines
- [x] Commit: `git commit -m "feat: implement token compression engine passes"`

### Task 5: API Cost Offset Calculator

**Files:**
- Modify: `omniken/calculator.js`

- [x] Implement real-time cost savings calculations for GPT-4o, Claude 3.5, Gemini 1.5 Pro
- [x] Commit: `git commit -m "feat: implement api cost offset calculator"`

### Task 6: Physics Gravity Sandbox

**Files:**
- Modify: `omniken/physics.js`

- [x] Implement 2D rigid-body gravity simulation with wall bouncing and click shockwaves
- [x] Commit: `git commit -m "feat: implement interactive gravity physics sandbox"`

### Task 7: MCP Server

**Files:**
- Modify: `omniken/mcp-server/index.js`
- Modify: `omniken/mcp-server/package.json`

- [x] Implement full MCP server with optimize_context_stream tool
- [x] Commit: `git commit -m "feat: implement omniken mcp server"`

### Task 8: Dependency Manifests

**Files:**
- Modify: `omniken/requirements.txt`

- [x] Write Python requirements (for reference/optional Streamlit variant)
- [x] Commit: `git commit -m "chore: add dependency manifests"`
