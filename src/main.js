// ============================================================================
// GENESIS OVERLAY: FRONTEND INTERFACE ENGINE
// Architectural Blueprint: Scientific Brutalism | Keyboard-First Acceleration
// ============================================================================

// ----------------------------------------------------------------------------
// SECTION 1: DOM ELEMENT CACHING & TAURI API BINDINGS
// ----------------------------------------------------------------------------
const { invoke } = window.__TAURI__.tauri;
const { appWindow } = window.__TAURI__.window;
const { listen } = window.__TAURI__.event;

// Cache DOM elements once on startup to eliminate layout queries during render loops
const cpuVal = document.getElementById('cpu-val');
const cpuBar = document.getElementById('cpu-bar');
const ramVal = document.getElementById('ram-val');
const ramBar = document.getElementById('ram-bar');
const clipPreview = document.getElementById('clip-preview');
const clipMeta = document.getElementById('clip-meta');
const commandInput = document.getElementById('command-input');
const aiResponse = document.getElementById('ai-response');
const closeBtn = document.getElementById('close-btn');

// Wire close button window dismissal
if (closeBtn) {
  closeBtn.addEventListener('click', () => appWindow.close());
}

// Auto-focus input area when window gains focus
window.addEventListener('focus', () => {
  if (commandInput) commandInput.focus();
});

// ----------------------------------------------------------------------------
// SECTION 2: SYSTEM TELEMETRY & PAGE VISIBILITY (POTATO STANDARD)
// ----------------------------------------------------------------------------
let statsInterval = null;

/// Queries Rust backend for system CPU & RAM metrics
async function updateStats() {
  try {
    const stats = await invoke('get_system_stats');

    // Update CPU Metrics
    const cpu = stats.cpu;
    cpuVal.textContent = `${cpu.toFixed(1)}%`;
    cpuBar.style.width = `${cpu}%`;

    // Update RAM Metrics
    const ram = stats.ram;
    const used = stats.used_ram_gb;
    const total = stats.total_ram_gb;
    ramVal.textContent = `${used.toFixed(2)} / ${total.toFixed(2)} GB (${ram.toFixed(1)}%)`;
    ramBar.style.width = `${ram}%`;
  } catch (err) {
    console.error("Failed to query system stats:", err);
  }
}

/// Starts telemetry polling interval
function startStatsPolling() {
  if (!statsInterval) {
    updateStats();
    statsInterval = setInterval(updateStats, 1000);
  }
}

/// Pauses telemetry polling interval to drop idle JS heap churn to zero
function stopStatsPolling() {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
  }
}

// Page Visibility API Hook: Throttle CPU/memory usage when window is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopStatsPolling();
  } else {
    startStatsPolling();
  }
});

// Start initial telemetry polling loop
startStatsPolling();

// ----------------------------------------------------------------------------
// SECTION 3: TAURI IPC EVENT LISTENERS (CLIPBOARD & PYTHON SIDECAR)
// ----------------------------------------------------------------------------

// Intercept OS clipboard changes broadcasted from Rust background thread
listen('clipboard-change', async (event) => {
  const payload = event.payload;

  // Instantly update UI for sub-10ms latency feedback
  if (clipPreview && clipMeta) {
    clipPreview.textContent = payload.sanitized_text;
    clipMeta.textContent = `Word Count: ${payload.word_count}`;
  }

  try {
    // Route raw clipboard text to Python sidecar over JSON-RPC pipe for formatting
    await invoke('format_via_sidecar', { text: payload.raw_text, id: Date.now() });
  } catch (err) {
    console.error("Failed to route clipboard to sidecar:", err);
  }
});

// Listen to sidecar JSON-RPC response payloads and render token calculations
listen('sidecar_response', (event) => {
  const response = event.payload;
  if (response.result) {
    const tokens = response.result.tokens;
    if (clipMeta) {
      clipMeta.textContent = `Tokens (Est): ${tokens} | Word Count: ${clipMeta.textContent.split('Word Count: ')[1] || '0'}`;
    }
  } else if (response.error) {
    console.error("Sidecar returned error:", response.error);
  }
});

