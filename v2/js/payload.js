// Payload build/load/panel/io
import { state } from './state.js';
import {
  hexToInt,
  intToHex,
  getEmbedTimestampForPayload,
  normalizeLoadedEmbedTimestamp,
  showToast
} from './utils.js';
import { renderAllEmbeds, updateAvatar } from './discord.js';
import { onInput, renderMessageContent } from './editor.js';

const DISCORD_LIMITS = {
  CONTENT: 2000,
  USERNAME: 80,
  EMBEDS_MAX: 10,
  AUTHOR_NAME: 256,
  TITLE: 256,
  DESCRIPTION: 4096,
  FIELD_NAME: 256,
  FIELD_VALUE: 1024,
  FIELDS_MAX: 25,
  FOOTER_TEXT: 2048
};

function clampText(raw, max, { trim = false } = {}) {
  let next = typeof raw === 'string' ? raw : '';
  if (trim) next = next.trim();
  if (next.length > max) next = next.slice(0, max);
  return next;
}

export function collectPayload() {
  const payload = {};

  const username = clampText(document.getElementById('usernameEl')?.innerText || '', DISCORD_LIMITS.USERNAME, { trim: true });
  const avatar = state.avatarUrl;

  if (username) payload.username = username;
  if (avatar) payload.avatar_url = avatar;

  const content = clampText(state.messageContent, DISCORD_LIMITS.CONTENT, { trim: true });
  if (content) payload.content = content;

  if (state.embeds.length) {
    payload.embeds = state.embeds.slice(0, DISCORD_LIMITS.EMBEDS_MAX).map(embed => {
      const obj = { color: hexToInt(embed.color) };

      if (embed.authorName || embed.authorIconUrl || embed.authorUrl) {
        obj.author = {};
        const authorName = clampText(embed.authorName, DISCORD_LIMITS.AUTHOR_NAME, { trim: true });
        if (authorName) obj.author.name = authorName;
        if (embed.authorUrl) obj.author.url = embed.authorUrl;
        if (embed.authorIconUrl) obj.author.icon_url = embed.authorIconUrl;
      }

      const title = clampText(embed.title, DISCORD_LIMITS.TITLE, { trim: true });
      if (title) {
        obj.title = title;
        if (embed.titleUrl) obj.url = embed.titleUrl;
      }

      const description = clampText(embed.desc, DISCORD_LIMITS.DESCRIPTION);
      if (description) obj.description = description;
      if (embed.thumbnailUrl) obj.thumbnail = { url: embed.thumbnailUrl };
      if (embed.imageUrl) obj.image = { url: embed.imageUrl };

      const validFields = embed.fields.filter(field => field.name || field.value).slice(0, DISCORD_LIMITS.FIELDS_MAX);
      if (validFields.length) {
        obj.fields = validFields.map(field => ({
          name: clampText(field.name, DISCORD_LIMITS.FIELD_NAME, { trim: true }) || '',
          value: clampText(field.value, DISCORD_LIMITS.FIELD_VALUE) || '',
          inline: !!field.inline
        }));
      }

      if (embed.footerText || embed.footerIconUrl) {
        obj.footer = {};
        const footerText = clampText(embed.footerText, DISCORD_LIMITS.FOOTER_TEXT, { trim: true });
        if (footerText) obj.footer.text = footerText;
        if (embed.footerIconUrl) obj.footer.icon_url = embed.footerIconUrl;
      }

      const timestamp = getEmbedTimestampForPayload(embed);
      if (timestamp) obj.timestamp = timestamp;

      return obj;
    }).filter(obj => {
      // Discord rejects embeds that have only a color and nothing else
      const { color, ...rest } = obj;
      return Object.keys(rest).length > 0;
    });
  }

  return payload;
}

export function loadFromPayload(input) {
  const payload = input && typeof input === 'object' ? input : {};

  const usernameEl = document.getElementById('usernameEl');
  if (usernameEl) usernameEl.innerText = payload.username || '';

  state.avatarUrl = payload.avatar_url || '';
  updateAvatar();

  state.messageContent = payload.content || '';
  renderMessageContent();

  state.embeds = (payload.embeds || []).map(embed => {
    const color = intToHex(embed.color);
    const timestampState = normalizeLoadedEmbedTimestamp(embed.timestamp || '');

    return {
      id: ++state.embedIdCounter,
      color,
      authorName: embed.author?.name || '',
      authorUrl: embed.author?.url || '',
      authorIconUrl: embed.author?.icon_url || '',
      title: embed.title || '',
      titleUrl: embed.url || '',
      desc: embed.description || '',
      thumbnailUrl: embed.thumbnail?.url || '',
      imageUrl: embed.image?.url || '',
      fields: (embed.fields || []).map(field => ({
        id: ++state.fieldIdCounter,
        name: field.name || '',
        value: field.value || '',
        inline: !!field.inline
      })),
      footerText: embed.footer?.text || '',
      footerIconUrl: embed.footer?.icon_url || '',
      timestamp: embed.timestamp || '',
      timestampMode: timestampState.timestampMode,
      timestampCustom: timestampState.timestampCustom
    };
  });

  state.embedIdCounter = state.embeds.reduce((max, embed) => Math.max(max, embed.id), 0);
  state.fieldIdCounter = state.embeds.reduce((max, embed) => {
    const localMax = embed.fields.reduce((fMax, field) => Math.max(fMax, field.id), 0);
    return Math.max(max, localMax);
  }, 0);

  renderAllEmbeds();
  onInput();
}

export function updateJsonPanel() {
  const ta = document.getElementById('jsonOut');
  if (!ta) return;

  if (document.activeElement === ta) return;
  ta.value = JSON.stringify(collectPayload(), null, 2);
}

export function onJsonEdit() {
  clearTimeout(state.jsonTimer);
  state.jsonTimer = setTimeout(() => {
    try {
      const payload = JSON.parse(document.getElementById('jsonOut').value);
      loadFromPayload(payload);
    } catch (err) {
      // Invalid JSON ignored while user types.
    }
  }, 700);
}

export function exportJson() {
  const blob = new Blob([JSON.stringify(collectPayload(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'embed.json';
  a.click();
  showToast('Exported', 'success');
}

export function importJson() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';

  inp.onchange = ev => {
    const file = ev.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        loadFromPayload(JSON.parse(e.target.result));
        updateJsonPanel();
        showToast('Imported', 'success');
      } catch (error) {
        showToast('Invalid JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  inp.click();
}

export function buildStreamerBotEnvelope() {
  const webhookUrl = document.getElementById('whUrl')?.value.trim() || '';
  return {
    payload: collectPayload(),
    WebHookUrl: webhookUrl,
    validation: { isValid: true, errors: [], warnings: [] }
  };
}

export function copyRawJson() {
  navigator.clipboard
    .writeText(JSON.stringify(collectPayload(), null, 2))
    .then(() => showToast('Raw JSON copied', 'info'))
    .catch(() => showToast('Copy failed', 'error'));
}

export function copyAsPayload() {
  navigator.clipboard
    .writeText(JSON.stringify(buildStreamerBotEnvelope()))
    .then(() => showToast('Payload format copied', 'info'))
    .catch(() => showToast('Copy failed', 'error'));
}
