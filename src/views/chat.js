import { APP, VX } from '../state.js';
import { openPanel } from '../panel.js';

const SUGGESTIONS = [
  '¿Cuál es el cluster de poder más influyente del ecosistema y por qué?',
  '¿Quiénes son los actores Tier 1 de capital (V9) y qué posiciones estratégicas controlan?',
  'Analiza la consolidación de derechos de media en México y sus implicaciones competitivas',
  '¿Qué operaciones de PE han reconfigurado la estructura del ecosistema en 2025-2026?',
  '¿Qué actores de Propiedades (V1) tienen las relaciones cross-vertical más relevantes?',
  '¿Cómo está estructurado el control del ticketing y acceso a eventos en México?',
];

// Actor ID pattern: V1-001 through V9-999
const ACTOR_ID_RE = /\b(V[1-9]-\d{3})\b/g;

let _streaming = false;
let _abortController = null;

export function initChat() {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;
  renderWelcome();
  initChatListeners();
}

export function focusChatInput() {
  const inp = document.getElementById('chat-input');
  if (inp) setTimeout(() => inp.focus(), 80);
}

function renderWelcome() {
  const msgs = document.getElementById('chat-messages');
  if (!msgs || APP.chatHistory.length > 0) return;
  msgs.innerHTML = `
    <div class="chat-welcome">
      <div class="chat-welcome-eye">Playbook Intelligence · Motor de consulta · MX 2026</div>
      <div class="chat-welcome-title">¿Qué quieres analizar?</div>
      <div class="chat-welcome-sub">Pregunta sobre actores, clusters, verticales, deal flow o estructura de poder del ecosistema deportivo mexicano.</div>
      <div class="chat-suggestions">
        ${SUGGESTIONS.map((s, i) => `<div class="chat-sug" data-q="${escHtml(s)}">${s}</div>`).join('')}
      </div>
    </div>
  `;
  msgs.querySelectorAll('.chat-sug').forEach(el => {
    el.addEventListener('click', () => sendMessage(el.dataset.q));
  });
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Build a single actor chip HTML string
function actorChipHtml(id) {
  const actor = APP.actorMap.get(id);
  const color = actor ? (VX[actor.vertical] || VX.V1).color : 'var(--text-dim)';
  const title = actor ? ` title="${escHtml(actor.label)}"` : '';
  return `<span class="chat-chip" data-aid="${id}" style="border-color:${color}44;color:${color}"${title}>${id}</span>`;
}

// Replace actor IDs in a plain-text segment (already HTML-escaped)
function inlineChips(escaped) {
  return escaped.replace(ACTOR_ID_RE, id => actorChipHtml(id));
}

// Convert plain text response to formatted HTML — line-by-line to prevent double-replacement
function formatResponse(text) {
  const lines = text.split('\n');
  const parts = [];
  let bodyLines = [];

  const flushBody = () => {
    if (!bodyLines.length) return;
    const raw = escHtml(bodyLines.join('\n'));
    // DATO INCIERTO warnings
    const warned = raw
      .replace(/DATO INCIERTO:\s*/g, '<span class="chat-uncertain">DATO INCIERTO: </span>')
      .replace(/SIN DATOS SUFICIENTES[^<\n]*/g, m => `<span class="chat-uncertain">${m}</span>`);
    parts.push(`<p class="chat-msg-p">${inlineChips(warned)}</p>`);
    bodyLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // TITULAR: line
    if (/^TITULAR:\s*/i.test(trimmed)) {
      flushBody();
      const headline = escHtml(trimmed.replace(/^TITULAR:\s*/i, ''));
      parts.push(`<div class="chat-msg-headline">${headline}</div>`);
      continue;
    }

    // ACTORES RELACIONADOS: V1-001, V2-005 ...
    if (/^ACTORES RELACIONADOS:\s*/i.test(trimmed)) {
      flushBody();
      const idPart = trimmed.replace(/^ACTORES RELACIONADOS:\s*/i, '');
      const chips = idPart.split(/[\s,;]+/)
        .filter(s => /^V[1-9]-\d{3}$/.test(s))
        .map(id => actorChipHtml(id))
        .join('');
      parts.push(`<div class="chat-msg-related"><span class="chat-msg-related-lbl">Actores relacionados</span><div class="chat-chips-row">${chips}</div></div>`);
      continue;
    }

    // Paragraph break on empty line
    if (trimmed === '') {
      flushBody();
      continue;
    }

    bodyLines.push(line);
  }

  flushBody();
  return parts.join('') || `<p class="chat-msg-p">${inlineChips(escHtml(text))}</p>`;
}

function appendMessage(role, htmlContent, id) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;

  // Remove welcome screen on first message
  const welcome = msgs.querySelector('.chat-welcome');
  if (welcome) welcome.remove();

  const div = document.createElement('div');
  div.className = `chat-msg chat-msg-${role}`;
  if (id) div.id = id;

  if (role === 'user') {
    div.innerHTML = `<div class="chat-msg-bubble chat-msg-bubble-user">${htmlContent}</div>`;
  } else {
    div.innerHTML = `
      <div class="chat-msg-avatar">PB</div>
      <div class="chat-msg-bubble chat-msg-bubble-assistant">${htmlContent}</div>
    `;
  }

  msgs.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return div;
}