// ----------------------------------------------------------------------------
// SECTION 4: AI TOKEN STREAMING & REASONING STATE ENGINE
// ----------------------------------------------------------------------------
let currentAiText = '';
let isReasoningPhase = false;

// Process streaming tokens broadcasted from Rust Ollama stream router
listen('llm_token', (event) => {
  const token = event.payload;

  if (token === '[DONE]') {
    console.log("Stream finalized.");
    isReasoningPhase = false;
  } else if (token.startsWith('[Error')) {
    aiResponse.textContent = token;
    aiResponse.style.color = '#ff6b6b';
    isReasoningPhase = false;
  } else {
    // Detect start of DeepSeek R1 reasoning chain (<think>)
    if (token.includes('<think>')) {
      isReasoningPhase = true;
      aiResponse.textContent = '[REASONING / THINKING...]';
      aiResponse.style.color = '#6c7a89';
      return;
    }

    // Detect end of DeepSeek R1 reasoning chain (</think>)
    if (token.includes('</think>')) {
      isReasoningPhase = false;
      currentAiText = '';
      aiResponse.textContent = '';
      aiResponse.style.color = '#ffffff';
      return;
    }

    // Retain reasoning status during thinking phase
    if (isReasoningPhase) {
      if (!aiResponse.textContent.startsWith('[REASONING')) {
        aiResponse.textContent = '[REASONING / THINKING...]';
        aiResponse.style.color = '#6c7a89';
      }
      return;
    }

    // Clear "Processing..." status upon first non-whitespace content token
    if (currentAiText === '') {
      if (token.trim() === '') return;
      aiResponse.textContent = '';
      aiResponse.style.color = '#ffffff';
    }

    currentAiText += token;
    aiResponse.textContent = currentAiText;

    // Auto-scroll output card container to bottom
    const card = aiResponse.parentElement;
    card.scrollTop = card.scrollHeight;
  }
});

/// Invokes the stream router with selected prompt and Super-Sub preset
async function executePreset(presetName) {
  if (presetName === 'vault') {
    aiResponse.textContent = 'Loading Saved Vault Notes...';
    aiResponse.style.color = '#00ff66';
    try {
      const notes = await invoke('get_vault_notes');
      if (!notes || notes.length === 0) {
        aiResponse.textContent = '=== SAVED VAULT NOTES (0 RECORDS) ===\n\nVault Ledger Empty. Type a note in Command Ingress and press Enter to save.';
        return;
      }
      const formatted = notes.map((n, i) => {
        const dateStr = new Date(n.timestamp * 1000).toLocaleString();
        return `[RECORD #${i + 1}] (${dateStr})\n${n.content}`;
      }).join('\n\n----------------------------------------\n\n');
      aiResponse.textContent = `=== SAVED VAULT NOTES (${notes.length} RECORDS) ===\n\n${formatted}`;
    } catch (err) {
      console.error("Failed to query vault notes:", err);
      aiResponse.textContent = `Vault Error: ${err}`;
    }
    return;
  }

  let targetText = commandInput.value.trim();
  if (!targetText && clipPreview) {
    targetText = clipPreview.textContent.trim();
  }
  if (!targetText || targetText === 'Awaiting copy event...') return;

  currentAiText = '';
  aiResponse.textContent = `Processing [${presetName.toUpperCase()}]...`;
  aiResponse.style.color = '#a8b2c1';

  try {
    await invoke('stream_router', { prompt: targetText, preset: presetName });
  } catch (err) {
    console.error("Preset invocation failed:", err);
    aiResponse.textContent = `Invoke Error: ${err}`;
  }
}

// Intercept system tray preset execution events broadcasted from Rust tray controller
listen('trigger-preset-action', (event) => {
  const presetName = event.payload;
  if (presetName) {
    executePreset(presetName);
  }
});

