// JSON BUILDER
function updateJson() {
  const username = document.getElementById('usernameEl').innerText.trim() || undefined;
  const avatarUrl = document.getElementById('panelAvatar').value.trim() || undefined;
  const msgContent = (rawText['msgContent'] ?? document.getElementById('msgContent').innerText ?? '').trim();

  // Save advanced fields to active embed (timestamp from left panel only)
  const activeWrapper = document.querySelector(`.embed-wrapper[data-embed-id="${activeEmbedId}"]`);
  if (activeWrapper) {
    activeWrapper.dataset.timestampMode = document.getElementById('timestampMode')?.value || 'none';
    activeWrapper.dataset.timestampCustom = document.getElementById('timestampCustom')?.value || '';
  }
  
  const embeds = [];

  document.querySelectorAll('.embed-wrapper').forEach(wrapper => {
    const embedEl = wrapper.querySelector('.embed');
    const colorHex = embedEl?.dataset.embedColor || '#5865f2';
    const title = getRawEditableText(wrapper.querySelector('.embed-title-field')).trim() || undefined;
    const description = getRawEditableText(wrapper.querySelector('.embed-description-field')).trim() || undefined;
    const author = wrapper.querySelector('.embed-author-name')?.innerText.trim() || undefined;
    const footer = wrapper.querySelector('.embed-footer-text')?.innerText.trim() || undefined;
    const imageUrl = wrapper.querySelector('.embed-image')?.classList.contains('has-image') ? wrapper.querySelector('.embed-image')?.src : undefined;
    const thumbUrl = wrapper.querySelector('.embed-thumbnail')?.classList.contains('has-image') ? wrapper.querySelector('.embed-thumbnail')?.src : undefined;

    // Get advanced fields from inline URL fields (source of truth)
    const authorUrlRaw = wrapper.querySelector('[data-inline-url="authorUrl"]')?.value || '';
    const authorIconRaw = wrapper.querySelector('[data-inline-url="authorIcon"]')?.value || '';
    const titleUrlRaw = wrapper.querySelector('[data-inline-url="titleUrl"]')?.value || '';
    const footerIconRaw = wrapper.querySelector('[data-inline-url="footerIcon"]')?.value || '';

    wrapper.dataset.authorUrl = authorUrlRaw;
    wrapper.dataset.authorIcon = authorIconRaw;
    wrapper.dataset.embedUrl = titleUrlRaw;
    wrapper.dataset.footerIcon = footerIconRaw;

    const authorUrl = authorUrlRaw || undefined;
    const authorIcon = authorIconRaw || undefined;
    const embedUrl = titleUrlRaw || undefined;
    const footerIcon = footerIconRaw || undefined;
    
    let timestamp = undefined;
    let timestampForDisplay = undefined;
    const timestampMode = wrapper.dataset.timestampMode || 'none';
    if (timestampMode === 'auto') {
      timestamp = '__AUTO_TIMESTAMP__';
      timestampForDisplay = new Date().toISOString();
    } else if (timestampMode === 'custom' && wrapper.dataset.timestampCustom) {
      const customTs = new Date(wrapper.dataset.timestampCustom);
      if (!Number.isNaN(customTs.getTime())) {
        timestamp = customTs.toISOString();
        timestampForDisplay = timestamp;
      }
    }

    updateEmbedTimestampDisplay(wrapper, timestampForDisplay);

    const embedFields = [];
    wrapper.querySelectorAll('.embed-field-item').forEach(item => {
      const els = item.querySelectorAll('.embed-field-editable');
      const name = getRawEditableText(els[0]).trim() || '';
      const value = getRawEditableText(els[1]).trim() || '';
      const inline = item.querySelector('input[type="checkbox"]')?.checked || false;
      if (name || value) embedFields.push({ name, value, inline });
    });

    const embed = {};
    embed.color = hexToInt(colorHex);
    
    // Build author object with all fields
    if (author || authorUrl || authorIcon) {
      embed.author = {};
      if (author) embed.author.name = author;
      if (authorUrl) embed.author.url = authorUrl;
      if (authorIcon) embed.author.icon_url = authorIcon;
    }
    
    if (title) embed.title = title;
    if (description) embed.description = description;
    if (embedUrl) embed.url = embedUrl;
    if (embedFields.length) embed.fields = embedFields;
    if (imageUrl) embed.image = { url: imageUrl };
    if (thumbUrl) embed.thumbnail = { url: thumbUrl };
    if (footer || footerIcon) {
      embed.footer = {};
      if (footer) embed.footer.text = footer;
      if (footerIcon) embed.footer.icon_url = footerIcon;
    }
    if (timestamp) embed.timestamp = timestamp;

    if (Object.keys(embed).length) embeds.push(embed);
  });

  const payload = {
    content: msgContent || '',
    embeds
  };
  if (username) payload.username = username;
  if (avatarUrl) payload.avatar_url = avatarUrl;

  const webhookUrl = document.getElementById('webhookUrl')?.value?.trim() || '';
  const wrapped = {
    payload,
    WebHookUrl: webhookUrl,
    validation: validatePayload(payload, webhookUrl)
  };

  document.getElementById('jsonOutput').value = JSON.stringify(wrapped, null, 2);
}

function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

