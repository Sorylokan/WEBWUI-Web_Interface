// Preview HTML generation and display
export class WebUIRenderer {
    constructor() {
        this.previewMessage = document.getElementById('previewMessage');
        this.jsonViewer = document.getElementById('jsonViewer');
        this._isInitialized = false;
    }

    updatePreview(payload, webhookUsername = 'WEB•UI - Announcement', webhookAvatarUrl = 'WEBWUI_Icon.svg') {
        // First render: create everything
        if (!this._isInitialized || !this.previewMessage.hasChildNodes()) {
            this._fullRender(payload, webhookUsername, webhookAvatarUrl);
            this._isInitialized = true;
            return;
        }

        // Incremental update: only update changed parts
        this._incrementalUpdate(payload, webhookUsername, webhookAvatarUrl);
    }

    _fullRender(payload, webhookUsername, webhookAvatarUrl) {
        let previewHTML = this._renderWebhookHeader(webhookUsername, webhookAvatarUrl);

        if (payload.content) {
            previewHTML += `<div class="message-content">${this.parseDiscordMarkdown(payload.content)}</div>`;
        }

        if (payload.embeds && payload.embeds.length) {
            payload.embeds.forEach(embed => {
                previewHTML += this.renderEmbedPreview(embed);
            });
        }

        if (!payload.content && (!payload.embeds || !payload.embeds.length)) {
            previewHTML += '<div class="message-content">No message configured yet</div>';
        }

        if (this.previewMessage) {
            this.previewMessage.innerHTML = previewHTML;
        }
    }

    _incrementalUpdate(payload, webhookUsername, webhookAvatarUrl) {
        // Update webhook header (username/avatar) without recreating images
        const webhookHeader = this.previewMessage.querySelector('.webhook-header');
        if (webhookHeader) {
            const nameEl = webhookHeader.querySelector('.webhook-name');
            const avatarEl = webhookHeader.querySelector('.webhook-avatar');
            
            if (nameEl) {
                const escapedUsername = this.escapeHtml(webhookUsername);
                if (nameEl.innerHTML !== escapedUsername) {
                    nameEl.innerHTML = escapedUsername;
                }
            }
            
            // Only update avatar if URL actually changed
            if (avatarEl && avatarEl.getAttribute('src') !== webhookAvatarUrl) {
                avatarEl.src = webhookAvatarUrl;
            }
        }

        // Update message content
        let messageContent = this.previewMessage.querySelector('.message-content');
        if (payload.content) {
            const newContent = this.parseDiscordMarkdown(payload.content);
            if (!messageContent) {
                // Create if doesn't exist
                messageContent = document.createElement('div');
                messageContent.className = 'message-content';
                webhookHeader?.parentNode.insertBefore(messageContent, webhookHeader.nextSibling);
            }
            if (messageContent.innerHTML !== newContent) {
                messageContent.innerHTML = newContent;
            }
        } else if (messageContent && !payload.embeds?.length) {
            messageContent.innerHTML = 'No message configured yet';
        } else if (messageContent && payload.embeds?.length) {
            messageContent.remove();
        }

        // Update embeds - for now do a simple check
        const existingEmbeds = this.previewMessage.querySelectorAll('.embed-preview');
        if (payload.embeds && payload.embeds.length !== existingEmbeds.length) {
            // Number of embeds changed, do full re-render
            this._fullRender(payload, webhookUsername, webhookAvatarUrl);
        } else if (payload.embeds && payload.embeds.length > 0) {
            // Update each embed individually
            payload.embeds.forEach((embed, index) => {
                this._updateEmbed(existingEmbeds[index], embed);
            });
        }
    }

