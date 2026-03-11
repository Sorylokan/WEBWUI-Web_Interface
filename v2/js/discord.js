// Discord message/embed rendering and data operations
import { state } from './state.js';
import {
  esc,
  noNewLine,
  formatEmbedTimestamp,
  getEmbedTimestampForPreview,
  toDateTimeLocalValue,
  showToast
} from './utils.js';
import { onInput, openColorPicker, openPopover } from './editor.js';

const DISCORD_LIMITS = {
  EMBEDS_MAX: 10,
  FIELDS_MAX: 25,
  AUTHOR_NAME: 256,
  TITLE: 256,
  DESCRIPTION: 4096,
  FIELD_NAME: 256,
  FIELD_VALUE: 1024,
  FOOTER_TEXT: 2048
};

function clampText(raw, max, { trim = false } = {}) {
  let next = typeof raw === 'string' ? raw : '';
  if (trim) next = next.trim();
  if (next.length > max) next = next.slice(0, max);
  return next;
}

function clampEditableText(el, max, { trim = false } = {}) {
  const next = clampText(el?.innerText || '', max, { trim });
  if (el && el.innerText !== next) {
    el.innerText = next;
  }
  return next;
}

// Markdown parser for Discord syntax
export function renderMarkdown(text) {
  if (!text) return '';

  let t = esc(text);

  t = t.replace(/```(?:\w*\n)?([\s\S]*?)```/g, (_, c) => `<code class="md-cb">${c.trimEnd()}</code>`);
  t = t.replace(/`([^`\n]+)`/g, '<code class="md-c">$1</code>');

  t = t.replace(/^### (.+)$/gm, '<span class="md-h3">$1</span>');
  t = t.replace(/^## (.+)$/gm, '<span class="md-h2">$1</span>');
  t = t.replace(/^# (.+)$/gm, '<span class="md-h1">$1</span>');

  t = t.replace(/^&gt; (.+)$/gm, '<span class="md-q">$1</span>');

  t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="md-b"><em class="md-i">$1</em></strong>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong class="md-b">$1</strong>');

  t = t.replace(/__([^_\n]+)__/g, '<span class="md-u">$1</span>');
  t = t.replace(/\*([^*\n]+)\*/g, '<em class="md-i">$1</em>');
  t = t.replace(/_([^_\n]+)_/g, '<em class="md-i">$1</em>');

  t = t.replace(/~~(.+?)~~/g, '<span class="md-s">$1</span>');
  t = t.replace(/\|\|(.+?)\|\|/g, '<span class="md-sp">$1</span>');

  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  t = t.replace(/\n/g, '<br>');

  return t;
}

export function updateAvatar() {
  const name = (document.getElementById('usernameEl')?.innerText || '').trim() || 'W';
  const letter = name[0].toUpperCase();
  const el = document.getElementById('dcAvatar');

  if (!el) return;

  if (state.avatarUrl) {
    const tip = el.querySelector('.av-tip');
    el.querySelector('img')?.remove();

    let letterEl = el.querySelector('#avatarLetter');
    if (!letterEl) {
      letterEl = document.createElement('span');
      letterEl.id = 'avatarLetter';
      el.insertBefore(letterEl, tip || null);
    }

    const img = document.createElement('img');
    img.src = esc(state.avatarUrl);
    img.alt = '';
    img.onerror = () => {
      state.avatarUrl = '';
      updateAvatar();
    };

    letterEl.style.display = 'none';
    el.insertBefore(img, tip || null);
  } else {
    el.querySelector('img')?.remove();
    let letterEl = el.querySelector('#avatarLetter');
    if (!letterEl) {
      letterEl = document.createElement('span');
      letterEl.id = 'avatarLetter';
      el.insertBefore(letterEl, el.querySelector('.av-tip') || null);
    }
    letterEl.style.display = '';
    letterEl.textContent = letter;
  }
}

export function addEmbed() {
  if (state.embeds.length >= DISCORD_LIMITS.EMBEDS_MAX) {
    showToast('Maximum 10 embeds per message', 'error');
    return;
  }

  const id = ++state.embedIdCounter;
  state.embeds.push({
    id,
    color: '#5865f2',
    authorName: '',
    authorUrl: '',
    authorIconUrl: '',
    title: '',
    titleUrl: '',
    desc: '',
    thumbnailUrl: '',
    imageUrl: '',
    fields: [],
    footerText: '',
    footerIconUrl: '',
    timestamp: '',
    timestampMode: 'none',
    timestampCustom: ''
  });
  renderAllEmbeds();
  onInput();
}

function embedHasContent(embed) {
  return !!(
    embed.authorName || embed.authorIconUrl || embed.authorUrl ||
    embed.title || embed.desc || embed.thumbnailUrl || embed.imageUrl ||
    embed.footerText || embed.footerIconUrl ||
    embed.fields.some(f => f.name || f.value)
  );
}

export function removeEmbed(id) {
  state.embeds = state.embeds.filter(e => e.id !== id);
  renderAllEmbeds();
  onInput();
}

export function getEmbed(id) {
  return state.embeds.find(e => e.id === id);
}

export function addField(embedId) {
  const e = getEmbed(embedId);
  if (!e) return;

  if (e.fields.length >= DISCORD_LIMITS.FIELDS_MAX) {
    showToast('Maximum 25 fields per embed', 'error');
    return;
  }

  e.fields.push({
    id: ++state.fieldIdCounter,
    name: '',
    value: '',
    inline: false
  });

  renderAllEmbeds();
}

export function removeField(embedId, fieldId) {
  const e = getEmbed(embedId);
  if (!e) return;

  e.fields = e.fields.filter(f => f.id !== fieldId);
  renderAllEmbeds();
}

export function setFieldInline(embedId, fieldId, val) {
  const e = getEmbed(embedId);
  if (!e) return;

  const f = e.fields.find(field => field.id === fieldId);
  if (f) {
    f.inline = val;
    renderAllEmbeds();
  }
}

export function renderAllEmbeds() {
  const container = document.getElementById('embedsContainer');
  if (!container) return;

  const imageCache = buildImageCache(container);
  container.replaceChildren(...state.embeds.map(embed => buildEmbedElement(embed, imageCache)));
}

function buildImageCache(container) {
  return new Map(
    Array.from(container.querySelectorAll('img[data-cache-key]')).map(img => [img.dataset.cacheKey, img])
  );
}

function getCachedImage(imageCache, cacheKey, className, src, onClick, onError) {
  const img = imageCache.get(cacheKey) || document.createElement('img');
  img.dataset.cacheKey = cacheKey;
  img.className = className;
  if (img.src !== src) img.src = src;
  img.onclick = onClick;
  img.onerror = onError;
  img.decoding = 'async';
  img.loading = 'eager';
  return img;
}

function buildEmbedElement(embed, imageCache) {
  const wrap = document.createElement('div');
  wrap.className = 'dc-embed';
  wrap.id = `embed-${embed.id}`;
  wrap.style.setProperty('--embed-color', embed.color);
  wrap.style.borderLeftColor = embed.color;

  if (state.isEditMode) {
    const colorBtn = document.createElement('button');
    colorBtn.className = 'embed-color-btn';
    colorBtn.title = 'Change embed color';
    colorBtn.type = 'button';
    colorBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 1 0 9 9c0-.55-.45-1-1-1h-3.28a2.5 2.5 0 0 1 0-5H20c.55 0 1-.45 1-1a9 9 0 0 0-9-2z"/></svg>`;
    colorBtn.onclick = ev => {
      ev.stopPropagation();
      openColorPicker(ev, embed.color, nextColor => {
        embed.color = nextColor;
        wrap.style.setProperty('--embed-color', embed.color);
        wrap.style.borderLeftColor = embed.color;
        onInput();
      });
    };
    wrap.appendChild(colorBtn);
  }

  const content = document.createElement('div');
  content.className = 'dc-embed-content cf';
  if (embed.thumbnailUrl || (state.isEditMode && !embed.thumbnailUrl)) {
    content.classList.add('has-thumbnail');
  }

  appendThumbnail(content, embed, imageCache);
  appendAuthor(content, embed, imageCache);
  appendTitle(content, embed);
  appendDescription(content, embed);
  appendFields(content, embed);
  appendImage(content, embed, imageCache);
  appendFooter(content, embed, imageCache);

  wrap.appendChild(content);

  const delBtn = document.createElement('button');
  delBtn.className = 'embed-del-btn';
  delBtn.innerHTML = 'x';
  delBtn.title = 'Delete embed';
  delBtn.onclick = () => {
    if (embedHasContent(embed) && !confirm('Delete this embed?')) return;
    removeEmbed(embed.id);
  };
  wrap.appendChild(delBtn);

  return wrap;
}

