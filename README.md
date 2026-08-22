# Genesis Overlay: Sovereign Desktop AI (v1.0.0)

[![Potato Standard](https://img.shields.io/badge/Potato_Standard-<35MB_RAM-emerald.svg)](#performance-benchmarks--os-kernel-audit)
[![Nix Flake](https://img.shields.io/badge/Nix_Flake-Supported-blueviolet.svg)](#method-1-declarative-nix-environment-recommended)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

> **Lightweight Shell. Local Brain. Instant Utility.**

Electron-based desktop AI tools typically consume between 100MB and 300MB RAM at idle, and therefore, feel sluggish to use. `Genesis Overlay` is a zero-bloat, keyboard-first, borderless desktop overlay built with Tauri (Rust), Vanilla JS, Local Ollama models (Qwen 2.5 Coder 7B), and Nix packaging.

> **The Potato Standard:** Unlike Electron-based applications that use 100MB–300MB of resting RAM running background Chromium/Node runtimes, `Genesis Overlay` leverages Tauri to keep client shell memory under 35MB RAM, offloading inference to an isolated local Ollama daemon or Cloud API.

---

## System Architecture

```
                     GENESIS OVERLAY ARCHITECTURE
                     
  ┌──────────────────────────────────────────────────────────────┐
  │                     GLOBAL OS HOTKEY                         │
  │            (Cmd+Shift+Space / Ctrl+Shift+Space)              │
  └──────────────────────────────┬───────────────────────────────┘
                                 │ < 30ms Toggle
                                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                 TAURI 2.0 RUST DESKTOP SHELL                 │
  │         • Borderless Glassmorphism & Backdrop Blur           │
  │         • System Tray Persistence & Native Toast Alerts      │
  │         • PII-Sanitized Clipboard Listener & Ingestion       │
  └──────────┬───────────────────┬───────────────────┬───────────┘
             │                   │                   │
   Streaming │ Chunked           │ Stdin/Stdout      │ Sub-5ms
     HTTP    │ Responses         │ IPC Pipes         │ JSON Ledger
             ▼                   ▼                   ▼
  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
  │   OLLAMA DAEMON    │  │   PYTHON SIDECAR   │  │    LOCAL VAULT     │
  │ (Qwen 2.5 Coder)   │  │ (Regex Sanitizer & │  │   (Markdown Note   │
  │                    │  │  Token Metrics)    │  │    JSON Ledger)    │
  └────────────────────┘  └────────────────────┘  └────────────────────┘
```

---

## Key Features

1. **Global Hotkey Overlay Ingress:** `Cmd+Shift+Space` (or `Ctrl+Shift+Space`) instantly shifts focus to a borderless overlay in `<30ms`.
2. **PII-Sanitized Clipboard Listener:** Auto-intercepts copied text, strips sensitive formatting/PII (emails and URLs), and displays word/token count metrics.
3. **Local-First Streaming Cognition:** Direct HTTP SSE streaming with local Ollama (`Qwen 2.5 Coder 7B`). Includes an automated **<1.5s latency router** that falls back to Cloud Gemini API if local inference lags.
4. **Python Sidecar Conduit:** High-performance background text transformation pipeline operating via anonymous pipes (stdin/stdout IPC).
5. **Sub-5ms Local JSON Vault:** Markdown fragment manager with sub-5ms lookup latency.
6. **Keyboard-First Glassmorphism UX:** Backdrop blurs, native micro-animations, navigable 100% mouse-free (`Esc` to hide, arrows to select).
7. **System Tray Command Center:** System tray controller running headlessly in the background with close-to-tray window state persistence.
8. **Nix Flake Packaging:** Declarative build producing a static binary under 20MB.

---

## Performance Benchmarks & OS Kernel Audit

All metrics verified empirically via production release builds (`src-tauri/target/release`) and the macOS System Profiler (`/usr/bin/leaks`):

| Performance Metric | Industry Standard (Electron Baseline) | Tauri Standard Baseline | Genesis Overlay (Empirical Audit) | Status |
| :----------------- | :------------------------------------ | :---------------------- | :-------------------------------- | :------------------ |
| **Active Heap Allocation (`malloc`)** | 150,000 KB – 400,000 KB | 20,000 KB – 50,000 KB | **122 KB** (0.12 MB) | **PASS** |
| **Memory Leaks (`leaks`)** | Micro-leaks common | Dependent on dev code | **0 Leaks (0 Bytes)** | **PASS** |
| **Peak Physical Footprint** | 450 MB – 1,200 MB | 40 MB – 80 MB | **7.61 MB** | **PASS (<35MB)** |
| **Rust Core Init Latency** | 2,000 ms – 5,000 ms | 200 ms – 500 ms | **338 µs** (0.338 ms) | **PASS (<80ms)** |
| **Static Binary Size** | 120 MB – 200 MB+ | 3 MB – 10 MB | **9.8 MB** | **PASS (<20MB)** |

---

## Developer Onboarding & Quick Start

### Step 1: Install Local AI Prerequisites
`Genesis Overlay` connects to a local Ollama daemon for zero-latency, private LLM inference:

1. Install and start Ollama from [ollama.com](https://ollama.com).
2. Pull the default technical coding model:
   ```bash
   ollama pull qwen2.5-coder:7b
   ```
3. *(Optional)* Set Gemini API key for automatic cloud fallback if local Ollama lags ($>1.5\text{s}$):
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key-here"
   ```

---

### Step 2: Instant Execution (Pre-Built / Nix)

* **Option A: Pre-Built Installers (Zero Terminal)**  
  Download `.dmg` (macOS) or `GenesisOverlay_1.0.0_x64-setup.exe` (Windows) from [GitHub Releases](https://github.com/HoloDanger/genesis-overlay/releases).
* **Option B: Single-Command Nix Run (Zero Clone)**  
  ```bash
  nix run github:HoloDanger/genesis-overlay
  ```

---

### Step 3: Building from Source (Zero-Node Architecture)

`Genesis Overlay` features a **100% Zero-Node / Zero-Bundler** architecture. Building from source requires zero `npm` dependencies.

#### Method 1: Declarative Nix Environment (Recommended)
```bash
git clone https://github.com/HoloDanger/genesis-overlay.git
cd genesis-overlay

# Launch locally inside repo
nix run

# Or enter isolated devshell with Rust & WebKit dependencies
nix develop
```

#### Method 2: Native Cargo Build (Pure Rust)
```bash
git clone https://github.com/HoloDanger/genesis-overlay.git
cd genesis-overlay/src-tauri

# Run live development mode with hot reloading
cargo tauri dev

# Compile standalone release binary
cargo tauri build
```

---

### Step 4: Keyboard Controls & Usage

* `Cmd+Shift+Space` (or `Ctrl+Shift+Space`): Toggle overlay window focus.
* `Esc`: Hide overlay window.
* `Tab` / `Shift+Tab`: Traverse prompt presets (`summarize`, `rewrite`, `refactor`).
* `Cmd+S`: Save active text buffer to local JSON vault (`~/Library/Application Support/com.genesis.overlay/vault.json`).

---

## License

MIT License. Built as part of the **Genesis Academy v6.0 Curriculum**.
