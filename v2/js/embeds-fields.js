// DYNAMIC FIELDS
function addField(sourceEl = null) {
  const id = ++fieldIdCounter;
  const wrapper = sourceEl
    ? sourceEl.closest('.embed-wrapper')
    : getActiveEmbedWrapper();
  if (!wrapper) return;

  const container = wrapper.querySelector('.embed-fields');

  const div = document.createElement('div');
  div.className = 'embed-field-item';
  div.dataset.fieldId = id;
  div.innerHTML = `
    <button class="field-delete-btn" onclick="removeField(${id})" title="Delete">&times;</button>
    <div class="embed-field-name">
      <div class="embed-field-editable rendered field-name-el" contenteditable="true" data-placeholder="Field name" data-max-chars="256" spellcheck="false" oninput="updateJson()"></div>
    </div>
    <div class="embed-field-value">
      <div class="embed-field-editable rendered field-value-el" contenteditable="true" data-placeholder="Value" data-max-chars="1024" spellcheck="false" oninput="updateJson()"></div>
    </div>
    <div class="field-inline-toggle">
      <input type="checkbox" id="inline-${id}" onchange="toggleFieldInline(this)">
      <label for="inline-${id}">Inline</label>
    </div>
  `;
  container.appendChild(div);
  updateJson();
}

function toggleFieldInline(checkbox) {
  const item = checkbox.closest('.embed-field-item');
  if (!item) return;
  item.classList.toggle('inline', checkbox.checked);
  updateJson();
}

function removeField(id) {
  const el = document.querySelector(`[data-field-id="${id}"]`);
  if (el) { el.remove(); updateJson(); }
}

function addFieldWithData(field = {}) {
  const wrapper = getActiveEmbedWrapper();
  addField();
  const last = wrapper?.querySelector('.embed-field-item:last-child');
  if (!last) return;

  const editables = last.querySelectorAll('.embed-field-editable');
  if (editables[0]) editables[0].innerText = field.name || '';
  if (editables[1]) {
    editables[1].innerText = field.value || '';
    if (field.value) editables[1].dataset.raw = field.value;
  }
  const inline = last.querySelector('input[type="checkbox"]');
  if (inline) {
    inline.checked = !!field.inline;
    last.classList.toggle('inline', !!field.inline);
  }
}

function removeEmbed(sourceEl, event) {
  if (event) event.stopPropagation();
  const wrappers = document.querySelectorAll('.embed-wrapper');
  if (wrappers.length <= 1) {
    showNotification('\u26A0\uFE0F At least one embed is required', 'warning');
    return;
  }

  const wrapper = sourceEl.closest('.embed-wrapper');
  if (!wrapper) return;
  const wasActive = wrapper.dataset.embedId === String(activeEmbedId);
  wrapper.remove();

  if (wasActive) {
    const first = document.querySelector('.embed-wrapper');
    if (first) setActiveEmbed(Number(first.dataset.embedId), first);
  }
  updateJson();
}

function formatEmbedTimestamp(isoString) {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '';
  const day = dt.toLocaleDateString('fr-FR');
  const hh = dt.getHours().toString().padStart(2, '0');
  const mm = dt.getMinutes().toString().padStart(2, '0');
  return `${day} at ${hh}:${mm}`;
}

function updateEmbedTimestampDisplay(wrapper, timestampIso) {
  if (!wrapper) return;
  const tsEl = wrapper.querySelector('.embed-timestamp-text');
  const sepEl = wrapper.querySelector('.embed-footer-separator');
  const footerText = wrapper.querySelector('.embed-footer-text')?.innerText?.trim();
  if (!tsEl || !sepEl) return;

  if (timestampIso) {
    tsEl.textContent = formatEmbedTimestamp(timestampIso);
    tsEl.classList.remove('hidden');
    if (footerText) sepEl.classList.remove('hidden');
    else sepEl.classList.add('hidden');
  } else {
    tsEl.textContent = '';
    tsEl.classList.add('hidden');
    sepEl.classList.add('hidden');
  }
}

