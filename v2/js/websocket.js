// WebSocket Streamer.bot integration
import { collectPayload, loadFromPayload } from './payload.js';
import { showToast } from './utils.js';

export let wsConnection = null;
let pendingGetGlobalCleanup = null;

/* ── helpers ── */
function pad(n) { return String(n).padStart(2, '0'); }

function sbLog(type, msg) {
  const log = document.getElementById('sbLog');
  if (!log) return;
  const now = new Date();
  const ts  = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const entry = document.createElement('div');
  entry.className = 'sl-entry';
  entry.innerHTML = `<span class="sl-ts">${ts}</span><span class="sl-msg ${type}">${esc(msg)}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 80) log.removeChild(log.firstChild);
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

  wsToggleBtn.onclick = toggleWebSocket;
  if (wsSaveBtn) wsSaveBtn.onclick = () => saveToStreamerBot();
  if (wsLoadBtn) wsLoadBtn.onclick = () => loadFromStreamerBot();

  // Auto-reconnect if host/port were saved
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
  sbLog('in', data.length > 100 ? data.substring(0, 100) + '…' : data);
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'DoAction')   handleDoAction(msg);
    else if (msg.type === 'GetGlobal') handleGetGlobal(msg);
    else if (msg.type === 'SetGlobal') handleSetGlobal(msg);
  } catch (err) {
    // non-JSON message — already logged
  }
}

function handleDoAction(msg) {
  showToast(`Action received: ${msg.source || 'unknown'}`, 'info');
}
function handleGetGlobal(msg) { console.log('GetGlobal:', msg); }
function handleSetGlobal(msg) { console.log('SetGlobal:', msg); }

export function saveToStreamerBot() {
  if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
    showToast('WebSocket is not connected', 'error');
    return;
  }
  try {
    const varName = getPayloadVariableName();
    const payload = collectPayload();
    const msg = {
      type:     'SetGlobal',
      variable: varName,
      value:    JSON.stringify(payload)
    };
    wsConnection.send(JSON.stringify(msg));
    sbLog('out', `SetGlobal → ${varName}`);
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
    wsConnection.send(JSON.stringify({ type: 'GetGlobal', variable: varName }));
    sbLog('out', `GetGlobal → ${varName}`);

    const handleResponse = (event) => {
      try {
        const response = JSON.parse(event.data);
        if (response.type === 'GetGlobal' && response.variable === varName) {
          const payload = JSON.parse(response.value);
          loadFromPayload(payload);
          sbLog('in', `Payload loaded from ${varName}`);
          showToast(`Payload loaded from ${varName}`, 'success');
          wsConnection.removeEventListener('message', handleResponse);
        }
      } catch (err) { /* ignore */ }
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

function getPayloadVariableName() {
  const input = document.getElementById('payloadName');
  return input?.value?.trim() || 'WebUIPayload';
}
