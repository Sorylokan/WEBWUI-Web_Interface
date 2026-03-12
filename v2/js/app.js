// Application bootstrap and cross-cutting orchestration
import { state, config } from './state.js';
import { initTimestamp, showToast, AUTO_TIMESTAMP_TOKEN } from './utils.js';
import {
  setMode,
  openPopover,
  closePopover,
  confirmPopover,
  handlePopoverKey,
  initPopoverClickOutside,
  onInput,
  renderMessageContent
} from './editor.js';
import { addEmbed } from './discord.js';
import {
  exportJson,
  importJson,
  copyRawJson,
  copyAsPayload,
  onJsonEdit,
  updateJsonPanel,
  collectPayload,
  loadFromPayload
} from './payload.js';
import { initWebSocket } from './websocket.js';

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) {
    state.theme = saved;
  }
  applyTheme();
}

function toggleTheme() {
  document.body.classList.add('theme-transition');

  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  localStorage.setItem('theme', state.theme);

  // Keep the transition class only for the theme swap moment.
  window.setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, 320);
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = state.theme === 'dark' ? '🌙' : '☀️';
}

function saveToStorage() {
  clearTimeout(state.saveStorageTimer);
  state.saveStorageTimer = setTimeout(() => {
    try {
      localStorage.setItem(config.STORAGE_KEY, JSON.stringify(collectPayload()));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }, config.STORAGE_DELAY);
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem(config.STORAGE_KEY);
    if (!saved) return false;
    const payload = JSON.parse(saved);
    loadFromPayload(payload);
    return true;
  } catch (err) {
    console.error('Failed to load from localStorage:', err);
    return false;
  }
}

function clearEditorData() {
  loadFromPayload({});

  const whUrl = document.getElementById('whUrl');
  if (whUrl) whUrl.value = '';

  localStorage.removeItem(config.STORAGE_KEY);
  updateJsonPanel();
  validateWebhook();
}

function handleClearDotClick(ev) {
  if (!ev.ctrlKey) return;

  ev.preventDefault();
  ev.stopPropagation();

  const hardReset = ev.shiftKey;
  if (!hardReset) {
    const ok = window.confirm('Clear all editor data?\n\nTip: Ctrl+Shift+Click on the red dot skips this confirmation.');
    if (!ok) return;
  }

  clearEditorData();
  showToast(hardReset ? 'Editor data cleared (hard reset)' : 'Editor data cleared', 'info');
}

function switchPanel(name) {
  state.currentTab = name;

  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pbody').forEach(b => b.classList.remove('active'));

  const tab = document.getElementById(`tab-${name}`);
  const panel = document.getElementById(`panel-${name}`);

  if (tab) tab.classList.add('active');
  if (panel) panel.classList.add('active');

  if (name === 'json') {
    updateJsonPanel();
  }
}

function initSbPanelBehavior() {
  const toggle = document.getElementById('sbHeaderToggle');
  const body = document.getElementById('sbBody');
  const chev = document.getElementById('sbChev');
  if (!toggle || !body || !chev) return;

  let open = true;

  const setOpen = next => {
    open = !!next;
    body.style.maxHeight = open ? '9999px' : '0';
    body.classList.toggle('closed', !open);
    chev.classList.toggle('open', open);
  };

  setOpen(true);

  toggle.addEventListener('click', () => setOpen(!open));

  // connected=true => collapse, connected=false => expand
  window.setSbPanelConnectionState = connected => setOpen(!connected);
}

function normalizePayload(payload) {
  if (!payload.embeds?.length) return payload;

  return {
    ...payload,
    embeds: payload.embeds.map(embed => {
      if (embed.timestamp !== AUTO_TIMESTAMP_TOKEN) {
        return embed;
      }
      return {
        ...embed,
        timestamp: new Date().toISOString()
      };
    })
  };
}

function validateWebhook() {
  const url = document.getElementById('whUrl')?.value.trim() || '';
  const dot = document.getElementById('whDot');
  const txt = document.getElementById('whTxt');
  const sendBtn = document.getElementById('sendWebhookBtn');

  if (!dot || !txt) return;

  if (!url) {
    dot.className = 'wh-dot';
    txt.textContent = 'Enter a webhook URL';
    if (sendBtn) sendBtn.disabled = true;
    return;
  }

  const ok =
    url.startsWith('https://discord.com/api/webhooks/') ||
    url.startsWith('https://discordapp.com/api/webhooks/');

  dot.className = 'wh-dot ' + (ok ? 'ok' : 'err');
  txt.textContent = ok ? 'Valid URL' : 'Invalid URL';
  if (sendBtn) sendBtn.disabled = !ok;
}

