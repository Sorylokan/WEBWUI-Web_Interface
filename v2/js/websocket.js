// WebSocket Streamer.bot integration
import { buildStreamerBotEnvelope, loadFromPayload } from './payload.js';
import { showToast } from './utils.js';

export let wsConnection = null;
let pendingGetGlobalCleanup = null;
const MINI_LOG_MAX = 160;

/* ── helpers ── */
function pad(n) { return String(n).padStart(2, '0'); }

function sbLog(type, msg) {
  const log = document.getElementById('sbLog');
  if (!log) return;

  const raw = String(msg || '');
  const isTruncated = raw.length > MINI_LOG_MAX;
  const preview = isTruncated ? raw.slice(0, MINI_LOG_MAX) + '…' : raw;

  const now = new Date();
  const ts  = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const entry = document.createElement('div');
  entry.className = 'sl-entry';

  if (isTruncated) {
    entry.classList.add('has-full-log');
    entry.dataset.fullLog = raw;
  }

  const tsEl = document.createElement('span');
  tsEl.className = 'sl-ts';
  tsEl.textContent = ts;

  const msgEl = document.createElement('span');
  msgEl.className = `sl-msg ${type}`;
  msgEl.textContent = preview;

  entry.appendChild(tsEl);
  entry.appendChild(msgEl);
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 80) log.removeChild(log.firstChild);

  // Keep full payloads available in browser devtools
  console.debug(`[WEBWUI WS ${type}]`, raw);
}

function setSbStatus(dotClass, txt) {
  // Update both the header badge dot and the body status dot
  ['sbDotH'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'st-dot' + (dotClass ? ' ' + dotClass : '');
  });
  const txtH = document.getElementById('sbTxtH');
  if (txtH) txtH.textContent = txt;

  if (typeof window.setSbPanelConnectionState === 'function') {
    if (dotClass === 'ok') window.setSbPanelConnectionState(true);
    if (!dotClass || dotClass === 'err') window.setSbPanelConnectionState(false);
  }
}

/* ── init ── */
export function initWebSocket() {
  const wsToggleBtn = document.getElementById('wsToggleBtn');
  const wsSaveBtn   = document.getElementById('wsSaveBtn');
  const wsLoadBtn   = document.getElementById('wsLoadBtn');

  if (!wsToggleBtn) return;

  initLogModal();

  wsToggleBtn.onclick = toggleWebSocket;
  if (wsSaveBtn) wsSaveBtn.onclick = () => saveToStreamerBot();
  if (wsLoadBtn) wsLoadBtn.onclick = () => loadFromStreamerBot();

  // Restore saved settings
  const wsHost = localStorage.getItem('wsHost');
  const wsPort = localStorage.getItem('wsPort');
  const wsEndpoint = localStorage.getItem('wsEndpoint');
  if (wsHost && wsPort) {
    document.getElementById('wsHost').value = wsHost;
    document.getElementById('wsPort').value = wsPort;
    if (wsEndpoint && document.getElementById('wsEndpoint')) {
      document.getElementById('wsEndpoint').value = wsEndpoint;
    }
    setTimeout(toggleWebSocket, 100);
  }
}

function initLogModal() {
  const log = document.getElementById('sbLog');
  const modal = document.getElementById('logModal');
  const modalBody = document.getElementById('logModalBody');
  const closeBtn = document.getElementById('logModalCloseBtn');
  const backdrop = document.getElementById('logModalBackdrop');
  if (!log || !modal || !modalBody || !closeBtn || !backdrop) return;

  const close = () => {
    modal.hidden = true;
    modalBody.textContent = '';
  };

  const open = (fullLog) => {
    modalBody.textContent = formatLogForModal(fullLog);
    modal.hidden = false;
  };

  log.addEventListener('click', (ev) => {
    const entry = ev.target.closest('.sl-entry.has-full-log');
    if (!entry) return;
    open(entry.dataset.fullLog || '');
  });

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !modal.hidden) close();
  });
}