function appendThumbnail(content, embed, imageCache) {
  const thumbZone = document.createElement('div');
  thumbZone.className = 'dc-embed-thumbnail-slot';

  if (embed.thumbnailUrl) {
    const img = getCachedImage(
      imageCache,
      `embed:${embed.id}:thumbnail`,
      'dc-embed-thumbnail-img',
      embed.thumbnailUrl,
      ev => state.isEditMode && openPopover('thumbnail', embed.id, ev),
      () => {
        embed.thumbnailUrl = '';
        renderAllEmbeds();
      }
    );
    thumbZone.appendChild(img);
  } else if (state.isEditMode) {
    const ph = document.createElement('div');
    ph.className = 'dc-thumb-ph';
    ph.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Thumbnail`;
    ph.onclick = ev => openPopover('thumbnail', embed.id, ev);
    thumbZone.appendChild(ph);
  }

  if (thumbZone.hasChildNodes()) content.appendChild(thumbZone);
}

function appendAuthor(content, embed, imageCache) {
  const authorRow = document.createElement('div');
  authorRow.className = 'dc-embed-author';

  if (embed.authorIconUrl) {
    const img = getCachedImage(
      imageCache,
      `embed:${embed.id}:author-icon`,
      'dc-embed-author-icon',
      embed.authorIconUrl,
      ev => state.isEditMode && openPopover('authorIcon', embed.id, ev),
      () => {
        embed.authorIconUrl = '';
        renderAllEmbeds();
      }
    );
    authorRow.appendChild(img);
  } else if (state.isEditMode) {
    const ph = document.createElement('div');
    ph.className = 'dc-author-icon-ph';
    ph.title = 'Author icon';
    ph.textContent = '+';
    ph.onclick = ev => openPopover('authorIcon', embed.id, ev);
    authorRow.appendChild(ph);
  }

  const authorName = document.createElement('span');
  authorName.className = 'dc-embed-author-name';
  authorName.contentEditable = state.isEditMode ? 'true' : 'false';
  authorName.dataset.ph = 'Author name';

  if (state.isEditMode) {
    authorName.innerText = embed.authorName;
  } else {
    authorName.textContent = embed.authorName;
  }

  authorName.oninput = () => {
    embed.authorName = clampEditableText(authorName, DISCORD_LIMITS.AUTHOR_NAME, { trim: true });
    onInput();
  };
  authorName.onkeydown = noNewLine;
  authorName.ondblclick = ev => state.isEditMode && openPopover('authorUrl', embed.id, ev);

  if (embed.authorUrl && !state.isEditMode) {
    const a = document.createElement('a');
    a.href = embed.authorUrl;
    a.target = '_blank';
    a.rel = 'noreferrer noopener';
    a.appendChild(authorName);
    authorRow.appendChild(a);
  } else if (state.isEditMode) {
    const nameWrap = document.createElement('div');
    nameWrap.className = 'embed-linkable';
    nameWrap.appendChild(authorName);

    const linkBtn = document.createElement('button');
    linkBtn.className = 'embed-link-btn' + (embed.authorUrl ? ' has-url' : '');
    linkBtn.title = embed.authorUrl ? `URL: ${embed.authorUrl}` : 'Add author URL';
    linkBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    linkBtn.onclick = ev => { ev.stopPropagation(); openPopover('authorUrl', embed.id, ev); };
    nameWrap.appendChild(linkBtn);
    authorRow.appendChild(nameWrap);
  } else {
    authorRow.appendChild(authorName);
  }

  if (embed.authorName || embed.authorIconUrl || state.isEditMode) {
    content.appendChild(authorRow);
  }
}

function appendTitle(content, embed) {
  if (!state.isEditMode && !embed.title) return;

  const titleEl = document.createElement('div');
  titleEl.className = 'dc-embed-title' + (embed.titleUrl ? '' : ' no-url');

  if (state.isEditMode) {
    titleEl.contentEditable = 'true';
    titleEl.dataset.ph = 'Embed title';
    titleEl.innerText = embed.title;
    titleEl.oninput = () => {
      embed.title = clampEditableText(titleEl, DISCORD_LIMITS.TITLE, { trim: true });
      onInput();
    };
    titleEl.onkeydown = noNewLine;
    titleEl.ondblclick = ev => state.isEditMode && openPopover('titleUrl', embed.id, ev);
    titleEl.title = 'Double-click to add a link';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'embed-linkable';
    titleWrap.appendChild(titleEl);

    const linkBtn = document.createElement('button');
    linkBtn.className = 'embed-link-btn' + (embed.titleUrl ? ' has-url' : '');
    linkBtn.title = embed.titleUrl ? `URL: ${embed.titleUrl}` : 'Add title URL';
    linkBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
    linkBtn.onclick = ev => { ev.stopPropagation(); openPopover('titleUrl', embed.id, ev); };
    titleWrap.appendChild(linkBtn);
    content.appendChild(titleWrap);
  } else if (embed.titleUrl) {
    const link = document.createElement('a');
    link.className = 'dc-embed-title-link';
    link.href = embed.titleUrl;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.innerHTML = renderMarkdown(embed.title);
    titleEl.appendChild(link);
    content.appendChild(titleEl);
  } else {
    titleEl.innerHTML = renderMarkdown(embed.title);
    content.appendChild(titleEl);
  }
}

function appendDescription(content, embed) {
  if (!state.isEditMode && !embed.desc) return;

  const descEl = document.createElement('div');
  descEl.className = 'dc-embed-desc';
  descEl.contentEditable = state.isEditMode ? 'true' : 'false';
  descEl.dataset.ph = 'Description... (Markdown supported)';

  if (state.isEditMode) {
    descEl.innerText = embed.desc;
  } else {
    descEl.innerHTML = renderMarkdown(embed.desc);
  }

  descEl.oninput = () => {
    embed.desc = clampEditableText(descEl, DISCORD_LIMITS.DESCRIPTION);
    onInput();
  };
  content.appendChild(descEl);
}

function appendFields(content, embed) {
  if (embed.fields.length === 0 && !state.isEditMode) return;

  const fieldsGrid = document.createElement('div');
  fieldsGrid.className = 'dc-embed-fields';

  embed.fields.forEach(field => {
    const fd = document.createElement('div');
    fd.className = 'dc-field' + (field.inline ? ' inline' : '');

    if (state.isEditMode) {
      const tb = document.createElement('div');
      tb.className = 'field-tools';

      const inlineWrap = document.createElement('label');
      inlineWrap.className = 'field-tool-btn field-tool-inline';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = field.inline;
      cb.onchange = () => setFieldInline(embed.id, field.id, cb.checked);
      const cbLabel = document.createElement('span');
      cbLabel.textContent = 'Inline';
      inlineWrap.appendChild(cb);
      inlineWrap.appendChild(cbLabel);
      tb.appendChild(inlineWrap);

      const delBtn = document.createElement('button');
      delBtn.className = 'field-tool-btn del';
      delBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      delBtn.onclick = () => removeField(embed.id, field.id);
      tb.appendChild(delBtn);
      fd.appendChild(tb);
    }

    const fnEl = document.createElement('div');
    fnEl.className = 'dc-field-name';
    fnEl.contentEditable = state.isEditMode ? 'true' : 'false';
    fnEl.dataset.ph = 'Field name';
    if (state.isEditMode) {
      fnEl.innerText = field.name;
    } else {
      fnEl.innerHTML = renderMarkdown(field.name);
    }
    fnEl.oninput = () => {
      field.name = clampEditableText(fnEl, DISCORD_LIMITS.FIELD_NAME, { trim: true });
      onInput();
    };
    fnEl.onkeydown = noNewLine;
    fd.appendChild(fnEl);

    const fvEl = document.createElement('div');
    fvEl.className = 'dc-field-value';
    fvEl.contentEditable = state.isEditMode ? 'true' : 'false';
    fvEl.dataset.ph = 'Value';

    if (state.isEditMode) {
      fvEl.innerText = field.value;
    } else {
      fvEl.innerHTML = renderMarkdown(field.value);
    }

    fvEl.oninput = () => {
      field.value = clampEditableText(fvEl, DISCORD_LIMITS.FIELD_VALUE);
      onInput();
    };
    fd.appendChild(fvEl);
    fieldsGrid.appendChild(fd);
  });

  content.appendChild(fieldsGrid);

  if (state.isEditMode) {
    const addFieldBtn = document.createElement('button');
    addFieldBtn.className = 'add-field-btn';
    addFieldBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add field`;
    addFieldBtn.onclick = () => addField(embed.id);
    content.appendChild(addFieldBtn);
  }
}

