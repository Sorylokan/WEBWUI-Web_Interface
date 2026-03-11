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

export function collectPayload() {
  const payload = {};

  const username = document.getElementById('usernameEl')?.innerText.trim() || '';
  const avatar = state.avatarUrl;

  if (username) payload.username = username;
  if (avatar) payload.avatar_url = avatar;

  const content = state.messageContent.trim();
  if (content) payload.content = content;

  if (state.embeds.length) {
    payload.embeds = state.embeds.map(embed => {
      const obj = { color: hexToInt(embed.color) };

      if (embed.authorName || embed.authorIconUrl || embed.authorUrl) {
        obj.author = {};
        if (embed.authorName) obj.author.name = embed.authorName;
        if (embed.authorUrl) obj.author.url = embed.authorUrl;
        if (embed.authorIconUrl) obj.author.icon_url = embed.authorIconUrl;
      }

      if (embed.title) {
        obj.title = embed.title;
        if (embed.titleUrl) obj.url = embed.titleUrl;
      }

      if (embed.desc) obj.description = embed.desc;
      if (embed.thumbnailUrl) obj.thumbnail = { url: embed.thumbnailUrl };
      if (embed.imageUrl) obj.image = { url: embed.imageUrl };

      const validFields = embed.fields.filter(field => field.name || field.value);
      if (validFields.length) {
        obj.fields = validFields.map(field => ({
          name: field.name || '',
          value: field.value || '',
          inline: !!field.inline
        }));
      }

      if (embed.footerText || embed.footerIconUrl) {
        obj.footer = {};
        if (embed.footerText) obj.footer.text = embed.footerText;
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

export function copyJson() {
  navigator.clipboard
    .writeText(JSON.stringify(collectPayload(), null, 2))
    .then(() => showToast('Copied', 'info'))
    .catch(() => showToast('Copy failed', 'error'));
}