function formatLogForModal(logText) {
  try {
    return JSON.stringify(JSON.parse(logText), null, 2);
  } catch {
    return logText;
  }
}

function toggleWebSocket() {
  if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
    disconnectWebSocket();
  } else {
    connectWebSocket();
  }
}

export function connectWebSocket() {
  const wsHost = document.getElementById('wsHost')?.value.trim() || 'localhost';
  const wsPort = document.getElementById('wsPort')?.value.trim() || '8080';
  const wsEndpointRaw = document.getElementById('wsEndpoint')?.value.trim() || '';
  const wsPassword = document.getElementById('wsPassword')?.value.trim() || '';
  const wsEndpoint = wsEndpointRaw.replace(/^\/+|\/+$/g, '');
  const wsUrl  = `ws://${wsHost}:${wsPort}${wsEndpoint ? `/${wsEndpoint}` : ''}`;

  if (!wsHost || !wsPort) { showToast('Enter host and port', 'error'); return; }

  setWSButtonState('connecting', 'Connecting...');
  setSbStatus('conn', 'Connecting...');
  sbLog('sys', `→ ${wsUrl}`);

  try {
    if (pendingGetGlobalCleanup) {
      pendingGetGlobalCleanup();
      pendingGetGlobalCleanup = null;
    }

    wsConnection = new WebSocket(wsUrl);

    wsConnection.onopen = () => {
      setWSButtonState('connected', 'Disconnect');
      setSbStatus('ok', 'Connected ✓');
      sbLog('in', 'Connection established');
      localStorage.setItem('wsHost', wsHost);
      localStorage.setItem('wsPort', wsPort);
      localStorage.setItem('wsEndpoint', wsEndpointRaw);

      if (wsPassword) {
        wsConnection.send(JSON.stringify({ type: 'Authenticate', password: wsPassword }));
        sbLog('out', 'Authenticate request sent');
      }

      showToast('Streamer.bot connected', 'success');
    };

    wsConnection.onmessage = (event) => {
      handleWSMessage(event.data);
    };

    wsConnection.onerror = () => {
      setWSButtonState('error', 'Error - Retry');
      setSbStatus('err', 'Connection error');
      sbLog('err', 'WebSocket error');
      showToast('WebSocket error', 'error');
    };

    wsConnection.onclose = (e) => {
      if (pendingGetGlobalCleanup) {
        pendingGetGlobalCleanup();
        pendingGetGlobalCleanup = null;
      }
      wsConnection = null;
      setWSButtonState('disconnected', 'Connect');
      setSbStatus('', 'Disconnected');
      sbLog('sys', `Closed (code ${e.code})`);
    };
  } catch (err) {
    setWSButtonState('error', 'Error - Retry');
    setSbStatus('err', 'Error');
    sbLog('err', err.message);
    showToast('WebSocket error: ' + err.message, 'error');
  }
}

export function disconnectWebSocket() {
  if (pendingGetGlobalCleanup) {
    pendingGetGlobalCleanup();
    pendingGetGlobalCleanup = null;
  }
  if (wsConnection) wsConnection.close();
  wsConnection = null;
  setWSButtonState('disconnected', 'Connect');
}

function setWSButtonState(status, text) {
  const btn     = document.getElementById('wsToggleBtn');
  const btnText = document.getElementById('wsBtnText');
  if (!btn) return;
  btn.className = 'btn-ws-toggle ' + status;
  if (btnText) btnText.textContent = text;
}

function handleWSMessage(data) {
  sbLog('in', data);
  try {
    const msg = JSON.parse(data);
    const kind = msg.request || msg.type;
    if (kind === 'DoAction')   handleDoAction(msg);
    else if (kind === 'GetGlobal') handleGetGlobal(msg);
    else if (kind === 'SetGlobal') handleSetGlobal(msg);
  } catch (err) {
    // non-JSON message — already logged
  }
}

function handleDoAction(msg) {
  showToast(`Action received: ${msg.source || 'unknown'}`, 'info');
}
function handleGetGlobal(msg) { console.log('GetGlobal:', msg); }
function handleSetGlobal(msg) { console.log('SetGlobal:', msg); }