    _updateEmbed(embedEl, embed) {
        if (!embedEl) return;

        const embedContent = embedEl.querySelector('.embed-content');

        // Update author section
        const authorHeader = embedEl.querySelector('.embed-header');
        if (embed.author) {
            if (!authorHeader) {
                // Create author section
                const newAuthor = document.createElement('div');
                newAuthor.className = 'embed-header';
                if (embed.author.icon_url) {
                    const icon = document.createElement('img');
                    icon.className = 'embed-author-icon';
                    icon.src = embed.author.icon_url;
                    icon.onerror = function() { this.style.display = 'none'; };
                    newAuthor.appendChild(icon);
                }
                const name = document.createElement('span');
                name.className = 'embed-author-name';
                name.textContent = this.escapeHtml(embed.author.name || '');
                newAuthor.appendChild(name);
                embedContent?.prepend(newAuthor);
            } else {
                // Update existing author
                const authorIcon = authorHeader.querySelector('.embed-author-icon');
                const authorName = authorHeader.querySelector('.embed-author-name');
                
                // Update author icon
                if (embed.author.icon_url) {
                    if (!authorIcon) {
                        const icon = document.createElement('img');
                        icon.className = 'embed-author-icon';
                        icon.src = embed.author.icon_url;
                        icon.onerror = function() { this.style.display = 'none'; };
                        authorHeader.prepend(icon);
                    } else if (authorIcon.getAttribute('src') !== embed.author.icon_url) {
                        authorIcon.src = embed.author.icon_url;
                        authorIcon.style.display = '';
                    }
                } else if (authorIcon) {
                    authorIcon.remove();
                }
                
                // Update author name
                if (authorName && authorName.textContent !== (embed.author.name || '')) {
                    authorName.textContent = this.escapeHtml(embed.author.name || '');
                }
            }
        } else if (authorHeader) {
            authorHeader.remove();
        }

        // Update title
        const titleEl = embedEl.querySelector('.embed-title');
        if (embed.title) {
            if (!titleEl) {
                const newTitle = document.createElement('div');
                newTitle.className = 'embed-title';
                newTitle.textContent = this.escapeHtml(embed.title);
                embedContent?.appendChild(newTitle);
            } else if (titleEl.textContent !== embed.title) {
                titleEl.textContent = this.escapeHtml(embed.title);
            }
        } else if (titleEl) {
            titleEl.remove();
        }

        // Update description
        const descEl = embedEl.querySelector('.embed-description');
        const newDesc = embed.description ? this.parseDiscordMarkdown(embed.description).replace(/\n/g, '<br>') : '';
        if (embed.description) {
            if (!descEl) {
                const newDescEl = document.createElement('div');
                newDescEl.className = 'embed-description';
                newDescEl.innerHTML = newDesc;
                embedContent?.appendChild(newDescEl);
            } else if (descEl.innerHTML !== newDesc) {
                descEl.innerHTML = newDesc;
            }
        } else if (descEl) {
            descEl.remove();
        }

        // Update fields - recreate if changed
        const existingFieldsContainers = embedEl.querySelectorAll('.embed-fields, .embed-field');
        const hasFields = embed.fields && embed.fields.length > 0;
        
        if (hasFields) {
            const newFieldsHTML = this._renderEmbedFields(embed.fields);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = newFieldsHTML;
            
            // Simple comparison: if number of field containers changed or content different, recreate
            const needsUpdate = existingFieldsContainers.length === 0 || 
                               tempDiv.innerHTML !== Array.from(existingFieldsContainers)
                                   .map(el => el.outerHTML).join('');
            
            if (needsUpdate) {
                // Remove all existing fields
                existingFieldsContainers.forEach(el => el.remove());
                
                // Insert new fields after embed-grid, before image
                const embedGrid = embedEl.querySelector('.embed-grid');
                const imageEl = embedEl.querySelector('.embed-image');
                
                if (imageEl) {
                    imageEl.before(...tempDiv.childNodes);
                } else {
                    const footerEl = embedEl.querySelector('.embed-footer');
                    if (footerEl) {
                        footerEl.before(...tempDiv.childNodes);
                    } else if (embedGrid) {
                        embedGrid.after(...tempDiv.childNodes);
                    }
                }
            }
        } else if (existingFieldsContainers.length > 0) {
            // Remove all fields if none in embed
            existingFieldsContainers.forEach(el => el.remove());
        }

        // Update main image - only if URL changed
        const imageEl = embedEl.querySelector('.embed-image');
        if (embed.image?.url) {
            if (!imageEl) {
                const newImg = document.createElement('img');
                newImg.className = 'embed-image';
                newImg.src = embed.image.url;
                newImg.onerror = function() { this.style.display = 'none'; };
                // Insert before footer if it exists, otherwise append
                const footerEl = embedEl.querySelector('.embed-footer');
                if (footerEl) {
                    footerEl.before(newImg);
                } else {
                    embedEl.appendChild(newImg);
                }
            } else if (imageEl.getAttribute('src') !== embed.image.url) {
                imageEl.src = embed.image.url;
                imageEl.style.display = '';
            }
        } else if (imageEl) {
            imageEl.remove();
        }

        // Update thumbnail - only if URL changed
        const thumbnailContainer = embedEl.querySelector('.embed-thumbnail-container');
        if (embed.thumbnail?.url) {
            if (!thumbnailContainer) {
                // Create thumbnail container if it doesn't exist
                const newContainer = document.createElement('div');
                newContainer.className = 'embed-thumbnail-container';
                newContainer.innerHTML = `<img src="${embed.thumbnail.url}" class="embed-thumbnail" onerror="this.style.display='none'">`;
                embedEl.querySelector('.embed-grid').appendChild(newContainer);
            } else {
                // Update existing thumbnail
                const thumbnailEl = thumbnailContainer.querySelector('.embed-thumbnail');
                if (thumbnailEl && thumbnailEl.getAttribute('src') !== embed.thumbnail.url) {
                    thumbnailEl.src = embed.thumbnail.url;
                    thumbnailEl.style.display = '';
                }
            }
        } else {
            // Remove thumbnail if no URL
            if (thumbnailContainer) {
                thumbnailContainer.remove();
            }
        }

        // Update footer section
        const footerEl = embedEl.querySelector('.embed-footer');
        if (embed.footer || embed.timestamp) {
            if (!footerEl) {
                // Create footer
                const newFooter = document.createElement('div');
                newFooter.className = 'embed-footer';
                newFooter.innerHTML = this._renderEmbedFooter(embed.footer, embed.timestamp).match(/<div class="embed-footer">(.*?)<\/div>/s)?.[1] || '';
                embedEl.appendChild(newFooter);
            } else {
                // Update footer icon
                const footerIcon = footerEl.querySelector('.embed-footer-icon');
                if (embed.footer?.icon_url) {
                    if (!footerIcon) {
                        const icon = document.createElement('img');
                        icon.className = 'embed-footer-icon';
                        icon.src = embed.footer.icon_url;
                        icon.onerror = function() { this.style.display = 'none'; };
                        footerEl.prepend(icon);
                    } else if (footerIcon.getAttribute('src') !== embed.footer.icon_url) {
                        footerIcon.src = embed.footer.icon_url;
                        footerIcon.style.display = '';
                    }
                } else if (footerIcon) {
                    footerIcon.remove();
                }

                // Update footer text
                const footerText = footerEl.querySelector('.embed-footer-text');
                if (embed.footer?.text) {
                    if (!footerText) {
                        const text = document.createElement('span');
                        text.className = 'embed-footer-text';
                        text.textContent = this.escapeHtml(embed.footer.text);
                        if (footerIcon) {
                            footerIcon.after(text);
                        } else {
                            footerEl.prepend(text);
                        }
                    } else if (footerText.textContent !== embed.footer.text) {
                        footerText.textContent = this.escapeHtml(embed.footer.text);
                    }
                } else if (footerText) {
                    footerText.remove();
                }

                // Update timestamp
                const timestampEl = footerEl.querySelector('.embed-timestamp');
                if (embed.timestamp) {
                    const date = new Date(embed.timestamp);
                    const timeStr = !isNaN(date.getTime()) ? date.toLocaleString() : '';
                    if (!timestampEl && timeStr) {
                        const ts = document.createElement('span');
                        ts.className = 'embed-timestamp';
                        ts.textContent = (embed.footer ? ' • ' : '') + timeStr;
                        footerEl.appendChild(ts);
                    } else if (timestampEl) {
                        const newTimeStr = (embed.footer ? ' • ' : '') + timeStr;
                        if (timestampEl.textContent !== newTimeStr) {
                            timestampEl.textContent = newTimeStr;
                        }
                    }
                } else if (timestampEl) {
                    timestampEl.remove();
                }
            }
        } else if (footerEl) {
            footerEl.remove();
        }

        // Update color
        if (embed.color) {
            const color = '#' + embed.color.toString(16).padStart(6, '0');
            if (embedEl.style.borderLeftColor !== color) {
                embedEl.style.borderLeftColor = color;
            }
        }
    }