async function sendWebhook() {
  const url = document.getElementById('whUrl')?.value.trim() || '';
  const dot = document.getElementById('whDot');
  const txt = document.getElementById('whTxt');

  if (!url) {
    showToast('Enter a webhook URL', 'error');
    return;
  }

  const ok =
    url.startsWith('https://discord.com/api/webhooks/') ||
    url.startsWith('https://discordapp.com/api/webhooks/');

  if (!ok) {
    showToast('Invalid URL', 'error');
    return;
  }

  const payload = normalizePayload(collectPayload());
  if (!payload.content && !(payload.embeds && payload.embeds.length)) {
    showToast('Empty message', 'error');
    return;
  }

  if (dot && txt) {
    dot.className = 'wh-dot spin';
    txt.textContent = 'Sending...';
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      if (dot && txt) {
        dot.className = 'wh-dot ok';
        txt.textContent = 'Sent';
      }
      showToast('Message sent to Discord', 'success');
    } else {
      const err = await res.json().catch(() => ({}));
      if (dot && txt) {
        dot.className = 'wh-dot err';
        txt.textContent = `Error ${res.status}`;
      }
      showToast(`Error ${res.status}: ${err.message || 'unknown'}`, 'error');
    }
  } catch (error) {
    if (dot && txt) {
      dot.className = 'wh-dot err';
      txt.textContent = 'Network error';
    }
    showToast('Network error', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  state.messageContent = document.getElementById('msgTextEl')?.innerText || '';

  initTheme();
  initTimestamp();
  initPopoverClickOutside();
  initSbPanelBehavior();

  try {
    initWebSocket();
  } catch (err) {
    console.warn('WebSocket init failed:', err);
  }

  loadFromStorage();

  attachEventListeners();
  renderMessageContent();

  window.state = state;
  console.log('WEBUI v2 initialized');
});

function attachEventListeners() {
  document.getElementById('pill-edit')?.addEventListener('click', () => setMode('edit'));
  document.getElementById('pill-preview')?.addEventListener('click', () => setMode('preview'));
  document.getElementById('themeBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('dcClearDot')?.addEventListener('click', handleClearDotClick);

  document.getElementById('dcAvatar')?.addEventListener('click', ev => openPopover('avatar', null, ev));

  document.getElementById('usernameEl')?.addEventListener('input', onInput);
  document.getElementById('msgTextEl')?.addEventListener('input', onInput);

  document.getElementById('usernameEl')?.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') ev.preventDefault();
  });

  document.getElementById('addEmbedBtn')?.addEventListener('click', addEmbed);

  document.getElementById('tab-webhook')?.addEventListener('click', () => switchPanel('webhook'));
  document.getElementById('tab-json')?.addEventListener('click', () => switchPanel('json'));

  document.getElementById('whUrl')?.addEventListener('input', validateWebhook);
  document.getElementById('sendWebhookBtn')?.addEventListener('click', sendWebhook);

  document.getElementById('exportJsonBtn')?.addEventListener('click', exportJson);
  document.getElementById('importJsonBtn')?.addEventListener('click', importJson);
  document.getElementById('copyRawJsonBtn')?.addEventListener('click', copyRawJson);
  document.getElementById('copyAsPayloadBtn')?.addEventListener('click', copyAsPayload);
  document.getElementById('jsonOut')?.addEventListener('input', onJsonEdit);

  document.getElementById('popCancelBtn')?.addEventListener('click', closePopover);
  document.getElementById('popConfirmBtn')?.addEventListener('click', confirmPopover);
  document.getElementById('popInput')?.addEventListener('keydown', handlePopoverKey);

  document.addEventListener('click', ev => {
    const spoiler = ev.target.closest('.md-spoiler');
    if (!spoiler) return;
    spoiler.classList.toggle('is-revealed');
    spoiler.setAttribute('aria-expanded', spoiler.classList.contains('is-revealed') ? 'true' : 'false');
  });

  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const spoiler = ev.target.closest('.md-spoiler');
    if (!spoiler) return;
    ev.preventDefault();
    spoiler.classList.toggle('is-revealed');
    spoiler.setAttribute('aria-expanded', spoiler.classList.contains('is-revealed') ? 'true' : 'false');
  });

  window.addEventListener('input', () => {
    saveToStorage();
  });
}
