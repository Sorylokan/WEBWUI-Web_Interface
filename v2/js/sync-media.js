// MODE TOGGLE
function toggleMode() {
  const newMode = currentMode === 'edit' ? 'preview' : 'edit';
  setMode(newMode);
}

function setMode(mode) {
  currentMode = mode;
  const msg = document.getElementById('discordMessage');
  const editBtn = document.getElementById('modeEditBtn');
  const previewBtn = document.getElementById('modePreviewBtn');

  if (editBtn && previewBtn) {
    const isEdit = mode === 'edit';
    editBtn.classList.toggle('active', isEdit);
    previewBtn.classList.toggle('active', !isEdit);
    editBtn.setAttribute('aria-selected', String(isEdit));
    previewBtn.setAttribute('aria-selected', String(!isEdit));
  }

  if (mode === 'preview') {
    msg.classList.remove('edit-mode');
    msg.classList.add('preview-mode');

    // Render markdown in preview mode
    renderAllMarkdown();

    // Lock inputs and textareas while preserving visual style
    msg.querySelectorAll('input, textarea').forEach(el => {
      el.readOnly = true;
    });
    msg.querySelectorAll('[contenteditable]').forEach(el => {
      el.setAttribute('contenteditable', 'false');
    });
  } else {
    msg.classList.remove('preview-mode');
    msg.classList.add('edit-mode');

    // Re-enable inputs and textareas
    msg.querySelectorAll('input, textarea').forEach(el => {
      el.readOnly = false;
    });
    msg.querySelectorAll('[contenteditable]').forEach(el => {
      el.setAttribute('contenteditable', 'true');
    });

    // Restore raw text in editable fields
    restoreRawText();
  }
}

// MARKDOWN PARSER (Discord-flavored)
function parseDiscordMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Escape HTML first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```)
  html = html.replace(/```(?:(\w+)\n)?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trimEnd()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Spoilers ||text||
  html = html.replace(/\|\|([^|]+)\|\|/g, '<span class="spoiler" onclick="this.classList.toggle(\'revealed\')" title="Click to reveal">$1</span>');

  // Bold + italic ***text***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');

  // Bold **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic *text* or _text_
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Underline __text__
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');

  // Strikethrough ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // Bare URLs
  html = html.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Store raw text for each editable field
const rawText = {};

function onContentEdit(id) {
  const el = document.getElementById(id);
  rawText[id] = getRawEditableText(el);
  updateJson();
}

function renderAllMarkdown() {
  const msg = document.getElementById('msgContent');
  if (msg && msg.value === undefined) {
    const raw = rawText.msgContent || msg.innerText || msg.textContent || '';
    rawText.msgContent = raw;
    msg.innerHTML = parseDiscordMarkdown(raw);
  }

  document.querySelectorAll('.embed-description-field').forEach((el, idx) => {
    if (el.value !== undefined) return;
    const key = `embed-desc-${idx}`;
    const raw = el.innerText || el.dataset.raw || rawText[key] || '';
    rawText[key] = raw;
    el.dataset.raw = raw;
    el.innerHTML = parseDiscordMarkdown(raw);
  });

  document.querySelectorAll('.embed-title-field').forEach((el, idx) => {
    if (el.value !== undefined) return;
    const key = `embed-title-${idx}`;
    const raw = el.innerText || el.dataset.raw || rawText[key] || '';
    rawText[key] = raw;
    el.dataset.raw = raw;
    el.innerHTML = parseDiscordMarkdown(raw);
  });

  document.querySelectorAll('.field-name-el, .field-value-el').forEach(el => {
    const raw = el.innerText || el.dataset.raw || '';
    el.dataset.raw = raw;
    el.innerHTML = parseDiscordMarkdown(raw);
  });
}

function restoreRawText() {
  const msg = document.getElementById('msgContent');
  if (msg && rawText.msgContent !== undefined) {
    if (msg.value !== undefined) msg.value = rawText.msgContent;
    else msg.innerText = rawText.msgContent;
  }

  document.querySelectorAll('.embed-description-field').forEach((el, idx) => {
    const key = `embed-desc-${idx}`;
    if (rawText[key] !== undefined) {
      if (el.value !== undefined) el.value = rawText[key];
      else el.innerText = rawText[key];
    } else if (el.dataset.raw !== undefined) {
      if (el.value !== undefined) el.value = el.dataset.raw;
      else el.innerText = el.dataset.raw;
    }
  });

  document.querySelectorAll('.embed-title-field').forEach((el, idx) => {
    const key = `embed-title-${idx}`;
    if (rawText[key] !== undefined) {
      if (el.value !== undefined) el.value = rawText[key];
      else el.innerText = rawText[key];
    } else if (el.dataset.raw !== undefined) {
      if (el.value !== undefined) el.value = el.dataset.raw;
      else el.innerText = el.dataset.raw;
    }
  });

  // Restore field values
  document.querySelectorAll('.field-name-el, .field-value-el').forEach(el => {
    if (el.dataset.raw !== undefined) {
      el.innerText = el.dataset.raw;
    }
  });
}

function getRawEditableText(el) {
  if (!el) return '';
  // For inputs and textareas, use value
  if (el.value !== undefined) return el.value;
  // For legacy contenteditable, use dataset.raw first, then innerText
  if (el.dataset && typeof el.dataset.raw === 'string') return el.dataset.raw;
  return el.innerText || '';
}

// MARKDOWN TOOLBAR
function insertMd(before, after) {
  const el = lastFocused;
  if (!el) return;

  if (el.value !== undefined) {
    el.focus();
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const value = el.value || '';
    const selectedText = value.slice(start, end);
    const nextValue = value.slice(0, start) + before + selectedText + after + value.slice(end);

    el.value = nextValue;

    const nextCaret = selectedText ? start + before.length + selectedText.length + after.length : start + before.length;
    el.selectionStart = nextCaret;
    el.selectionEnd = nextCaret;

    if (el.id) onContentEdit(el.id);
    else updateJson();
    return;
  }

  if (!el.isContentEditable) return;
  el.focus();

  const sel = window.getSelection();
  if (!sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  const selectedText = range.toString();

  // Insert markers
  const textNode = document.createTextNode(before + selectedText + after);
  range.deleteContents();
  range.insertNode(textNode);

  // Move cursor inside markers if nothing selected
  if (!selectedText && before && after) {
    const newRange = document.createRange();
    newRange.setStart(textNode, before.length);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  // Trigger update
  if (el.id) onContentEdit(el.id);
  else updateJson();
}