    _renderWebhookHeader(webhookUsername, webhookAvatarUrl) {
        return `<div class="webhook-header">
            <img src="${webhookAvatarUrl}" class="webhook-avatar" onerror="this.src='WEBWUI_Icon.svg'">
            <span class="webhook-name">${this.escapeHtml(webhookUsername)}</span>
        </div>`;
    }

    renderEmbedPreview(embed) {
        const color = embed.color ? '#' + embed.color.toString(16).padStart(6, '0') : '#5865f2';
        let html = `<div class="embed-preview" style="border-left: 4px solid ${color}"><div class="embed-grid"><div class="embed-content">`;

        // Author section
        if (embed.author) {
            html += '<div class="embed-header">';
            if (embed.author.icon_url) {
                html += `<img src="${embed.author.icon_url}" class="embed-author-icon" onerror="this.style.display='none'">`;
            }
            html += `<span class="embed-author-name">${this.escapeHtml(embed.author.name || '')}</span></div>`;
        }

        // Title and description
        if (embed.title) {
            html += `<div class="embed-title">${this.escapeHtml(embed.title)}</div>`;
        }
        if (embed.description) {
            html += `<div class="embed-description">${this.parseDiscordMarkdown(embed.description).replace(/\n/g, '<br>')}</div>`;
        }

        // Close content column
        html += '</div>';

        // Thumbnail in separate column
        if (embed.thumbnail && embed.thumbnail.url) {
            html += `<div class="embed-thumbnail-container"><img src="${embed.thumbnail.url}" class="embed-thumbnail" onerror="this.style.display='none'"></div>`;
        }

        // Close grid, start fields
        html += '</div>';

        // Fields with inline/non-inline rendering
        if (embed.fields && embed.fields.length) {
            html += this._renderEmbedFields(embed.fields);
        }

        // Main image
        if (embed.image && embed.image.url) {
            html += `<img src="${embed.image.url}" class="embed-image" onerror="this.style.display='none'">`;
        }

        // Footer
        if (embed.footer || embed.timestamp) {
            html += this._renderEmbedFooter(embed.footer, embed.timestamp);
        }

        html += '</div>';
        return html;
    }

