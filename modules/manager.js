// Data management, embeds logic, JSON operations and storage
export class WebUIManager {
    constructor() {
        this._localStorageKey = 'webwuiConfig';
        this._saveTimeout = null;
        this._saveDelay = 400; // 400ms throttling
        this.config = {
            msgContent: '',
            webhookUsername: '',
            webhookAvatarUrl: '',
            webhookUrl: '',
            embeds: []
        };
    }

    getEmbedsData() {
        const embedsContainer = document.getElementById('embedsContainer');
        if (!embedsContainer) return [];

        const embedItems = embedsContainer.querySelectorAll('.embed-item');
        return Array.from(embedItems)
            .map(container => this._extractEmbedFromContainer(container))
            .filter(embed => this._isEmbedNotEmpty(embed));
    }

    _extractEmbedFromContainer(container) {
        const embed = {};

        const title = container.querySelector('.emb-title')?.value?.trim();
        if (title) embed.title = title;

        const description = container.querySelector('.emb-desc')?.value?.trim();
        if (description) embed.description = description;

        const url = container.querySelector('.emb-url')?.value?.trim();
        if (url) embed.url = url;

        const colorInput = container.querySelector('.emb-color')?.value?.trim();
        if (colorInput && colorInput.startsWith('#')) {
            try {
                embed.color = parseInt(colorInput.slice(1), 16);
            } catch (e) {
            }
        }

        // Author
        const authorName = container.querySelector('.emb-author-name')?.value?.trim();
        const authorUrl = container.querySelector('.emb-author-url')?.value?.trim();
        const authorIcon = container.querySelector('.emb-author-icon')?.value?.trim();
        if (authorName || authorUrl || authorIcon) {
            embed.author = {};
            if (authorName) embed.author.name = authorName;
            if (authorUrl) embed.author.url = authorUrl;
            if (authorIcon) embed.author.icon_url = authorIcon;
        }

        // Fields
        const fieldsContainer = container.querySelector('.embed-fields-container');
        if (fieldsContainer) {
            const fieldItems = fieldsContainer.querySelectorAll('.field-item');
            const fields = Array.from(fieldItems).map(item => this._extractFieldFromItem(item)).filter(field => field);
            if (fields.length > 0) embed.fields = fields;
        }

        // Images
        const thumbnail = container.querySelector('.emb-thumbnail')?.value?.trim();
        if (thumbnail) embed.thumbnail = { url: thumbnail };

        const image = container.querySelector('.emb-image')?.value?.trim();
        if (image) embed.image = { url: image };

        // Footer
        const footerText = container.querySelector('.emb-footer-text')?.value?.trim();
        const footerIcon = container.querySelector('.emb-footer-icon')?.value?.trim();
        if (footerText || footerIcon) {
            embed.footer = {};
            if (footerText) embed.footer.text = footerText;
            if (footerIcon) embed.footer.icon_url = footerIcon;
        }

        // Timestamp
        const timestampMode = container.querySelector('.emb-timestamp-mode')?.value;

        if (timestampMode === 'auto') {
            // Use auto timestamp - placeholder for C# to replace
            embed.timestamp = '__AUTO_TIMESTAMP__';
        } else if (timestampMode === 'custom') {
            const timestampValue = container.querySelector('.emb-timestamp')?.value;
            if (timestampValue) {
                try {
                    embed.timestamp = new Date(timestampValue).toISOString();
                } catch (e) {
                    // Invalid timestamp, use current time
                    embed.timestamp = new Date().toISOString();
                }
            } else {
                embed.timestamp = new Date().toISOString();
            }
        }
        // If timestampMode === 'none', don't set timestamp at all

        return embed;
    }

    _extractFieldFromItem(item) {
        const name = item.querySelector('.field-name')?.value?.trim() || '';
        const value = item.querySelector('.field-value')?.value?.trim() || '';
        const inline = item.querySelector('.field-inline')?.checked || false;

        if (!name && !value) return null;

        return {
            name: name,
            value: value,
            inline: inline
        };
    }

    _isEmbedNotEmpty(embed) {
        const hasContent = embed.title || 
                          embed.description || 
                          embed.url || 
                          embed.color !== undefined ||
                          embed.author ||
                          (embed.fields && embed.fields.length > 0) ||
                          embed.thumbnail ||
                          embed.image ||
                          embed.footer ||
                          embed.timestamp;

        return hasContent;
    }