function appendImage(content, embed, imageCache) {
  if (embed.imageUrl) {
    const img = getCachedImage(
      imageCache,
      `embed:${embed.id}:image`,
      'dc-embed-image',
      embed.imageUrl,
      ev => state.isEditMode && openPopover('image', embed.id, ev),
      () => {
        embed.imageUrl = '';
        renderAllEmbeds();
      }
    );
    content.appendChild(img);
  } else if (state.isEditMode) {
    const ph = document.createElement('div');
    ph.className = 'dc-img-ph';
    ph.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>Main image`;
    ph.onclick = ev => openPopover('image', embed.id, ev);
    content.appendChild(ph);
  }
}

function appendFooter(content, embed, imageCache) {
  const footerRow = document.createElement('div');
  footerRow.className = 'dc-embed-footer';

  if (embed.footerIconUrl) {
    const img = getCachedImage(
      imageCache,
      `embed:${embed.id}:footer-icon`,
      'dc-embed-footer-icon',
      embed.footerIconUrl,
      ev => state.isEditMode && openPopover('footerIcon', embed.id, ev),
      () => {
        embed.footerIconUrl = '';
        renderAllEmbeds();
      }
    );
    footerRow.appendChild(img);
  } else if (state.isEditMode) {
    const ph = document.createElement('div');
    ph.className = 'dc-footer-icon-ph';
    ph.title = 'Footer icon';
    ph.textContent = '+';
    ph.onclick = ev => openPopover('footerIcon', embed.id, ev);
    footerRow.appendChild(ph);
  }

  const ftEl = document.createElement('span');
  ftEl.className = 'dc-embed-footer-text';
  ftEl.contentEditable = state.isEditMode ? 'true' : 'false';
  ftEl.dataset.ph = 'Footer text...';

  if (state.isEditMode) {
    ftEl.innerText = embed.footerText;
  } else {
    ftEl.textContent = embed.footerText;
  }

  ftEl.oninput = () => {
    embed.footerText = clampEditableText(ftEl, DISCORD_LIMITS.FOOTER_TEXT, { trim: true });
    onInput();
  };
  ftEl.onkeydown = noNewLine;
  footerRow.appendChild(ftEl);

  const sep = document.createElement('span');
  sep.className = 'dc-footer-sep';
  sep.textContent = ' • ';
  const timestampDisplay = formatEmbedTimestamp(getEmbedTimestampForPreview(embed));
  sep.style.display = (embed.footerText && timestampDisplay) ? '' : 'none';
  footerRow.appendChild(sep);

  if (state.isEditMode) {
    const controls = document.createElement('div');
    controls.className = 'dc-embed-footer-controls';

    const modeSel = document.createElement('select');
    modeSel.className = 'dc-embed-ts-mode';
    modeSel.innerHTML = `
      <option value="none">No timestamp</option>
      <option value="auto">Automatic</option>
      <option value="custom">Custom</option>
    `;
    modeSel.value = embed.timestampMode || 'none';
    modeSel.onchange = () => {
      embed.timestampMode = modeSel.value;
      if (embed.timestampMode !== 'custom') {
        embed.timestampCustom = '';
      }
      renderAllEmbeds();
      onInput();
    };
    controls.appendChild(modeSel);

    if ((embed.timestampMode || 'none') === 'custom') {
      const customInput = document.createElement('input');
      customInput.type = 'datetime-local';
      customInput.className = 'dc-embed-ts-custom';
      customInput.value = toDateTimeLocalValue(embed.timestampCustom);
      customInput.oninput = () => {
        embed.timestampCustom = customInput.value ? new Date(customInput.value).toISOString() : '';
        onInput();
      };
      controls.appendChild(customInput);
    }

    footerRow.appendChild(controls);
  } else if (timestampDisplay) {
    const tsEl = document.createElement('span');
    tsEl.className = 'dc-embed-footer-ts';
    tsEl.textContent = timestampDisplay;
    footerRow.appendChild(tsEl);
  }

  const showFooter = embed.footerText || embed.footerIconUrl || timestampDisplay || state.isEditMode;
  if (showFooter) content.appendChild(footerRow);
}