const WEBWUI_ACTION_ID = '74e1d5e7-a4c8-4799-871f-f444eb8ace03';

export function saveToStreamerBot() {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    showToast('WebSocket is not connected', 'error');
    return;
  }
  try {
    const varName = getPayloadVariableName();
    const envelope = buildStreamerBotEnvelope();

    const msg = {
      request: 'DoAction',
      id:      '1',
      action:  { id: WEBWUI_ACTION_ID },
      args: {
        variableName: varName,
        JsonPayload:  JSON.stringify(envelope)
      }
    };
    wsConnection.send(JSON.stringify(msg));
    sbLog('out', `DoAction → WEBWUI handler (var: ${varName})`);
    showToast(`Payload saved to ${varName}`, 'success');
  } catch (err) {
    sbLog('err', err.message);
    showToast('Error: ' + err.message, 'error');
  }
}

export function loadFromStreamerBot() {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    showToast('WebSocket is not connected', 'error');
    return;
  }
  try {
    const varName = getPayloadVariableName();
    const requestId = `webwui:getglobal:${Date.now()}`;
    wsConnection.send(JSON.stringify({
      request: 'GetGlobal',
      id: requestId,
      variable: varName,
      persisted: true
    }));
    sbLog('out', `GetGlobal → ${varName}`);

    const handleResponse = (event) => {
      try {
        const response = JSON.parse(event.data);
        const kind = response.request || response.type;
        const matchesGetGlobal = !kind || kind === 'GetGlobal';
        const matchesRequest = response.id === requestId || response.variable === varName;
        if (matchesGetGlobal && matchesRequest) {
          if (response.status === 'error' || response.error) {
            const reason = response.error || 'Unknown Streamer.bot error';
            throw new Error(reason);
          }

          const rawPayload = getGlobalValueFromResponse(response, varName);
          const payload = parseStoredPayload(rawPayload);
          loadFromPayload(payload);
          sbLog('in', `Payload loaded from ${varName}`);
          showToast(`Payload loaded from ${varName}`, 'success');
          wsConnection.removeEventListener('message', handleResponse);
        }
      } catch (err) {
        sbLog('err', err.message || String(err));
        showToast(`Load failed: ${err.message || 'invalid payload'}`, 'error');
        wsConnection.removeEventListener('message', handleResponse);
      }
    };

    const activeSocket = wsConnection;
    activeSocket.addEventListener('message', handleResponse);

    const timeoutId = setTimeout(() => {
      activeSocket.removeEventListener('message', handleResponse);
      if (pendingGetGlobalCleanup === cleanup) {
        pendingGetGlobalCleanup = null;
      }
    }, 5000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      activeSocket.removeEventListener('message', handleResponse);
    };

    pendingGetGlobalCleanup = cleanup;
  } catch (err) {
    sbLog('err', err.message);
    showToast('Error: ' + err.message, 'error');
  }
}

function getGlobalValueFromResponse(response, varName) {
  if (typeof response.value !== 'undefined') {
    return response.value;
  }

  if (response.variables && response.variables[varName] && typeof response.variables[varName].value !== 'undefined') {
    return response.variables[varName].value;
  }

  if (response.variable && typeof response.variable.value !== 'undefined') {
    return response.variable.value;
  }

  throw new Error('No variable value found in Streamer.bot response');
}

function parseStoredPayload(rawValue) {
  let parsed = rawValue;

  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid payload format');
  }

  // v1/v2 wrapped format: { payload, WebHookUrl, validation }
  if (Object.prototype.hasOwnProperty.call(parsed, 'payload')) {
    let inner = parsed.payload;
    if (typeof inner === 'string') {
      inner = JSON.parse(inner);
    }
    if (inner && typeof inner === 'object') {
      return inner;
    }
    throw new Error('Invalid wrapped payload format');
  }

  // Raw Discord payload format
  return parsed;
}

function getPayloadVariableName() {
  const input = document.getElementById('payloadName');
  return input?.value?.trim() || 'WebUIPayload';
}