    buildJSON() {
        // Get current form values
        const msgContent = document.getElementById('msgContent')?.value || '';
        const webhookUsername = document.getElementById('webhookUsername')?.value || '';
        const webhookAvatarUrl = document.getElementById('webhookAvatarUrl')?.value || '';
        const webhookUrl = document.getElementById('webhookUrl')?.value || '';

        // Build payload - ALWAYS include fields, even if empty
        // This allows the backend to detect deleted fields for edits
        const payload = {
            content: msgContent,
            username: webhookUsername || null,
            avatar_url: webhookAvatarUrl || null
        };

        const embeds = this.getEmbedsData();
        payload.embeds = embeds.length > 0 ? embeds.map(embed => this._cleanEmbed(embed)) : [];

        return {
            payload: this._cleanPayload(payload),
            WebHookUrl: webhookUrl,
            validation: this._validatePayload(payload, webhookUrl)
        };
    }

    _cleanPayload(payload) {
        // Ensure all fields are present for the backend to process deletions
        // Empty strings and null values are intentionally kept
        return payload;
    }

    _cleanEmbed(embed) {
        const cleaned = {};

        // Title (max 256 characters)
        if (embed.title?.trim()) {
            cleaned.title = embed.title.trim().substring(0, 256);
        }

        // Description (max 4096 characters)
        if (embed.description?.trim()) {
            cleaned.description = embed.description.trim().substring(0, 4096);
        }

        // URL
        if (embed.url?.trim()) {
            cleaned.url = embed.url.trim();
        }

        // Color
        if (embed.color !== undefined && embed.color !== null && !isNaN(embed.color)) {
            cleaned.color = parseInt(embed.color);
        }

        // Author
        if (embed.author) {
            const author = {};
            if (embed.author.name?.trim()) {
                author.name = embed.author.name.trim().substring(0, 256);
            }
            if (embed.author.url?.trim()) {
                author.url = embed.author.url.trim();
            }
            if (embed.author.icon_url?.trim()) {
                author.icon_url = embed.author.icon_url.trim();
            }

            if (Object.keys(author).length > 0) {
                cleaned.author = author;
            }
        }

        // Fields (max 25 fields)
        if (embed.fields && embed.fields.length > 0) {
            const cleanedFields = embed.fields
                .filter(field => field.name?.trim() || field.value?.trim())
                .slice(0, 25)
                .map(field => ({
                    name: (field.name?.trim() || '').substring(0, 256),
                    value: (field.value?.trim() || '').substring(0, 1024),
                    inline: !!field.inline
                }));

            if (cleanedFields.length > 0) {
                cleaned.fields = cleanedFields;
            }
        }

        // Thumbnail
        if (embed.thumbnail?.url?.trim()) {
            cleaned.thumbnail = {
                url: embed.thumbnail.url.trim()
            };
        }

        // Image
        if (embed.image?.url?.trim()) {
            cleaned.image = {
                url: embed.image.url.trim()
            };
        }

        // Footer
        if (embed.footer) {
            const footer = {};
            if (embed.footer.text?.trim()) {
                footer.text = embed.footer.text.trim().substring(0, 2048);
            }
            if (embed.footer.icon_url?.trim()) {
                footer.icon_url = embed.footer.icon_url.trim();
            }

            if (Object.keys(footer).length > 0) {
                cleaned.footer = footer;
            }
        }

        // Timestamp
        if (embed.timestamp) {
            cleaned.timestamp = embed.timestamp;
        }

        return cleaned;
    }

    _validatePayload(payload, webhookUrl) {
        const errors = [];
        const warnings = [];

        // Check webhook URL format (basic validation)
        if (webhookUrl && !this._isValidDiscordWebhookUrl(webhookUrl)) {
            errors.push('Invalid Discord webhook URL format');
        }

        // Check if payload has any content
        const hasContent = payload.content?.trim() || (payload.embeds && payload.embeds.length > 0);
        if (!hasContent) {
            errors.push('Payload must contain at least a message or one embed');
        }

        // Check content length (max 2000 characters)
        if (payload.content && payload.content.length > 2000) {
            errors.push('Message content exceeds 2000 characters');
        }

        // Check embeds limits
        if (payload.embeds) {
            if (payload.embeds.length > 10) {
                errors.push('Maximum 10 embeds allowed');
            }

            // Check total embed character count (max 6000)
            const totalEmbedChars = payload.embeds.reduce((total, embed) => {
                let embedChars = 0;
                embedChars += embed.title?.length || 0;
                embedChars += embed.description?.length || 0;
                embedChars += embed.author?.name?.length || 0;
                embedChars += embed.footer?.text?.length || 0;
                if (embed.fields) {
                    embedChars += embed.fields.reduce((fieldTotal, field) => {
                        return fieldTotal + (field.name?.length || 0) + (field.value?.length || 0);
                    }, 0);
                }
                return total + embedChars;
            }, 0);

            if (totalEmbedChars > 6000) {
                errors.push('Total embed characters exceed 6000 limit');
            }
        }

        // Username validation (max 80 characters)
        if (payload.username && payload.username.length > 80) {
            warnings.push('Username exceeds 80 characters and will be truncated');
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    _isValidDiscordWebhookUrl(url) {
        const discordWebhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w\-]+$/;
        return discordWebhookPattern.test(url);
    }

    saveToLocalStorage() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }

