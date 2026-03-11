// Shared utility functions
export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export function intToHex(num) {
  return '#' + (num !== undefined ? num.toString(16).padStart(6, '0') : '5865f2');
}

export function noNewLine(ev) {
  if (ev.key === 'Enter') ev.preventDefault();
}

// Toast notifications
export function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.add('show');

  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}

// Timestamp helpers
export const AUTO_TIMESTAMP_TOKEN = '__AUTO_TIMESTAMP__';

export function formatEmbedTimestamp(isoString) {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '';

  const day = dt.toLocaleDateString('en-US');
  const hh = pad(dt.getHours());
  const mm = pad(dt.getMinutes());
  return `${day} at ${hh}:${mm}`;
}

export function normalizeLoadedEmbedTimestamp(rawTimestamp) {
  if (rawTimestamp === AUTO_TIMESTAMP_TOKEN) {
    return {
      timestampMode: 'auto',
      timestampCustom: ''
    };
  }

  const dt = new Date(rawTimestamp || '');
  if (!Number.isNaN(dt.getTime())) {
    return {
      timestampMode: 'custom',
      timestampCustom: dt.toISOString()
    };
  }

  return {
    timestampMode: 'none',
    timestampCustom: ''
  };
}

export function getEmbedTimestampForPayload(embed) {
  if (embed.timestampMode === 'auto') {
    return AUTO_TIMESTAMP_TOKEN;
  }

  if (embed.timestampMode === 'custom') {
    const dt = new Date(embed.timestampCustom || '');
    return Number.isNaN(dt.getTime()) ? '' : dt.toISOString();
  }

  const legacy = new Date(embed.timestamp || '');
  return Number.isNaN(legacy.getTime()) ? '' : legacy.toISOString();
}

export function getEmbedTimestampForPreview(embed) {
  const ts = getEmbedTimestampForPayload(embed);
  if (ts === AUTO_TIMESTAMP_TOKEN) {
    return new Date().toISOString();
  }
  return ts;
}

export function toDateTimeLocalValue(value) {
  const dt = new Date(value || '');
  if (Number.isNaN(dt.getTime())) return '';

  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function updateTimestamp() {
  const n = new Date();
  const t = `Today at ${pad(n.getHours())}:${pad(n.getMinutes())}`;

  const el = document.getElementById('tsEl');
  if (el) el.textContent = t;
}

export function initTimestamp() {
  updateTimestamp();
  setInterval(updateTimestamp, 30000);
}
