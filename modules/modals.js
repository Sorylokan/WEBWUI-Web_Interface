// MODALS MANAGEMENT

export class ModalsManager {
    constructor() {
        this.container = null;
        this.modals = {};
        this.initializeModals();
    }

    initializeModals() {
        // Get or create container
        this.container = document.getElementById('modals-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'modals-container';
            document.body.appendChild(this.container);
        }

        // Define all modals
        const modalsConfig = [
            {
                id: 'clearModal',
                title: '⚠️ Clear All Data',
                body: `<p style="line-height: 1.6; margin: 0;">
                    This action will <strong>permanently delete</strong> all text fields in the configuration:
                </p>
                <ul style="margin: 12px 0; padding-left: 20px;">
                    <li>Message content</li>
                    <li>Webhook URL, username, avatar</li>
                    <li>All embeds and fields</li>
                    <li>Global variable name</li>
                </ul>
                <p style="color: #f04747; font-weight: 600; margin: 12px 0 0 0;">
                    ⚠️ There is <strong>no way to undo</strong> this action!
                </p>`,
                buttons: [
                    { id: 'clearConfirmBtn', text: 'Yes, Delete Everything', class: 'btn-danger' },
                    { id: 'clearCancelBtn', text: 'Cancel', class: 'btn-secondary' }
                ]
            },
            {
                id: 'importModal',
                title: 'Import JSON Configuration',
                body: null, // Custom content
                hasTextarea: true,
                textareaId: 'jsonImportArea',
                textareaPlaceholder: 'Paste your JSON configuration here...',
                buttons: [
                    { id: 'importConfirmBtn', text: 'Import', class: 'btn-primary' },
                    { id: 'importCancelBtn', text: 'Cancel', class: 'btn-secondary' }
                ]
            },
            {
                id: 'loadConfigModal',
                title: '⚠️ Load Configuration',
                body: `<p style="line-height: 1.6; margin: 0;">
                    Loading a configuration will <strong>replace your current work</strong>:
                </p>
                <ul style="margin: 12px 0; padding-left: 20px;">
                    <li>All message content</li>
                    <li>All webhook settings</li>
                    <li>All embeds and fields</li>
                </ul>
                <p style="color: #f04747; font-weight: 600; margin: 12px 0 0 0;">
                    ⚠️ Any unsaved changes will be <strong>permanently lost</strong>!
                </p>`,
                buttons: [
                    { id: 'loadConfigConfirmBtn', text: 'Yes, Load Configuration', class: 'btn-danger' },
                    { id: 'loadConfigCancelBtn', text: 'Cancel', class: 'btn-secondary' }
                ]
            },
            {
                id: 'importConfigModal',
                title: '⚠️ Import Configuration',
                body: `<p style="line-height: 1.6; margin: 0;">
                    Importing a configuration will <strong>replace your current work</strong>:
                </p>
                <ul style="margin: 12px 0; padding-left: 20px;">
                    <li>All message content</li>
                    <li>All webhook settings</li>
                    <li>All embeds and fields</li>
                </ul>
                <p style="color: #f04747; font-weight: 600; margin: 12px 0 0 0;">
                    ⚠️ Any unsaved changes will be <strong>permanently lost</strong>!
                </p>`,
                buttons: [
                    { id: 'importConfigConfirmBtn', text: 'Yes, Import Configuration', class: 'btn-danger' },
                    { id: 'importConfigCancelBtn', text: 'Cancel', class: 'btn-secondary' }
                ]
            },
            {
                id: 'removeEmbedModal',
                title: '⚠️ Remove Embed',
                body: `<p style="line-height: 1.6; margin: 0;">
                    This will <strong>permanently delete</strong> this embed and all its content:
                </p>
                <ul style="margin: 12px 0; padding-left: 20px;">
                    <li>Title, description, and URL</li>
                    <li>Author information</li>
                    <li>All fields</li>
                    <li>Images and thumbnails</li>
                    <li>Footer and timestamp</li>
                </ul>
                <p style="color: #f04747; font-weight: 600; margin: 12px 0 0 0;">
                    ⚠️ This action <strong>cannot be undone</strong>!
                </p>`,
                buttons: [
                    { id: 'removeEmbedConfirmBtn', text: 'Yes, Remove Embed', class: 'btn-danger' },
                    { id: 'removeEmbedCancelBtn', text: 'Cancel', class: 'btn-secondary' }
                ]
            },
            {
                id: 'removeFieldModal',
                title: '⚠️ Remove Field',
                body: `<p style="line-height: 1.6; margin: 0;">
                    This will <strong>permanently delete</strong> this field and its content.
                </p>
                <p style="color: #f04747; font-weight: 600; margin: 12px 0 0 0;">
                    ⚠️ This action <strong>cannot be undone</strong>!
                </p>`,
                buttons: [
                    { id: 'removeFieldConfirmBtn', text: 'Yes, Remove Field', class: 'btn-danger' },
                    { id: 'removeFieldCancelBtn', text: 'Cancel', class: 'btn-secondary' }
                ]
            }
        ];

        // Create all modals
        modalsConfig.forEach(config => {
            this.createModal(config);
        });
    }

    createModal(config) {
        const modal = document.createElement('div');
        modal.id = config.id;
        modal.className = 'modal hidden';

        let bodyContent = '';
        if (config.hasTextarea) {
            bodyContent = `<textarea id="${config.textareaId}" placeholder="${config.textareaPlaceholder}" rows="12"></textarea>`;
        } else if (config.body) {
            bodyContent = `<div class="modal-body">${config.body}</div>`;
        }

        const buttonsHTML = config.buttons
            .map(btn => `<button id="${btn.id}" class="btn ${btn.class}">${btn.text}</button>`)
            .join('');

        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${config.title}</h2>
                    <button class="modal-close" onclick="document.getElementById('${config.id}').classList.add('hidden')">&times;</button>
                </div>
                ${bodyContent}
                <div class="modal-footer">
                    ${buttonsHTML}
                </div>
            </div>
        `;

        this.container.appendChild(modal);
        this.modals[config.id] = modal;
    }

    getModal(id) {
        return this.modals[id];
    }

    show(id) {
        const modal = this.getModal(id);
        if (modal) modal.classList.remove('hidden');
    }

    hide(id) {
        const modal = this.getModal(id);
        if (modal) modal.classList.add('hidden');
    }
}
