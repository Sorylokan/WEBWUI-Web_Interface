// DOM manipulation, event listeners, tabs and modals
export class WebUIInterface {
    constructor(manager, renderer, websocket) {
        this.manager = manager;
        this.renderer = renderer;
        this.websocket = websocket;

        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        // Header / connection
        this.connectBtn = document.getElementById('connectBtn');
        this.loadVarBtn = document.getElementById('loadVarBtn');
        this.testWebhookBtn = document.getElementById('testWebhookBtn');

        // Message / info inputs
        this.msgContent = document.getElementById('msgContent');
        this.webhookUsername = document.getElementById('webhookUsername');
        this.webhookAvatarUrl = document.getElementById('webhookAvatarUrl');
        this.webhookUrl = document.getElementById('webhookUrl');

        // Embeds controls
        this.addEmbedBtn = document.getElementById('addEmbedBtn');
        this.embedsContainer = document.getElementById('embedsContainer');

        // Preview / JSON controls
        this.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.importJsonBtn = document.getElementById('importJsonBtn');
        this.jsonImportArea = document.getElementById('jsonImportArea');
        this.saveBtn = document.getElementById('saveToStreamerBtn');
        this.copyJsonBtn = document.getElementById('copyJsonBtn');
        this.clearBtn = document.getElementById('clearBtn');

        // Modals
        this.importModal = document.getElementById('importModal');
        this.clearModal = document.getElementById('clearModal');
        this.loadConfigModal = document.getElementById('loadConfigModal');
        this.importConfigModal = document.getElementById('importConfigModal');
        this.removeEmbedModal = document.getElementById('removeEmbedModal');
        this.removeFieldModal = document.getElementById('removeFieldModal');

        // Store references for confirmation actions
        this._pendingAction = null;
        this._pendingTarget = null;
    }

    attachEventListeners() {
        this._attachTabListeners();
        this._attachConnectionListeners();
        this._attachInputListeners();
        this._attachEmbedListeners();
        this._attachControlListeners();
        this._attachModalListeners();
        this._attachJsonCollapseListener();
        this._attachWindowListeners();
        this._attachConfirmationModalsListeners();
    }

