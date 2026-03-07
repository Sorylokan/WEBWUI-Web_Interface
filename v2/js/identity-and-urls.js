// USERNAME SYNC
function onUsernameEdit(el) {
  const val = el.innerText || '';
  document.getElementById('panelUsername').value = val;
  updateInitial(val);
  updateJson();
}

function syncUsername(val) {
  const el = document.getElementById('usernameEl');
  el.innerText = val;
  updateInitial(val);
  updateJson();
}

function updateInitial(name) {
  const initial = name.trim()[0] || 'B';
  document.getElementById('avatarInitial').textContent = initial.toUpperCase();
}

// AVATAR SYNC
function syncAvatar(url) {
  const img = document.getElementById('avatarImg');
  const initial = document.getElementById('avatarInitial');
  if (url) {
    img.src = url;
    img.style.display = 'block';
    initial.style.display = 'none';
    img.onerror = () => { img.style.display = 'none'; initial.style.display = ''; };
  } else {
    img.style.display = 'none';
    initial.style.display = '';
  }
  updateJson();
}

// COLOR SYNC
function syncColor(val, wrapperOverride = null) {
  const wrapper = wrapperOverride || getActiveEmbedWrapper();
  if (!wrapper) return;
  const embedEl = wrapper.querySelector('.embed');
  if (!embedEl) return;
  embedEl.style.borderLeftColor = val;
  embedEl.dataset.embedColor = val;
  const capsuleInput = wrapper.querySelector('.embed-color-capsule input[type="color"]');
  if (capsuleInput && capsuleInput.value !== val) capsuleInput.value = val;
  updateJson();
}

function syncColorFromText(val) {
  if (/^#[0-9a-fA-F]{6}$/.test(val)) syncColor(val);
}

function syncColorFromCapsule(inputEl) {
  const wrapper = inputEl.closest('.embed-wrapper');
  if (!wrapper) {
    console.error('No wrapper found for color picker');
    return;
  }
  const embedEl = wrapper.querySelector('.embed');
  if (!embedEl) {
    console.error('No embed found in wrapper');
    return;
  }
  const color = inputEl.value;
  console.log('Color change:', color, 'for embed', wrapper.dataset.embedId);
  embedEl.style.borderLeftColor = color;
  embedEl.dataset.embedColor = color;
  setActiveEmbed(Number(wrapper.dataset.embedId), wrapper);
  updateJson();
}

function syncEmbedAuthorUrl(val) {
  const wrapper = getActiveEmbedWrapper();
  if (wrapper) {
    wrapper.dataset.authorUrl = val || '';
    const inline = wrapper.querySelector('[data-inline-url="authorUrl"]');
    if (inline && inline.value !== (val || '')) inline.value = val || '';
  }
  updateJson();
}

function syncEmbedAuthorIcon(val) {
  const wrapper = getActiveEmbedWrapper();
  if (!wrapper) return;
  wrapper.dataset.authorIcon = val || '';
  const inline = wrapper.querySelector('[data-inline-url="authorIcon"]');
  if (inline && inline.value !== (val || '')) inline.value = val || '';
  const iconEl = wrapper.querySelector('.embed-author-icon');
  if (!iconEl) return;

  if (!val) {
    iconEl.style.backgroundImage = 'none';
    iconEl.classList.remove('has-image');
    updateJson();
    return;
  }

  const testImg = new Image();
  testImg.onload = () => {
    iconEl.style.backgroundImage = `url('${val}')`;
    iconEl.style.backgroundSize = 'cover';
    iconEl.style.backgroundPosition = 'center';
    iconEl.classList.add('has-image');
    updateJson();
  };
  testImg.onerror = () => {
    iconEl.style.backgroundImage = 'none';
    iconEl.classList.remove('has-image');
    showNotification('\u274C Invalid author icon URL', 'error');
    updateJson();
  };
  testImg.src = val;
  updateJson();
}

function syncEmbedUrl(val) {
  const wrapper = getActiveEmbedWrapper();
  if (wrapper) {
    wrapper.dataset.embedUrl = val || '';
    const inline = wrapper.querySelector('[data-inline-url="titleUrl"]');
    if (inline && inline.value !== (val || '')) inline.value = val || '';
  }
  updateJson();
}

function syncEmbedFooterIcon(val) {
  const wrapper = getActiveEmbedWrapper();
  if (!wrapper) return;
  wrapper.dataset.footerIcon = val || '';
  const inline = wrapper.querySelector('[data-inline-url="footerIcon"]');
  if (inline && inline.value !== (val || '')) inline.value = val || '';

  const iconEl = wrapper.querySelector('.embed-footer-icon');
  if (!iconEl) {
    updateJson();
    return;
  }

  if (!val) {
    iconEl.style.backgroundImage = 'none';
    iconEl.classList.remove('has-image');
    updateJson();
    return;
  }

  const testImg = new Image();
  testImg.onload = () => {
    iconEl.style.backgroundImage = `url('${val}')`;
    iconEl.style.backgroundSize = 'cover';
    iconEl.style.backgroundPosition = 'center';
    iconEl.classList.add('has-image');
    updateJson();
  };
  testImg.onerror = () => {
    iconEl.style.backgroundImage = 'none';
    iconEl.classList.remove('has-image');
    showNotification('\u274C Invalid footer icon URL', 'error');
    updateJson();
  };
  testImg.src = val;
  updateJson();
}

// IMAGES
function syncEmbedImage(url) {
  const wrapper = getActiveEmbedWrapper();
  if (!wrapper) return;
  const img = wrapper.querySelector('.embed-image');
  if (url) {
    img.src = url;
    img.classList.add('has-image');
    img.onerror = () => img.classList.remove('has-image');
  } else {
    img.classList.remove('has-image');
  }
  updateJson();
}

function syncThumbnail(url) {
  const wrapper = getActiveEmbedWrapper();
  if (!wrapper) return;
  const embed = wrapper.querySelector('.embed');
  const img = wrapper.querySelector('.embed-thumbnail');
  if (url) {
    img.src = url;
    img.classList.add('has-image');
    embed?.classList.add('has-thumbnail');
    img.onerror = () => img.classList.remove('has-image');
  } else {
    img.classList.remove('has-image');
    embed?.classList.remove('has-thumbnail');
  }
  updateJson();
}

