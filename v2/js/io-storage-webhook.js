// COPY JSON
function copyJson() {
  const txt = document.getElementById('jsonOutput').value;
  navigator.clipboard.writeText(txt).then(() => {
    showNotification('\u2705 JSON copied', 'success');
  }).catch(() => {
    showNotification('\u274C Copy failed', 'error');
  });
}

function exportJson() {
  updateJson();
  const json = document.getElementById('jsonOutput').value;
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payload-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification('\u2705 JSON exported', 'success');
}

function openImportDialog() {
  document.getElementById('importJsonFile').click();
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      applyPayload(payload);
      saveToLocalStorage();
      showNotification('\u2705 JSON imported', 'success');
    } catch (err) {
      showNotification('\u274C Invalid JSON', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function applyPayload(payload) {
  const source = (payload && typeof payload === 'object' && payload.payload && typeof payload.payload === 'object')
    ? payload.payload
    : payload;

  const wrappers = document.getElementById('embedWrappers');
  wrappers.innerHTML = '';
  embedIdCounter = 0;
  activeEmbedId = 1;

  const username = source.username || '';
  const avatar = source.avatar_url || '';
  const content = source.content || '';
  const embeds = (source.embeds && source.embeds.length) ? source.embeds : [{}];

  document.getElementById('panelUsername').value = username;
  document.getElementById('panelAvatar').value = avatar;
  if (payload && typeof payload === 'object' && payload.WebHookUrl !== undefined) {
    document.getElementById('webhookUrl').value = payload.WebHookUrl || '';
  }

  document.getElementById('usernameEl').innerText = username;
  updateInitial(username);
  syncAvatar(avatar);

  const msgEl = document.getElementById('msgContent');
  msgEl.innerText = content;
  rawText.msgContent = content;

  embeds.forEach(embed => {
    addEmbed();
    const wrapper = getActiveEmbedWrapper();
    if (!wrapper) return;

    const embedColor = typeof embed.color === 'number' ? `#${embed.color.toString(16).padStart(6, '0')}` : '#5865f2';
    const embedEl = wrapper.querySelector('.embed');
    embedEl.style.borderLeftColor = embedColor;
    embedEl.dataset.embedColor = embedColor;
    const capsuleColor = wrapper.querySelector('.embed-color-capsule input[type="color"]');
    if (capsuleColor) capsuleColor.value = embedColor;

    // Set basic fields
    wrapper.querySelector('.embed-title-field').innerText = embed.title || '';
    wrapper.querySelector('.embed-description-field').innerText = embed.description || '';
    wrapper.querySelector('.embed-author-name').innerText = (embed.author && embed.author.name) ? embed.author.name : '';
    wrapper.querySelector('.embed-footer-text').innerText = (embed.footer && embed.footer.text) ? embed.footer.text : '';
    wrapper.dataset.footerIcon = (embed.footer && embed.footer.icon_url) ? embed.footer.icon_url : '';

    // Set author URL and icon (store in data attributes)
    if (embed.author) {
      wrapper.dataset.authorUrl = embed.author.url || '';
      wrapper.dataset.authorIcon = embed.author.icon_url || '';
      if (embed.author.icon_url) {
        syncEmbedAuthorIcon(embed.author.icon_url);
      }
    }

    // Set embed URL (store in data attribute)
    if (embed.url) {
      wrapper.dataset.embedUrl = embed.url;
    }

    // Set timestamp (store in data attributes)
    if (embed.timestamp) {
      if (embed.timestamp === '__AUTO_TIMESTAMP__') {
        wrapper.dataset.timestampMode = 'auto';
      } else {
        wrapper.dataset.timestampMode = 'custom';
        wrapper.dataset.timestampCustom = embed.timestamp;
      }
    } else {
      wrapper.dataset.timestampMode = 'none';
    }

    // Set images
    const image = (embed.image && embed.image.url) ? embed.image.url : '';
    const thumb = (embed.thumbnail && embed.thumbnail.url) ? embed.thumbnail.url : '';
    const imageEl = wrapper.querySelector('.embed-image');
    const thumbEl = wrapper.querySelector('.embed-thumbnail');
    if (image) {
      imageEl.src = image;
      imageEl.classList.add('has-image');
      document.getElementById('embedImageUrl').value = image;
    }
    if (thumb) {
      thumbEl.src = thumb;
      thumbEl.classList.add('has-image');
      embedEl.classList.add('has-thumbnail');
      document.getElementById('embedThumbUrl').value = thumb;
    } else {
      embedEl.classList.remove('has-thumbnail');
    }

    // Set fields
    (embed.fields || []).forEach(field => addFieldWithData(field));

    // Set footer icon
    if (embed.footer && embed.footer.icon_url) {
      syncEmbedFooterIcon(embed.footer.icon_url);
    } else {
      syncEmbedFooterIcon('');
    }

    refreshInlineUrlFields(wrapper);
  });

  if (document.querySelectorAll('.embed-wrapper').length === 0) {
    addEmbed();
  }

  setActiveEmbed(1);
  updateJson();
}

// SEND WEBHOOK
async function sendWebhook() {
  const inputUrl = document.getElementById('webhookUrl').value.trim();
  let url = inputUrl;

  updateJson();
  const payloadText = document.getElementById('jsonOutput').value;
  if (!payloadText || payloadText === '{}') {
    showNotification('\u274C Empty payload', 'error');
    return;
  }

  let payload;
  try {
    const parsed = JSON.parse(payloadText);
    if (!url && parsed && typeof parsed === 'object' && parsed.WebHookUrl) {
      url = parsed.WebHookUrl;
    }
    payload = (parsed && typeof parsed === 'object' && parsed.payload && typeof parsed.payload === 'object')
      ? parsed.payload
      : parsed;
  } catch (e) {
    showNotification('\u274C Invalid JSON payload', 'error');
    return;
  }

  if (!url) {
    showNotification('\u274C Missing webhook URL', 'error');
    return;
  }

  showNotification('\u23F3 Sending webhook...', 'info');

  try {
    const normalizedPayload = normalizePayloadForDiscord(payload);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    });

    if (res.ok) {
      showNotification('\u2705 Webhook sent', 'success');
    } else {
      let errMsg = `HTTP ${res.status}`;
      try {
        const json = await res.json();
        if (json.message) errMsg += `: ${json.message}`;
      } catch (e) {}
      showNotification(`\u274C ${errMsg}`, 'error');
    }
  } catch(e) {
    showNotification(`\u274C ${e.message}`, 'error');
  }
}