    _renderEmbedFields(fields) {
        let html = '';
        let currentInlineGroup = [];

        fields.forEach((field, index) => {
            if (field.inline && currentInlineGroup.length < 3) {
                currentInlineGroup.push(field);

                // Render group if we're at the last field, next field isn't inline, or we have 3 fields
                if (index === fields.length - 1 || !fields[index + 1]?.inline || currentInlineGroup.length === 3) {
                    html += '<div class="embed-fields">';
                    currentInlineGroup.forEach(inlineField => {
                        html += `<div class="embed-field">
                            <div class="embed-field-name">${this.escapeHtml(inlineField.name)}</div>
                            <div class="embed-field-value">${this.parseSmallOnly(inlineField.value).replace(/\n/g, '<br>')}</div>
                        </div>`;
                    });
                    html += '</div>';
                    currentInlineGroup = [];
                }
            } else {
                html += `<div class="embed-field">
                    <div class="embed-field-name">${this.escapeHtml(field.name)}</div>
                    <div class="embed-field-value">${this.parseSmallOnly(field.value).replace(/\n/g, '<br>')}</div>
                </div>`;
                currentInlineGroup = []; // Reset inline group
            }
        });

        return html;
    }

    _renderEmbedFooter(footer, timestamp) {
        let html = '<div class="embed-footer">';

        if (footer) {
            if (footer.icon_url) {
                html += `<img src="${footer.icon_url}" class="embed-footer-icon" onerror="this.style.display='none'">`;
            }
            html += `<span class="embed-footer-text">${this.escapeHtml(footer.text)}</span>`;
        }

        if (timestamp) {
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                const timeStr = date.toLocaleString();
                html += `<span class="embed-timestamp">${footer ? ' • ' : ''}${timeStr}</span>`;
            }
        }