function setActiveEmbed(id, wrapperEl = null) {
  activeEmbedId = id;
  document.querySelectorAll('.embed-wrapper').forEach(el => el.classList.remove('active'));
  const target = wrapperEl || document.querySelector(`.embed-wrapper[data-embed-id="${id}"]`);
  if (target) target.classList.add('active');

  const embedEl = target?.querySelector('.embed');
  const color = embedEl?.dataset.embedColor || '#5865f2';
  const capsuleInput = target?.querySelector('.embed-color-capsule input[type="color"]');
  if (capsuleInput) capsuleInput.value = color;
  
  // Load optional left-panel fields if present
  const embedAuthorUrlInput = document.getElementById('embedAuthorUrl');
  const embedAuthorIconInput = document.getElementById('embedAuthorIcon');
  const embedUrlInput = document.getElementById('embedUrl');
  if (embedAuthorUrlInput) embedAuthorUrlInput.value = target?.dataset.authorUrl || '';
  if (embedAuthorIconInput) embedAuthorIconInput.value = target?.dataset.authorIcon || '';
  if (embedUrlInput) embedUrlInput.value = target?.dataset.embedUrl || '';
  const activeImage = target?.querySelector('.embed-image');
  const activeThumb = target?.querySelector('.embed-thumbnail');
  document.getElementById('embedImageUrl').value = activeImage?.classList.contains('has-image') ? (activeImage.src || '') : '';
  document.getElementById('embedThumbUrl').value = activeThumb?.classList.contains('has-image') ? (activeThumb.src || '') : '';
  document.getElementById('timestampMode').value = target?.dataset.timestampMode || 'none';
  const tsCustom = target?.dataset.timestampCustom || '';
  if (tsCustom) {
    const tsDate = new Date(tsCustom);
    document.getElementById('timestampCustom').value = Number.isNaN(tsDate.getTime()) ? '' : tsDate.toISOString().slice(0,16);
  } else {
    document.getElementById('timestampCustom').value = '';
  }
  
  // Toggle custom timestamp row
  const customRow = document.getElementById('timestampCustomRow');
  if (customRow) {
    customRow.style.display = document.getElementById('timestampMode').value === 'custom' ? 'block' : 'none';
  }

  refreshInlineUrlFields(target);
}

function getActiveEmbedWrapper() {
  return document.querySelector(`.embed-wrapper[data-embed-id="${activeEmbedId}"]`) || document.querySelector('.embed-wrapper');
}

function addEmbed() {
  const wrappers = document.getElementById('embedWrappers');
  if (!wrappers) return;

  embedIdCounter += 1;
  const id = embedIdCounter;

  const div = document.createElement('div');
  div.className = 'embed-wrapper';
  div.dataset.embedId = String(id);
  div.setAttribute('onclick', `setActiveEmbed(${id}, this)`);
  div.innerHTML = `
    <div class="embed-color-capsule" title="Embed tools">
      <button class="embed-capsule-trash" onclick="removeEmbed(this, event)" title="Delete this embed">&#128465;</button>
      <input type="color" value="#5865f2" oninput="syncColorFromCapsule(this)" onchange="syncColorFromCapsule(this)" onclick="event.stopPropagation()" title="Embed color">
    </div>
    <div class="embed" data-embed-color="#5865f2" style="border-left-color:#5865f2;">
      <div class="embed-inner">
        <div class="embed-author-row editable-zone" data-label="Author">
          <div class="embed-author-icon"></div>
          <div class="embed-field-editable embed-author-name" contenteditable="true" data-placeholder="Author name" data-max-chars="256" spellcheck="false" oninput="updateJson()"></div>
        </div>
        <div class="embed-url-row" data-inline-group="author">
          <span class="embed-url-icon">🔗</span>
          <input class="embed-inline-url" type="url" data-inline-url="authorUrl" placeholder="Author URL (https://...)" oninput="syncInlineUrl('authorUrl', this, event)">
        </div>
        <div class="embed-url-row" data-inline-group="author">
          <span class="embed-url-icon">🔗</span>
          <input class="embed-inline-url" type="url" data-inline-url="authorIcon" placeholder="Author icon URL (https://...)" oninput="syncInlineUrl('authorIcon', this, event)">
        </div>
        <div class="editable-zone" data-label="Title">
          <div class="embed-field-editable embed-title-field" contenteditable="true" data-placeholder="Embed title" data-max-chars="256" spellcheck="false" oninput="updateJson()"></div>
        </div>
        <div class="embed-url-row" data-inline-group="title">
          <span class="embed-url-icon">🔗</span>
          <input class="embed-inline-url" type="url" data-inline-url="titleUrl" placeholder="Title URL (https://...)" oninput="syncInlineUrl('titleUrl', this, event)">
        </div>
        <div class="editable-zone" data-label="Description">
          <div class="embed-field-editable embed-description-field rendered" contenteditable="true" data-placeholder="Description (supports Discord markdown)..." data-max-chars="4096" spellcheck="false" oninput="updateJson()" onpaste="handlePaste(event)"></div>
        </div>
        <div class="embed-fields"></div>
        <div class="add-field-btn" onclick="addField(this)"><span>+</span> Add field</div>
        <img class="embed-image" src="" alt="">
        <div class="embed-footer-row">
          <div class="embed-footer-icon"></div>
          <div class="embed-field-editable embed-footer-text" contenteditable="true" data-placeholder="Footer text" data-max-chars="2048" spellcheck="false" oninput="updateJson()"></div>
          <span class="embed-footer-separator hidden">&bull;</span>
          <span class="embed-timestamp-text hidden"></span>
        </div>
        <div class="embed-url-row" data-inline-group="footer">
          <span class="embed-url-icon">🔗</span>
          <input class="embed-inline-url" type="url" data-inline-url="footerIcon" placeholder="Footer icon URL (https://...)" oninput="syncInlineUrl('footerIcon', this, event)">
        </div>
      </div>
      <img class="embed-thumbnail" src="" alt="">
    </div>
  `;

  wrappers.appendChild(div);
  setActiveEmbed(id, div);
  updateJson();
}