function setStatus(msg, color) {
  showNotification(msg.replace(/<[^>]*>/g, ''), 
    msg.includes('\u2705') ? 'success' : 
    msg.includes('\u274C') ? 'error' : 
    msg.includes('\u23F3') ? 'info' : 'warning');
}

function getNotificationContainer() {
  let container = document.getElementById('notificationContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notificationContainer';
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  return container;
}

function showNotification(msg, type = 'info') {
  const container = getNotificationContainer();
  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.textContent = msg;

  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS animations if not already present
if (!document.getElementById('toast-animations')) {
  const style = document.createElement('style');
  style.id = 'toast-animations';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// LOCALSTORAGE
function saveToLocalStorage() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const data = {
        username: document.getElementById('panelUsername').value || '',
        avatar: document.getElementById('panelAvatar').value || '',
        webhookUrl: document.getElementById('webhookUrl').value || '',
        payloadName: document.getElementById('payloadName').value || '',
        jsonPayload: document.getElementById('jsonOutput').value || '{}'
      };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      console.debug('[WEBUI] Saved to localStorage');
    } catch (err) {
      console.error('[WEBUI] LocalStorage save error:', err);
    }
  }, LOCALSTORAGE_DELAY);
}

function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!data) return;
    
    const config = JSON.parse(data);
    if (config.username) document.getElementById('panelUsername').value = config.username;
    if (config.avatar) document.getElementById('panelAvatar').value = config.avatar;
    if (config.webhookUrl) document.getElementById('webhookUrl').value = config.webhookUrl;
    if (config.payloadName) document.getElementById('payloadName').value = config.payloadName;
    
    syncUsername(config.username || '');
    syncAvatar(config.avatar || '');
    
    if (config.jsonPayload && config.jsonPayload !== '{}') {
      try {
        const payload = JSON.parse(config.jsonPayload);
        applyPayload(payload);
        console.debug('[WEBUI] Loaded from localStorage');
      } catch (e) {
        console.error('[WEBUI] Failed to parse stored payload:', e);
      }
    }
  } catch (err) {
    console.error('[WEBUI] LocalStorage load error:', err);
  }
}