    _attachTabListeners() {
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.getAttribute('data-tab'));
            });
        });
    }

    _attachConnectionListeners() {
        if (this.connectBtn) {
            this.connectBtn.addEventListener('click', () => {
                if (this.websocket.isConnected()) {
                    this.websocket.disconnect();
                } else {
                    this.websocket.connect();
                }
            });
        }

        if (this.loadVarBtn) {
            this.loadVarBtn.addEventListener('click', () => this.loadGlobalVariable());
        }

        if (this.testWebhookBtn) {
            this.testWebhookBtn.addEventListener('click', () => this.testWebhook());
        }
    }

    _attachInputListeners() {
        const inputFields = [this.msgContent, this.webhookUsername, this.webhookAvatarUrl, this.webhookUrl];

        inputFields.forEach(el => {
            if (!el) return;

            el.addEventListener('input', () => {
                this.updateWebhookButtonState();
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });
        });
    }

    _attachEmbedListeners() {
        if (this.addEmbedBtn) {
            this.addEmbedBtn.addEventListener('click', () => {
                this.addEmbed();
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });
        }
    }

    _attachControlListeners() {
        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveToStreamerBot());
        }

        if (this.exportJsonBtn) {
            this.exportJsonBtn.addEventListener('click', () => this.manager.exportConfig());
        }

        if (this.importJsonBtn) {
            this.importJsonBtn.addEventListener('click', () => {
                this.importModal?.classList.remove('hidden');
            });
        }

        if (this.copyJsonBtn) {
            this.copyJsonBtn.addEventListener('click', (e) => this.copyJSON(e));
        }

        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => {
                this.clearModal?.classList.remove('hidden');
            });
        }
    }

    _attachModalListeners() {
        // Import modal
        const importConfirm = document.getElementById('importConfirmBtn');
        const importCancel = document.getElementById('importCancelBtn');

        if (importConfirm) {
            importConfirm.addEventListener('click', () => this.importJSON());
        }

        if (importCancel) {
            importCancel.addEventListener('click', () => {
                this.importModal?.classList.add('hidden');
                if (this.jsonImportArea) this.jsonImportArea.value = '';
            });
        }

        // Clear modal
        const clearConfirm = document.getElementById('clearConfirmBtn');
        const clearCancel = document.getElementById('clearCancelBtn');

        if (clearConfirm) {
            clearConfirm.addEventListener('click', () => {
                this.manager.clearAll();
                this.clearModal?.classList.add('hidden');
                this.updatePreview();
            });
        }

        if (clearCancel) {
            clearCancel.addEventListener('click', () => {
                this.clearModal?.classList.add('hidden');
            });
        }
    }

    _attachJsonCollapseListener() {
        const jsonHeader = document.querySelector('.json-header');
        const jsonCollapseBtn = document.getElementById('jsonCollapseBtn');
        const jsonContent = document.getElementById('jsonContent');

        if (jsonHeader && jsonCollapseBtn && jsonContent) {
            jsonHeader.addEventListener('click', () => {
                const isCollapsed = jsonContent.classList.contains('collapsed');
                if (isCollapsed) {
                    jsonContent.classList.remove('collapsed');
                    jsonCollapseBtn.classList.remove('collapsed');
                    jsonCollapseBtn.textContent = '▼';
                } else {
                    jsonContent.classList.add('collapsed');
                    jsonCollapseBtn.classList.add('collapsed');
                    jsonCollapseBtn.textContent = '▼';
                }
            });
        }
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(t => {
            t.classList.remove('active');
        });

        // Show selected tab
        const targetTab = document.querySelector(`[data-content="${tabName}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Update button states
        document.querySelectorAll('[data-tab]').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    addEmbed(data = {}) {
        const container = this.createEmbedContainer(data);
        this.embedsContainer?.appendChild(container);
        this.attachEmbedContainerListeners(container);
        return container;
    }

    createEmbedContainer(data = {}) {
        const container = document.createElement('div');
        container.className = 'embed-item';
        container.innerHTML = `
            <div class="embed-item-header">
                <div class="embed-item-controls">
                    <button class="collapse-toggle" title="Toggle collapse">▼</button>
                    <button class="btn btn-remove" data-remove-embed>Remove</button>
                </div>
            </div>
            <div class="embed-section">
                <strong>Author</strong>
                <input class="emb-author-name" placeholder="Name" maxlength="256">
                <input class="emb-author-url" placeholder="URL">
                <input class="emb-author-icon" placeholder="Icon URL">
            </div>
            <div class="embed-section">
                <strong>Basic Info</strong>
                <div class="basic-info-row">
                    <input class="emb-title" placeholder="Title" maxlength="256">
                    <div class="color-picker-group">
                        <input type="color" class="emb-color-picker" value="#3366ff">
                        <input class="emb-color" placeholder="#3366ff">
                    </div>
                </div>
                <textarea class="emb-desc" placeholder="Description" rows="3" maxlength="4096"></textarea>
                <input class="emb-url" placeholder="URL">
            </div>
            <div class="embed-section">
                <strong>Fields</strong>
                <div class="embed-fields-container"></div>
                <button class="btn embed-add-field-btn">Add Field</button>
            </div>
            <div class="embed-section">
                <strong>Images</strong>
                <input class="emb-thumbnail" placeholder="Thumbnail URL">
                <input class="emb-image" placeholder="Image URL">
            </div>
            <div class="embed-section">
                <strong>Footer</strong>
                <input class="emb-footer-text" placeholder="Footer text" maxlength="2048">
                <input class="emb-footer-icon" placeholder="Footer icon URL">
            </div>
            <div class="embed-section">
                <label>Timestamp</label>
                <select class="emb-timestamp-mode">
                    <option value="none">None</option>
                    <option value="auto">Auto (sending time)</option>
                    <option value="custom">Custom</option>
                </select>
                <input type="datetime-local" class="emb-timestamp" style="display: none;">
            </div>
        `;

        // Populate with data if provided
        this.populateEmbedContainer(container, data);

        return container;
    }

    populateEmbedContainer(container, data) {
        if (!data) return;

        // Basic info
        if (data.title) container.querySelector('.emb-title').value = data.title;
        if (data.description) container.querySelector('.emb-desc').value = data.description;
        if (data.url) container.querySelector('.emb-url').value = data.url;

        // Color
        if (data.color !== undefined && data.color !== null) {
            const colorValue = '#' + Number(data.color).toString(16).padStart(6, '0');
            container.querySelector('.emb-color').value = colorValue;
            container.querySelector('.emb-color-picker').value = colorValue;
        }

        // Author
        if (data.author) {
            container.querySelector('.emb-author-name').value = data.author.name || '';
            container.querySelector('.emb-author-url').value = data.author.url || '';
            container.querySelector('.emb-author-icon').value = data.author.icon_url || '';
        }

        // Footer
        if (data.footer) {
            container.querySelector('.emb-footer-text').value = data.footer.text || '';
            container.querySelector('.emb-footer-icon').value = data.footer.icon_url || '';
        }

        // Images
        if (data.thumbnail) container.querySelector('.emb-thumbnail').value = data.thumbnail.url || '';
        if (data.image) container.querySelector('.emb-image').value = data.image.url || '';

        // Timestamp
        if (data.timestamp) {
            const timestampMode = container.querySelector('.emb-timestamp-mode');
            if (data.timestamp === '__AUTO_TIMESTAMP__') {
                timestampMode.value = 'auto';
            } else {
                timestampMode.value = 'custom';
                try {
                    container.querySelector('.emb-timestamp').value = new Date(data.timestamp).toISOString().slice(0, 16);
                    container.querySelector('.emb-timestamp').style.display = 'block';
                } catch (e) {
                    console.error('Invalid timestamp:', data.timestamp);
                }
            }
        }

        // Fields
        const fieldsContainer = container.querySelector('.embed-fields-container');
        if (data.fields && Array.isArray(data.fields)) {
            data.fields.forEach(field => {
                this.addFieldToContainer(fieldsContainer, field);
            });
        }
    }

    attachEmbedContainerListeners(container) {
        // Helper: check if embed has content (any text field filled)
        const isEmbedEmpty = () => {
            // Get ALL inputs except color/checkbox, plus textareas
            const inputs = container.querySelectorAll('input:not([type="color"]):not([type="checkbox"]), textarea');
            return Array.from(inputs).every(input => !input.value.trim());
        };

        // Collapse toggle - click on entire header
        const embedHeader = container.querySelector('.embed-item-header');
        const collapseToggle = container.querySelector('.collapse-toggle');
        if (embedHeader && collapseToggle) {
            embedHeader.addEventListener('click', (e) => {
                // Don't trigger if clicking on remove button
                if (e.target.closest('[data-remove-embed]')) return;
                e.preventDefault();
                collapseToggle.classList.toggle('collapsed');
                container.classList.toggle('collapsed');
            });
        }

        // Remove embed
        const removeBtn = container.querySelector('[data-remove-embed]');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (isEmbedEmpty()) {
                    // No content, remove directly
                    container.remove();
                    this.updatePreview();
                    this.manager.saveToLocalStorage();
                } else {
                    // Has content, show confirmation modal
                    this._pendingTarget = container;
                    this.removeEmbedModal?.classList.remove('hidden');
                }
            });
        }

        // Add field
        const addFieldBtn = container.querySelector('.embed-add-field-btn');
        if (addFieldBtn) {
            addFieldBtn.addEventListener('click', () => {
                const fieldsContainer = container.querySelector('.embed-fields-container');
                this.addFieldToContainer(fieldsContainer);
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });
        }

        // Color picker sync
        const colorInput = container.querySelector('.emb-color');
        const colorPicker = container.querySelector('.emb-color-picker');

        if (colorInput && colorPicker) {
            colorInput.addEventListener('input', () => {
                if (colorInput.value.startsWith('#')) {
                    colorPicker.value = colorInput.value;
                }
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });

            colorPicker.addEventListener('input', () => {
                colorInput.value = colorPicker.value;
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });
        }

        // All other inputs
        const inputs = container.querySelectorAll('input, textarea');
        inputs.forEach(input => {
            if (input.type === 'color') return; // Already handled above

            input.addEventListener('input', () => {
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });
        });

        // Timestamp mode dropdown
        const timestampMode = container.querySelector('.emb-timestamp-mode');
        const timestampInput = container.querySelector('.emb-timestamp');

        if (timestampMode && timestampInput) {
            timestampMode.addEventListener('change', () => {
                if (timestampMode.value === 'custom') {
                    timestampInput.style.display = 'block';
                } else {
                    timestampInput.style.display = 'none';
                }
                this.updatePreview();
                this.manager.saveToLocalStorage();
            });
        }
    }

    addFieldToContainer(fieldsContainer, fieldData = {}) {
        const fid = Date.now() + Math.floor(Math.random() * 1000);
        const fieldItem = document.createElement('div');
        fieldItem.className = 'field-item';
        fieldItem.innerHTML = `
            <div class="field-item-header">
                <div class="embed-item-controls">
                    <button class="collapse-toggle" title="Toggle collapse">▼</button>
                    <button class="btn btn-remove">Remove</button>
                </div>
            </div>
            <div class="field-name-row">
                <input class="field-name" placeholder="Name" maxlength="256">
                <label class="inline-checkbox-label">
                    <input type="checkbox" class="field-inline" id="inline-${fid}">
                    Inline
                </label>
            </div>
            <textarea class="field-value" rows="2" placeholder="Value" maxlength="1024"></textarea>
        `;

        // Set field data if provided
        if (fieldData.name) fieldItem.querySelector('.field-name').value = fieldData.name;
        if (fieldData.value) fieldItem.querySelector('.field-value').value = fieldData.value;
        if (fieldData.inline) fieldItem.querySelector('.field-inline').checked = !!fieldData.inline;

        // Attach event listeners
        fieldItem.querySelector('.field-name').addEventListener('input', () => { 
            this.updatePreview(); 
            this.manager.saveToLocalStorage(); 
        });
        fieldItem.querySelector('.field-value').addEventListener('input', () => { 
            this.updatePreview(); 
            this.manager.saveToLocalStorage(); 
        });
        fieldItem.querySelector('.field-inline').addEventListener('change', () => { 
            this.updatePreview(); 
            this.manager.saveToLocalStorage(); 
        });
        fieldItem.querySelector('.btn-remove').addEventListener('click', () => { 
            // Check if field has content
            const nameInput = fieldItem.querySelector('.field-name');
            const valueInput = fieldItem.querySelector('.field-value');
            const isEmpty = !nameInput?.value.trim() && !valueInput?.value.trim();
            
            if (isEmpty) {
                // No content, remove directly
                fieldItem.remove();
                this.updatePreview();
                this.manager.saveToLocalStorage();
            } else {
                // Has content, show confirmation modal
                this._pendingTarget = fieldItem;
                this.removeFieldModal?.classList.remove('hidden');
            }
        });

        // Collapse functionality - click on entire header
        const fieldHeader = fieldItem.querySelector('.field-item-header');
        const fieldCollapseBtn = fieldItem.querySelector('.collapse-toggle');
        if (fieldHeader && fieldCollapseBtn) {
            fieldHeader.addEventListener('click', (e) => { 
                // Don't trigger if clicking on remove button
                if (e.target.closest('.btn-remove')) return;
                e.preventDefault(); 
                fieldCollapseBtn.classList.toggle('collapsed'); 
                fieldItem.classList.toggle('collapsed'); 
            });
        }

        fieldsContainer.appendChild(fieldItem);
        return fieldItem;
    }

    updatePreview() {
        const json = this.manager.buildJSON();
        const payload = json.payload || {};

        const webhookUsername = this.webhookUsername?.value || 'WEB•UI - Announcement';
        const webhookAvatarUrl = this.webhookAvatarUrl?.value || 'WEBWUI_Icon.svg';

        this.renderer.updatePreview(payload, webhookUsername, webhookAvatarUrl);
        this.renderer.updateJSONViewer(json);
        this._updateValidationDisplay(json.validation);
    }

    _updateValidationDisplay(validation) {
        // Update save button state based on validation
        if (this.saveBtn) {
            this.saveBtn.disabled = !validation.isValid;
            this.saveBtn.title = validation.isValid ? 
                'Save to StreamerBot' : 
                'Cannot save: ' + validation.errors.join(', ');
        }

        // Update test webhook button state
        this._updateWebhookButtonState(validation);

        // Show validation notifications if there are errors
        if (validation.errors.length > 0) {
            const errorMsg = validation.errors.join('\n• ');
            console.warn('Payload validation errors:\n• ' + errorMsg);
        }

        if (validation.warnings.length > 0) {
            const warningMsg = validation.warnings.join('\n• ');
            console.info('Payload validation warnings:\n• ' + warningMsg);
        }
    }

    _updateWebhookButtonState(validation) {
        if (!this.testWebhookBtn) return;

        const hasUrl = this.webhookUrl?.value?.trim();
        const isValid = validation && validation.isValid;

        this.testWebhookBtn.disabled = !hasUrl || !isValid;

        if (!hasUrl) {
            this.testWebhookBtn.title = 'Enter a Discord Webhook URL to test';
        } else if (!isValid) {
            this.testWebhookBtn.title = 'Fix validation errors before testing';
        } else {
            this.testWebhookBtn.title = 'Test webhook with current configuration';
        }
    }

    updateWebhookButtonState() {
        // Get validation from current JSON build
        const json = this.manager.buildJSON();
        this._updateWebhookButtonState(json.validation);
    }

    async testWebhook() {
        const webhookUrl = this.webhookUrl?.value?.trim();
        if (!webhookUrl) {
            this.renderer.showNotification('Webhook URL is required', 'error');
            return;
        }

        try {
            const json = this.manager.buildJSON();

            // Check validation before sending
            if (!json.validation.isValid) {
                const errorMsg = json.validation.errors.join('\n• ');
                this.renderer.showNotification('Cannot send webhook:\n• ' + errorMsg, 'error');
                return;
            }

            const result = await this.websocket.testWebhookDirect(webhookUrl, json.payload);

            if (result.ok) {
                this.renderer.showNotification('Test webhook sent successfully! 📤', 'success');
            } else if (result.status === 401 || result.status === 404) {
                this.renderer.showNotification('Invalid webhook URL or expired', 'error');
            } else {
                this.renderer.showNotification(`Webhook error: ${result.status} ${result.statusText}`, 'error');
            }
        } catch (err) {
            console.error('Webhook test error:', err);
            this.renderer.showNotification(`Failed to send webhook: ${err.message}`, 'error');
        }
    }

    saveToStreamerBot() {
        if (!this.websocket.isConnected()) {
            this.renderer.showNotification('Not connected to Streamer.bot', 'error');
            return;
        }

        try {
            const json = this.manager.buildJSON();

            // Check validation before saving
            if (!json.validation.isValid) {
                const errorMsg = json.validation.errors.join('\n• ');
                this.renderer.showNotification('Cannot save invalid payload:\n• ' + errorMsg, 'error');
                return;
            }

            // Show warnings if any
            if (json.validation.warnings.length > 0) {
                const warningMsg = json.validation.warnings.join('\n• ');
                console.warn('Payload warnings:\n• ' + warningMsg);
            }

            const processed = this.manager.processStreamerBotVariables(json);
            const result = this.websocket.sendPayloadToAction(processed);

            this.renderer.showNotification('Payload sent to Streamer.bot action', 'success');
            console.log('Saved to Streamer.bot:', result);
        } catch (err) {
            this.renderer.showNotification(`Failed to save: ${err.message}`, 'error');
        }
    }

    loadGlobalVariable() {
        if (!this.websocket.isConnected()) {
            this.renderer.showNotification('Not connected to Streamer.bot', 'error');
            return;
        }

        // Check if there's existing content to potentially lose
        const hasContent = this._hasExistingContent();
        if (hasContent) {
            this._pendingAction = 'loadConfig';
            this.loadConfigModal?.classList.remove('hidden');
            return;
        }

        this._performLoadConfig();
    }

    _performLoadConfig() {
        try {
            const varName = this.websocket.loadGlobalVariable();
            this.renderer.showNotification(`Requested variable: ${varName}`, 'info');
        } catch (err) {
            this.renderer.showNotification(`Failed to load variable: ${err.message}`, 'error');
        }
    }

    importJSON() {
        // Check if there's existing content to potentially lose
        const hasContent = this._hasExistingContent();
        if (hasContent) {
            this._pendingAction = 'importConfig';
            this.importConfigModal?.classList.remove('hidden');
            return;
        }

        this._performImportConfig();
    }

    _performImportConfig() {
        try {
            const jsonText = this.jsonImportArea?.value?.trim();
            if (!jsonText) {
                this.renderer.showNotification('No JSON to import', 'error');
                return;
            }

            const config = this.manager.importConfig(jsonText);
            const embeds = this.manager.applyConfigToDOM(config);

            // Recreate embeds
            if (this.embedsContainer) {
                this.embedsContainer.innerHTML = '';
                if (embeds && embeds.length > 0) {
                    embeds.forEach(embedData => this.addEmbed(embedData));
                }
            }

            this.updatePreview();
            this.manager.saveToLocalStorageNow(); // Immediate save for import action

            this.importModal?.classList.add('hidden');
            if (this.jsonImportArea) this.jsonImportArea.value = '';

            this.renderer.showNotification('Configuration imported successfully', 'success');
        } catch (err) {
            this.renderer.showNotification(`Import failed: ${err.message}`, 'error');
        }
    }

    copyJSON(event) {
        try {
            const json = this.manager.buildJSON();
            
            // Check if Ctrl key is pressed
            const isCompact = event && event.ctrlKey;
            
            // Format JSON: compact if Ctrl+Click, formatted if normal click
            const jsonString = isCompact 
                ? JSON.stringify(json)  // One line
                : JSON.stringify(json, null, 2);  // Formatted with indentation

            navigator.clipboard.writeText(jsonString).then(() => {
                const message = isCompact 
                    ? 'JSON copied (compact) to clipboard' 
                    : 'JSON copied to clipboard';
                this.renderer.showNotification(message, 'success');
            }).catch(() => {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = jsonString;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                const message = isCompact 
                    ? 'JSON copied (compact) to clipboard' 
                    : 'JSON copied to clipboard';
                this.renderer.showNotification(message, 'success');
            });
        } catch (err) {
            this.renderer.showNotification(`Failed to copy: ${err.message}`, 'error');
        }
    }

    initialize() {
        const config = this.manager.loadFromLocalStorage();
        if (config) {
            const embeds = this.manager.applyConfigToDOM(config);

            // Recreate embeds
            if (embeds && embeds.length > 0) {
                embeds.forEach(embedData => this.addEmbed(embedData));
            }
        }

        this.updateWebhookButtonState();
        this.updatePreview();
    }

    _attachWindowListeners() {
        // Save immediately before page unload to prevent data loss
        window.addEventListener('beforeunload', () => {
            this.manager.saveToLocalStorageNow();
        });

        // Also save on page visibility change (tab switch, minimize, etc.)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.manager.saveToLocalStorageNow();
            }
        });
    }

    _attachConfirmationModalsListeners() {
        // Load Config Modal
        const loadConfigConfirmBtn = document.getElementById('loadConfigConfirmBtn');
        const loadConfigCancelBtn = document.getElementById('loadConfigCancelBtn');

        if (loadConfigConfirmBtn) {
            loadConfigConfirmBtn.addEventListener('click', () => {
                this.loadConfigModal?.classList.add('hidden');
                this._performLoadConfig();
            });
        }

        if (loadConfigCancelBtn) {
            loadConfigCancelBtn.addEventListener('click', () => {
                this.loadConfigModal?.classList.add('hidden');
                this.renderer.showNotification('Load canceled', 'info');
            });
        }

        // Import Config Modal
        const importConfigConfirmBtn = document.getElementById('importConfigConfirmBtn');
        const importConfigCancelBtn = document.getElementById('importConfigCancelBtn');

        if (importConfigConfirmBtn) {
            importConfigConfirmBtn.addEventListener('click', () => {
                this.importConfigModal?.classList.add('hidden');
                this._performImportConfig();
            });
        }

        if (importConfigCancelBtn) {
            importConfigCancelBtn.addEventListener('click', () => {
                this.importConfigModal?.classList.add('hidden');
                this.renderer.showNotification('Import canceled', 'info');
            });
        }

        // Remove Embed Modal
        const removeEmbedConfirmBtn = document.getElementById('removeEmbedConfirmBtn');
        const removeEmbedCancelBtn = document.getElementById('removeEmbedCancelBtn');

        if (removeEmbedConfirmBtn) {
            removeEmbedConfirmBtn.addEventListener('click', () => {
                this.removeEmbedModal?.classList.add('hidden');
                if (this._pendingTarget) {
                    this._pendingTarget.remove();
                    this.updatePreview();
                    this.manager.saveToLocalStorage();
                    this.renderer.showNotification('Embed removed', 'info');
                    this._pendingTarget = null;
                }
            });
        }

        if (removeEmbedCancelBtn) {
            removeEmbedCancelBtn.addEventListener('click', () => {
                this.removeEmbedModal?.classList.add('hidden');
                this._pendingTarget = null;
            });
        }

        // Remove Field Modal
        const removeFieldConfirmBtn = document.getElementById('removeFieldConfirmBtn');
        const removeFieldCancelBtn = document.getElementById('removeFieldCancelBtn');

        if (removeFieldConfirmBtn) {
            removeFieldConfirmBtn.addEventListener('click', () => {
                this.removeFieldModal?.classList.add('hidden');
                if (this._pendingTarget) {
                    this._pendingTarget.remove();
                    this.updatePreview();
                    this.manager.saveToLocalStorage();
                    this.renderer.showNotification('Field removed', 'info');
                    this._pendingTarget = null;
                }
            });
        }

        if (removeFieldCancelBtn) {
            removeFieldCancelBtn.addEventListener('click', () => {
                this.removeFieldModal?.classList.add('hidden');
                this._pendingTarget = null;
            });
        }
    }

    _hasExistingContent() {
        const msgContent = document.getElementById('msgContent')?.value?.trim();
        const webhookUrl = document.getElementById('webhookUrl')?.value?.trim();
        const webhookUsername = document.getElementById('webhookUsername')?.value?.trim();
        const embedsContainer = document.getElementById('embedsContainer');
        const hasEmbeds = embedsContainer && embedsContainer.children.length > 0;

        return !!(msgContent || webhookUrl || webhookUsername || hasEmbeds);
    }
}