// PANEL COLLAPSE
function toggleSection(id) {
  document.getElementById(id).classList.toggle('collapsed');
}

function refreshInlineUrlFields(wrapper) {
  if (!wrapper) return;
  const authorUrlInput = wrapper.querySelector('[data-inline-url="authorUrl"]');
  const authorIconInput = wrapper.querySelector('[data-inline-url="authorIcon"]');
  const titleUrlInput = wrapper.querySelector('[data-inline-url="titleUrl"]');
  const footerIconInput = wrapper.querySelector('[data-inline-url="footerIcon"]');

  const setValueIfNeeded = (input, nextValue) => {
    if (!input) return;
    if (document.activeElement === input) return;
    const normalized = nextValue || '';
    if (input.value !== normalized) input.value = normalized;
  };

  setValueIfNeeded(authorUrlInput, wrapper.dataset.authorUrl || '');
  setValueIfNeeded(authorIconInput, wrapper.dataset.authorIcon || '');
  setValueIfNeeded(titleUrlInput, wrapper.dataset.embedUrl || '');
  setValueIfNeeded(footerIconInput, wrapper.dataset.footerIcon || '');
}

function syncInlineUrl(type, inputEl, event) {
  if (event) event.stopPropagation();
  const wrapper = inputEl?.closest('.embed-wrapper');
  if (!wrapper) return;

  setActiveEmbed(Number(wrapper.dataset.embedId), wrapper);
  const value = inputEl.value || '';

  if (type === 'authorUrl') {
    const leftInput = document.getElementById('embedAuthorUrl');
    if (leftInput) leftInput.value = value;
    syncEmbedAuthorUrl(value);
  } else if (type === 'authorIcon') {
    const leftInput = document.getElementById('embedAuthorIcon');
    if (leftInput) leftInput.value = value;
    syncEmbedAuthorIcon(value);
  } else if (type === 'titleUrl') {
    const leftInput = document.getElementById('embedUrl');
    if (leftInput) leftInput.value = value;
    syncEmbedUrl(value);
  } else if (type === 'footerIcon') {
    syncEmbedFooterIcon(value);
  }

  refreshInlineUrlFields(wrapper);
}

// PASTE HANDLER (strip rich formatting)
function handlePaste(e) {
  e.preventDefault();
  const text = e.clipboardData.getData('text/plain');
  const target = e.target;

  if (target?.isContentEditable) {
    const maxChars = Number(target.dataset.maxChars || 0);
    if (maxChars && !Number.isNaN(maxChars)) {
      const current = target.innerText || '';
      const selection = window.getSelection();
      const selectedLength = selection ? selection.toString().length : 0;
      const remaining = Math.max(0, maxChars - (current.length - selectedLength));
      const clipped = remaining > 0 ? text.slice(0, remaining) : '';
      if (clipped) document.execCommand('insertText', false, clipped);
      enforceContentEditableLimit(target);
      return;
    }
  }

  document.execCommand('insertText', false, text);
}

// TIMESTAMP
function updateTimestamp() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2,'0');
  const m = now.getMinutes().toString().padStart(2,'0');
  document.getElementById('msgTimestamp').textContent = `Today at ${h}:${m}`;
}
updateTimestamp();

