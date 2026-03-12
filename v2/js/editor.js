// Editor interactions: mode, popover, and input handlers
import { state } from './state.js';
import { renderAllEmbeds, renderMarkdown, updateAvatar, getEmbed } from './discord.js';
import { updateJsonPanel } from './payload.js';

const DISCORD_LIMITS = {
  CONTENT: 2000,
  USERNAME: 80
};

function clampText(raw, max, { trim = false } = {}) {
  let next = typeof raw === 'string' ? raw : '';
  if (trim) next = next.trim();
  if (next.length > max) next = next.slice(0, max);
  return next;
}

let colorPickerInput = null;
let colorPickerHandler = null;

const popoverDefs = {
  avatar: { label: 'Bot avatar URL', storeKey: null },
  authorIcon: { label: 'Author icon URL', storeKey: 'authorIconUrl' },
  authorUrl: { label: 'Author URL', storeKey: 'authorUrl' },
  titleUrl: { label: 'Title URL', storeKey: 'titleUrl' },
  image: { label: 'Main image URL', storeKey: 'imageUrl' },
  thumbnail: { label: 'Thumbnail URL', storeKey: 'thumbnailUrl' },
  footerIcon: { label: 'Footer icon URL', storeKey: 'footerIconUrl' }
};

export function renderMessageContent() {
  const msgEl = document.getElementById('msgTextEl');
  if (!msgEl) return;

  if (state.isEditMode) {
    msgEl.innerText = state.messageContent;
  } else {
    msgEl.innerHTML = renderMarkdown(state.messageContent);
  }
}

export function onInput() {
  const userEl = document.getElementById('usernameEl');
  if (state.isEditMode && userEl?.isContentEditable) {
    const username = clampText(userEl.innerText, DISCORD_LIMITS.USERNAME);
    if (userEl.innerText !== username) userEl.innerText = username;
  }

  const msgEl = document.getElementById('msgTextEl');
  if (state.isEditMode && msgEl?.isContentEditable) {
    state.messageContent = clampText(msgEl.innerText, DISCORD_LIMITS.CONTENT);
    if (msgEl.innerText !== state.messageContent) msgEl.innerText = state.messageContent;
  }

  if (!state.avatarUrl) {
    updateAvatar();
  }

  if (state.currentTab === 'json') {
    updateJsonPanel();
  }
}

export function setMode(mode) {
  state.isEditMode = mode === 'edit';
  applyMode();
  if (state.currentTab === 'json') {
    updateJsonPanel();
  }
}

function applyMode() {
  const main = document.getElementById('mainArea');
  const msg = document.getElementById('theMsg');

  main?.classList.toggle('edit-mode', state.isEditMode);
  main?.classList.toggle('preview-mode', !state.isEditMode);
  msg?.classList.toggle('edit-mode', state.isEditMode);

  document.getElementById('pill-edit')?.classList.toggle('active', state.isEditMode);
  document.getElementById('pill-preview')?.classList.toggle('active', !state.isEditMode);

  const ce = state.isEditMode ? 'true' : 'false';
  ['usernameEl', 'msgTextEl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.contentEditable = ce;
  });

  renderMessageContent();
  renderAllEmbeds();
}

export function openPopover(type, embedId, ev) {
  state.popoverContext = { type, embedId };
  const def = popoverDefs[type];
  if (!def) return;

  const label = document.getElementById('popLabel');
  const input = document.getElementById('popInput');
  const pop = document.getElementById('popover');
  if (!label || !input || !pop) return;

  label.textContent = def.label;

  let currentVal = '';
  if (type === 'avatar') {
    currentVal = state.avatarUrl;
  } else {
    const embed = getEmbed(embedId);
    if (embed) currentVal = embed[def.storeKey] || '';
  }

  input.value = currentVal;
  pop.classList.add('open');

  if (ev) {
    const PW = 320, PH = 130, M = 10;
    let x = ev.clientX + M;
    let y = ev.clientY + M;
    if (x + PW > window.innerWidth - M) x = ev.clientX - PW - M;
    if (y + PH > window.innerHeight - M) y = ev.clientY - PH - M;
    pop.style.left = `${Math.max(M, x)}px`;
    pop.style.top = `${Math.max(M, y)}px`;
    pop.style.transform = 'none';
  } else {
    pop.style.top = '50%';
    pop.style.left = '50%';
    pop.style.transform = 'translate(-50%,-50%)';
  }

  setTimeout(() => input.focus(), 30);
}

export function closePopover() {
  document.getElementById('popover')?.classList.remove('open');
  state.popoverContext = null;
}

export function confirmPopover() {
  if (!state.popoverContext) return;

  const { type, embedId } = state.popoverContext;
  const val = document.getElementById('popInput')?.value.trim() || '';
  const def = popoverDefs[type];

  if (type === 'avatar') {
    state.avatarUrl = val;
    updateAvatar();
  } else {
    const embed = getEmbed(embedId);
    if (embed && def.storeKey) {
      embed[def.storeKey] = val;
      renderAllEmbeds();
    }
  }

  onInput();
  closePopover();
}

export function handlePopoverKey(ev) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    confirmPopover();
  }
  if (ev.key === 'Escape') {
    closePopover();
  }
}

export function initPopoverClickOutside() {
  document.addEventListener('click', ev => {
    const pop = document.getElementById('popover');
    if (!pop) return;

    if (
      pop.classList.contains('open') &&
      !pop.contains(ev.target) &&
      !ev.target.closest('.dc-embed-bar') &&
      !ev.target.closest('.dc-avatar') &&
      !ev.target.closest('.dc-embed-author-icon') &&
      !ev.target.closest('.dc-author-icon-ph') &&
      !ev.target.closest('.dc-embed-thumbnail-img') &&
      !ev.target.closest('.dc-thumb-ph') &&
      !ev.target.closest('.dc-embed-image') &&
      !ev.target.closest('.dc-img-ph') &&
      !ev.target.closest('.dc-embed-footer-icon') &&
      !ev.target.closest('.dc-footer-icon-ph')
    ) {
      closePopover();
    }
  });
}

export function openColorPicker(ev, currentColor, onChange) {
  if (!colorPickerInput) {
    colorPickerInput = document.createElement('input');
    colorPickerInput.type = 'color';
    colorPickerInput.className = 'floating-color-input';
    colorPickerInput.addEventListener('input', () => {
      if (colorPickerHandler) colorPickerHandler(colorPickerInput.value);
    });
    colorPickerInput.addEventListener('change', () => {
      if (colorPickerHandler) colorPickerHandler(colorPickerInput.value);
    });
    document.body.appendChild(colorPickerInput);
  }

  colorPickerHandler = onChange;
  colorPickerInput.value = currentColor || '#5865f2';
  colorPickerInput.style.left = `${Math.min(ev.clientX, window.innerWidth - 2)}px`;
  colorPickerInput.style.top = `${Math.min(ev.clientY, window.innerHeight - 2)}px`;

  requestAnimationFrame(() => {
    if (typeof colorPickerInput.showPicker === 'function') {
      colorPickerInput.showPicker();
    } else {
      colorPickerInput.click();
    }
  });
}