// VALIDATION
function validatePayload(payload, webhookUrl) {
  const errors = [];
  const warnings = [];
  
  if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
    errors.push('At least a message or one embed is required');
  }
  
  if (payload.content && payload.content.length > 2000) {
    errors.push('Message > 2000 characters');
  }
  
  if (payload.embeds) {
    if (payload.embeds.length > 10) {
      errors.push('Max 10 embeds');
    }
    
    payload.embeds.forEach((embed, idx) => {
      if (embed.title && embed.title.length > 256) {
        errors.push(`Embed ${idx+1}: title > 256`);
      }
      if (embed.description && embed.description.length > 4096) {
        errors.push(`Embed ${idx+1}: description > 4096`);
      }
      if (embed.fields && embed.fields.length > 25) {
        errors.push(`Embed ${idx+1}: max 25 fields`);
      }
    });
  }
  
  if (payload.username && payload.username.length > 80) {
    warnings.push('Username will be truncated to 80 chars');
  }
  
  return { isValid: errors.length === 0, errors, warnings };
}

function normalizePayloadForDiscord(inputPayload) {
  const payload = JSON.parse(JSON.stringify(inputPayload || {}));
  if (Array.isArray(payload.embeds)) {
    payload.embeds.forEach(embed => {
      if (embed && embed.timestamp === '__AUTO_TIMESTAMP__') {
        embed.timestamp = new Date().toISOString();
      }
    });
  }
  return payload;
}

// WEBHOOK TEST
async function testWebhook() {
  const inputUrl = document.getElementById('webhookUrl').value.trim();
  let url = inputUrl;
  
  updateJson();
  const payloadText = document.getElementById('jsonOutput').value;
  let payload;
  
  try {
    const parsed = JSON.parse(payloadText);
    if (!url && parsed && typeof parsed === 'object' && parsed.WebHookUrl) {
      url = parsed.WebHookUrl;
    }
    payload = (parsed && typeof parsed === 'object' && parsed.payload && typeof parsed.payload === 'object')
      ? parsed.payload
      : parsed;

    if (!url) {
      showNotification('\u274C Empty webhook URL', 'error');
      return;
    }

    const validation = validatePayload(payload, url);
    if (!validation.isValid) {
      showNotification(`\u274C ${validation.errors[0]}`, 'error');
      return;
    }
    
    showNotification('\u23F3 Test webhook...', 'info');
    
    const normalizedPayload = normalizePayloadForDiscord(payload);

    const response = await fetch(url + '?wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload)
    });
    
    if (response.ok) {
      showNotification('\u2705 Webhook OK', 'success');
    } else {
      let errMsg = `HTTP ${response.status}`;
      try {
        const json = await response.json();
        if (json.message) errMsg += `: ${json.message}`;
      } catch (e) {}
      showNotification(`\u274C ${errMsg}`, 'error');
    }
  } catch (err) {
    showNotification(`\u274C ${err.message}`, 'error');
  }
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  setActiveEmbed(1, document.querySelector('.embed-wrapper[data-embed-id="1"]'));
  updateJson();
  
  // Setup timestamp mode toggle
  const timestampMode = document.getElementById('timestampMode');
  if (timestampMode) {
    timestampMode.addEventListener('change', (e) => {
      const customRow = document.getElementById('timestampCustomRow');
      if (customRow) {
        customRow.style.display = e.target.value === 'custom' ? 'block' : 'none';
      }
      updateJson();
    });
  }
});

document.addEventListener('input', () => {
  saveToLocalStorage();
});

document.addEventListener('change', () => {
  saveToLocalStorage();
});