// ----------------------------------------------------------------------------
// SECTION 5: KEYBOARD NAVIGATION, HOTKEYS, & MODULO FOCUS WRAPPING
// ----------------------------------------------------------------------------
const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));

// Wire mouse clicks on preset toolbar buttons
presetButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const preset = e.currentTarget.getAttribute('data-preset');
    executePreset(preset);
  });
});

// Alt+1..6 / Ctrl+1..6 Keyboard Shortcut Presets
window.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey) {
    const presets = ['summarize', 'rewrite', 'proofread', 'translate', 'refactor', 'vault'];
    let digit = null;

    if (e.code && e.code.startsWith('Digit')) {
      digit = parseInt(e.code.replace('Digit', ''), 10);
    } else {
      digit = parseInt(e.key, 10);
    }

    if (digit >= 1 && digit <= 6) {
      e.preventDefault();
      executePreset(presets[digit - 1]);
    }
  }
});

// Escape key window dismissal (<10ms UI latency)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    appWindow.hide();
  }
});

// ArrowDown from Command Input to Toolbar Buttons
commandInput.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' && presetButtons.length > 0) {
    e.preventDefault();
    presetButtons[0].focus();
  }
});

// Modulo ring buffer arrow navigation across toolbar buttons: (index ± 1 + length) % length
presetButtons.forEach((btn, index) => {
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % presetButtons.length;
      presetButtons[nextIndex].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + presetButtons.length) % presetButtons.length;
      presetButtons[prevIndex].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      commandInput.focus();
    }
  });
});

// ----------------------------------------------------------------------------
// SECTION 6: NOTE VAULT LEDGER COMMITS & DRAFT AUTO-SAVING
// ----------------------------------------------------------------------------

/// Debounce helper function to throttle auto-save IPC invocations
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
}

// Throttled draft auto-save handler (300ms boundary)
const autoSaveDraft = debounce(async (text) => {
  if (!text.trim()) return;
  try {
    await invoke('save_draft', { content: text });
    console.log("Draft auto-saved.");
  } catch (err) {
    console.error("Draft save failed:", err);
  }
}, 300);

// Attach input listener for draft auto-saving
commandInput.addEventListener('input', (e) => {
  autoSaveDraft(e.target.value);
});

// Enter key router: Cmd+Enter (AI Stream) vs Standard Enter (Vault Commit / Slash Commands)
commandInput.addEventListener('keydown', async (e) => {
  // AI Query Route: Cmd+Enter (Mac) or Ctrl+Enter (Linux/Windows)
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    const text = e.target.value.trim();
    if (!text) return;

    currentAiText = '';
    aiResponse.textContent = 'Thinking...';
    aiResponse.style.color = '#a8b2c1';
    e.target.value = '';

    try {
      await invoke('stream_router', { prompt: text });
    } catch (err) {
      console.error("LLM stream invoke failed:", err);
      aiResponse.textContent = `Invoke Error: ${err}`;
    }
    return;
  }

  // Note Commit / Slash Command Route: Standard Enter
  if (e.key === 'Enter') {
    e.preventDefault();
    const text = e.target.value.trim();
    if (!text) return;

    // Check for inline slash commands (e.g. /summarize, /rewrite, /refactor)
    const slashMatch = text.match(/^\/(summarize|rewrite|proofread|translate|refactor)\b(.*)/i);
    if (slashMatch) {
      const presetName = slashMatch[1].toLowerCase();
      const inlinePrompt = slashMatch[2].trim();

      commandInput.value = inlinePrompt ? inlinePrompt : '';
      executePreset(presetName);
      return;
    }

    try {
      e.target.value = '';
      await invoke('commit_note', { content: text });
      console.log("Note committed to ledger.");
    } catch (err) {
      console.error("Failed to commit note:", err);
    }
  }
});
