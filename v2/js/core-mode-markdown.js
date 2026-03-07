// STATE
let currentMode = 'edit';
let lastFocused = null;
let fields = [];
let fieldIdCounter = 0;
let embedIdCounter = 1;
let activeEmbedId = 1;
let ws = null;
let wsConnected = false;
let pendingGetGlobalId = null;
const LOCALSTORAGE_KEY = 'webwuiPayload';
const LOCALSTORAGE_DELAY = 400;
let saveTimeout = null;

function enforceContentEditableLimit(el) {
  if (!el || !el.isContentEditable) return false;
  const maxChars = Number(el.dataset.maxChars || 0);
  if (!maxChars || Number.isNaN(maxChars)) return false;

  const current = el.innerText || '';
  if (current.length <= maxChars) return false;

  const trimmed = current.slice(0, maxChars);
  el.innerText = trimmed;

  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return true;
}

document.addEventListener('input', e => {
  if (!e.target?.isContentEditable) return;
  e.target.dataset.raw = e.target.innerText || '';
  enforceContentEditableLimit(e.target);
});

// Track cursor for toolbar insertions
document.addEventListener('focusin', e => {
  if (e.target.isContentEditable) {
    lastFocused = e.target;
  }
});

// WEBSOCKET / STREAMER.BOT
function toggleWebSocket() {
  if (wsConnected) {
    if (ws) ws.close();
    return;
  }

  const host = document.getElementById('wsAddress').value.trim() || 'localhost';
  const port = document.getElementById('wsPort').value.trim() || '8080';
  const url = host.includes('://') ? `${host}:${port}` : `ws://${host}:${port}`;

  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      wsConnected = true;
      updateWsUi();
      showNotification('\u2705 Connected to Streamer.bot', 'success');
    };
    ws.onclose = () => {
      wsConnected = false;
      updateWsUi();
      showNotification('\u26A0\uFE0F WebSocket disconnected', 'warning');
    };
    ws.onerror = (err) => {
      showNotification('\u274C WebSocket error', 'error');
    };
    ws.onmessage = (event) => {
      handleWsMessage(event);
    };
  } catch (err) {
    showNotification(`\u274C ${err.message}`, 'error');
  }
}

function updateWsUi() {
  const dot = document.getElementById('wsStatus');
  const text = document.getElementById('wsStatusText');
  const btn = document.getElementById('connectBtn');

  if (dot) dot.classList.toggle('online', wsConnected);
  if (text) text.textContent = wsConnected ? 'Connected' : 'Disconnected';
  if (btn) btn.textContent = wsConnected ? 'Disconnect' : 'Connect';
}

function sendWsRequest(payload) {
  if (!wsConnected || !ws) {
    throw new Error('WebSocket not connected');
  }
  ws.send(JSON.stringify(payload));
}

function savePayloadToStreamerBot() {
  try {
    if (!wsConnected || !ws) {
      showNotification('\u274C WebSocket not connected', 'error');
      return;
    }
    updateJson();
    const payloadName = (document.getElementById('payloadName').value || 'WEBWUI_WebhookPayload').trim();
    const payloadValue = document.getElementById('jsonOutput').value;

    sendWsRequest({
      request: 'DoAction',
      id: '1',
      action: { id: '74e1d5e7-a4c8-4799-871f-f444eb8ace03' },
      args: {
        variableName: payloadName,
        JsonPayload: payloadValue
      }
    });

    showNotification('\u23F3 Saving...', 'info');
  } catch (err) {
    showNotification(`\u274C ${err.message}`, 'error');
  }
}

function loadPayloadFromStreamerBot() {
  try {
    if (!wsConnected || !ws) {
      showNotification('\u274C WebSocket not connected', 'error');
      return;
    }
    const payloadName = (document.getElementById('payloadName').value || 'WEBWUI_WebhookPayload').trim();
    pendingGetGlobalId = '2';

    sendWsRequest({
      request: 'GetGlobal',
      id: '2',
      variable: payloadName,
      persisted: true
    });

    showNotification('\u23F3 Loading...', 'info');
  } catch (err) {
    showNotification(`\u274C ${err.message}`, 'error');
  }
}

function handleWsMessage(event) {
  try {
    const data = JSON.parse(event.data);
    console.log('WS message:', data);
    
    // Handle GetGlobal response (id: 2)
    if (data.id === '2' && data.variables) {
      try {
        const payloadName = document.getElementById('payloadName').value || 'WEBWUI_WebhookPayload';
        const variable = data.variables[payloadName];
        
        if (variable && variable.value) {
          const payload = typeof variable.value === 'string' ? JSON.parse(variable.value) : variable.value;
          applyPayload(payload);
          saveToLocalStorage();
          showNotification(`\u2705 Loaded: ${payloadName}`, 'success');
        } else {
          showNotification('\u26A0\uFE0F Variable is empty', 'warning');
        }
      } catch (err) {
        showNotification(`\u274C Parse error: ${err.message}`, 'error');
      }
      pendingGetGlobalId = null;
    }
    
    // Handle DoAction response (id: 1)
    if (data.id === '1') {
      if (data.error) {
        showNotification(`\u274C Error: ${data.error}`, 'error');
      } else {
        showNotification('\u2705 Saved!', 'success');
      }
    }
  } catch (err) {
    console.error('WS parse error:', err);
  }
}