        html += '</div>';
        return html;
    }

    updateJSONViewer(json) {
        if (!this.jsonViewer) return;

        const jsonString = JSON.stringify(json, null, 2);
        this.jsonViewer.textContent = jsonString;

        if (typeof hljs !== 'undefined') {
            hljs.highlightElement(this.jsonViewer);
        }
    }

    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    parseSmallOnly(text) {
        if (typeof text !== 'string') return '';
        
        // First escape HTML to prevent XSS
        let result = this.escapeHtml(text);
        
        // Only parse -# for small text (Discord field value special formatting)
        result = result.replace(/^-# (.+)$/gm, '<small>$1</small>');
        
        return result;
    }

    parseDiscordMarkdown(text) {
        if (typeof text !== 'string') return '';

        // First escape HTML to prevent XSS
        let result = this.escapeHtml(text);

        // Titles: # ## ### etc (consume trailing newline to avoid extra <br>)
        result = result.replace(/^### (.*?)$\n?/gm, '<h3>$1</h3>');
        result = result.replace(/^## (.*?)$\n?/gm, '<h2>$1</h2>');
        result = result.replace(/^# (.*?)$\n?/gm, '<h1>$1</h1>');

        // Bold: **text** 
        result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        result = result.replace(/\*([^*]+?)\*/g, (match, content, offset, string) => {
            // Check if it's part of ** bold syntax
            if (offset > 0 && string[offset - 1] === '*') return match;
            if (offset + match.length < string.length && string[offset + match.length] === '*') return match;
            return '<em>' + content + '</em>';
        });

        // Underline/Bold: __text__
        result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Italic: _text_ (but not if it's part of __)
        result = result.replace(/_([^_]+?)_/g, (match, content, offset, string) => {
            // Check if it's part of __ syntax
            if (offset > 0 && string[offset - 1] === '_') return match;
            if (offset + match.length < string.length && string[offset + match.length] === '_') return match;
            return '<em>' + content + '</em>';
        });

        // Strikethrough: ~~text~~
        result = result.replace(/~~(.*?)~~/g, '<del>$1</del>');

        // Code block: ```text``` or ```language\ntext```
        result = result.replace(/```(?:(\w+)\s*)?\n?([\s\S]*?)```\n?/g, '<pre class="discord-code-block"><code>$2</code></pre>');

        // Code inline: `text`
        result = result.replace(/`([^`]+)`/g, '<code class="discord-code-inline">$1</code>');

        // Quote: > text (at start of line)
        result = result.replace(/^&gt; (.+)$/gm, '<div class="discord-quote">$1</div>');

        // Spoiler: ||text||
        result = result.replace(/\|\|(.*?)\|\|/g, '<span class="discord-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

        return result;
    }

    showNotification(message, type = 'info') {
        const notificationEl = document.getElementById('notification');
        if (!notificationEl) return;

        if (this._notifTimeout) {
            clearTimeout(this._notifTimeout);
        }

        notificationEl.textContent = message;
        notificationEl.className = `notification ${type}`;
        notificationEl.classList.remove('hidden');

        this._notifTimeout = setTimeout(() => {
            notificationEl.classList.add('hidden');
        }, 3000);
    }
}