        this._saveTimeout = setTimeout(() => {
            this._performSave();
            this._saveTimeout = null;
        }, this._saveDelay);
    }

    saveToLocalStorageNow() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
            this._saveTimeout = null;
        }
        this._performSave();
    }

    _performSave() {
        try {
            const config = {
                msgContent: document.getElementById('msgContent')?.value || '',
                webhookUsername: document.getElementById('webhookUsername')?.value || '',
                webhookAvatarUrl: document.getElementById('webhookAvatarUrl')?.value || '',
                webhookUrl: document.getElementById('webhookUrl')?.value || '',
                embeds: this.getEmbedsData()
            };

            localStorage.setItem(this._localStorageKey, JSON.stringify(config));
            console.debug('Configuration saved to localStorage');
        } catch (err) {
            console.error('Failed to save to localStorage:', err);
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem(this._localStorageKey);
            if (!data) return null;

            const config = JSON.parse(data);
            this.config = { ...this.config, ...config };
            return this.config;
        } catch (err) {
            console.error('Failed to load from localStorage:', err);
            return null;
        }
    }

    applyConfigToDOM(config) {
        if (!config) return;

        // Apply basic fields
        const msgContent = document.getElementById('msgContent');
        if (msgContent) msgContent.value = config.msgContent || '';

        const webhookUsername = document.getElementById('webhookUsername');
        if (webhookUsername) webhookUsername.value = config.webhookUsername || '';

        const webhookAvatarUrl = document.getElementById('webhookAvatarUrl');
        if (webhookAvatarUrl) webhookAvatarUrl.value = config.webhookAvatarUrl || '';

        const webhookUrl = document.getElementById('webhookUrl');
        if (webhookUrl) webhookUrl.value = config.webhookUrl || '';

        const embedsContainer = document.getElementById('embedsContainer');
        if (embedsContainer) {
            embedsContainer.innerHTML = '';
        }

        return config.embeds || [];
    }

    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);

            // Handle different import formats
            let config;
            if (imported.payload || imported.WebHookUrl) {
                // Full webhook format
                config = this._convertWebhookToConfig(imported);
            } else if (imported.msgContent !== undefined || imported.embeds) {
                // Direct config format
                config = imported;
            } else {
                throw new Error('Unrecognized import format');
            }

            return config;
        } catch (err) {
            throw new Error(`Import failed: ${err.message}`);
        }
    }

    _convertWebhookToConfig(webhook) {
        const config = {
            msgContent: '',
            webhookUsername: '',
            webhookAvatarUrl: '',
            webhookUrl: webhook.WebHookUrl || '',
            embeds: []
        };

        if (webhook.payload) {
            config.msgContent = webhook.payload.content || '';
            config.webhookUsername = webhook.payload.username || '';
            config.webhookAvatarUrl = webhook.payload.avatar_url || '';
            config.embeds = webhook.payload.embeds || [];
        }

        return config;
    }

    exportConfig() {
        const json = this.buildJSON();
        const dataStr = JSON.stringify(json, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `webwui-payload-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    clearAll() {
        // Clear fields
        const fields = ['msgContent', 'webhookUsername', 'webhookAvatarUrl', 'webhookUrl', 'globalVarName'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });

        // Clear embeds
        const embedsContainer = document.getElementById('embedsContainer');
        if (embedsContainer) {
            embedsContainer.innerHTML = '';
        }

        // Clear localStorage
        try {
            localStorage.removeItem(this._localStorageKey);
        } catch (err) {
            console.error('Failed to clear localStorage:', err);
        }

        this.config = {
            msgContent: '',
            webhookUsername: '',
            webhookAvatarUrl: '',
            webhookUrl: '',
            embeds: []
        };
    }

    processStreamerBotVariables(obj) {
        // Intentionally a passthrough - server-side Streamer.bot will process variables
        return obj;
    }
}