function addChipListeners(container) {
  container.querySelectorAll('.chat-chip[data-aid]').forEach(chip => {
    chip.addEventListener('click', () => {
      const actor = APP.actorMap.get(chip.dataset.aid);
      if (actor) openPanel(actor, 'cluster-panel');
    });
  });
}

async function sendMessage(text) {
  if (_streaming || !text || !text.trim()) return;
  const inp = document.getElementById('chat-input');
  if (inp) { inp.value = ''; inp.style.height = 'auto'; }

  const userText = text.trim();

  // Add to history and render user bubble
  APP.chatHistory.push({ role: 'user', content: userText });
  appendMessage('user', escHtml(userText));

  // Create assistant bubble with streaming cursor
  const assistantId = 'chat-msg-' + Date.now();
  const assistantEl = appendMessage('assistant',
    '<span class="chat-cursor"></span>',
    assistantId
  );

  _streaming = true;
  setInputState(true);

  let fullText = '';

  try {
    _abortController = new AbortController();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: APP.chatHistory }),
      signal: _abortController.signal,
    });

    if (!res.ok) {
      throw new Error('HTTP ' + res.status);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const bubble = assistantEl ? assistantEl.querySelector('.chat-msg-bubble-assistant') : null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;
        try {
          const evt = JSON.parse(raw);
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullText += evt.delta.text;
            // Live plain-text render while streaming (no chip parsing yet — wait for completion)
            if (bubble) {
              bubble.innerHTML = escHtml(fullText) + '<span class="chat-cursor"></span>';
              const msgs = document.getElementById('chat-messages');
              if (msgs) msgs.scrollTop = msgs.scrollHeight;
            }
          }
        } catch { /* malformed SSE line — skip */ }
      }
    }

    // Streaming complete — render formatted HTML with actor chips
    if (bubble && fullText) {
      bubble.innerHTML = formatResponse(fullText);
      addChipListeners(bubble);
    } else if (bubble) {
      bubble.innerHTML = '<span class="chat-uncertain">Sin respuesta del servidor.</span>';
    }

    APP.chatHistory.push({ role: 'assistant', content: fullText });

  } catch (err) {
    if (err.name === 'AbortError') {
      // User cancelled — keep partial text if any
      if (fullText) {
        APP.chatHistory.push({ role: 'assistant', content: fullText });
        const bubble = assistantEl ? assistantEl.querySelector('.chat-msg-bubble-assistant') : null;
        if (bubble) { bubble.innerHTML = formatResponse(fullText); addChipListeners(bubble); }
      } else {
        if (assistantEl) assistantEl.remove();
        APP.chatHistory.pop(); // remove user message that got no response
      }
    } else {
      const bubble = assistantEl ? assistantEl.querySelector('.chat-msg-bubble-assistant') : null;
      if (bubble) bubble.innerHTML = `<span class="chat-uncertain">Error al conectar con el motor de inteligencia. Intenta de nuevo.</span>`;
    }
  } finally {
    _streaming = false;
    _abortController = null;
    setInputState(false);
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }
}

function setInputState(disabled) {
  const btn = document.getElementById('chat-send');
  const inp = document.getElementById('chat-input');
  const stopBtn = document.getElementById('chat-stop');
  if (btn) btn.style.display = disabled ? 'none' : 'flex';
  if (stopBtn) stopBtn.style.display = disabled ? 'flex' : 'none';
  if (inp) inp.disabled = disabled;
}

export function initChatListeners() {
  const inp = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const stopBtn = document.getElementById('chat-stop');
  const clearBtn = document.getElementById('chat-clear');

  if (!inp) return;

  // Auto-resize textarea
  inp.addEventListener('input', () => {
    inp.style.height = 'auto';
    inp.style.height = Math.min(inp.scrollHeight, 140) + 'px';
  });

  // Enter to send, Shift+Enter for newline
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inp.value);
    }
  });

  if (sendBtn) sendBtn.addEventListener('click', () => sendMessage(inp.value));

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (_abortController) _abortController.abort();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      APP.chatHistory = [];
      const msgs = document.getElementById('chat-messages');
      if (msgs) msgs.innerHTML = '';
      renderWelcome();
    });
  }
}

