// Webhook Embed Builder with User Interface • [WEB•UI] - Main Application Orchestrator
import { WebUIRenderer } from './modules/renderer.js';
import { WebUIManager } from './modules/manager.js';
import { WebUIWebSocket } from './modules/websocket.js';
import { WebUIInterface } from './modules/ui.js';
import { initTheme } from './modules/theme.js';
import { ModalsManager } from './modules/modals.js';

class DiscordWebhookUI {
    constructor() {
        this.initialize();
    }

    async initialize() {
        try {
            // Initialize modals
            new ModalsManager();

            // Initialize theme
            initTheme();

            // Initialize core modules
            this.renderer = new WebUIRenderer();
            this.manager = new WebUIManager();
            this.websocket = new WebUIWebSocket();
            this.ui = new WebUIInterface(this.manager, this.renderer, this.websocket);

            // Setup WebSocket callbacks
            this.websocket.setCallbacks({
                onConnect: () => this.renderer.showNotification('Connected to Streamer.bot', 'success'),
                onDisconnect: (wasActuallyConnected) => this.handleDisconnection(wasActuallyConnected),
                onMessage: (data) => this.handleWebSocketMessage(data),
                onError: (error) => this.handleConnectionError()
            });

            this.ui.initialize();

            console.log('WEB•UI initialized successfully with modular architecture');
        } catch (error) {
            console.error('Failed to initialize WEB•UI:', error);
            this.renderer?.showNotification('Initialization failed', 'error');
        }
    }

    handleWebSocketMessage(data) {
        console.log('WebSocket message received:', data);

        if (data.id === '2') {
            try {
                console.log('GetGlobal response:', data);

                if (data.variables && Object.keys(data.variables).length > 0) {
                    // Get the first variable
                    const varName = Object.keys(data.variables)[0];
                    const variable = data.variables[varName];

                    if (variable && variable.value) {
                        const config = this.manager.importConfig(variable.value);
                        const embeds = this.manager.applyConfigToDOM(config);

                        // Recreate embeds
                        const embedsContainer = document.getElementById('embedsContainer');
                        if (embedsContainer) {
                            embedsContainer.innerHTML = '';
                            if (embeds && embeds.length > 0) {
                                embeds.forEach(embedData => this.ui.addEmbed(embedData));
                            }
                        }

                        this.ui.updatePreview();
                        this.manager.saveToLocalStorage();

                        this.renderer.showNotification(`Loaded variable: ${varName}`, 'success');
                    } else {
                        this.renderer.showNotification(`Variable "${varName}" is empty or has no value`, 'warn');
                    }
                } else {
                    this.renderer.showNotification('No variables found in response', 'warn');
                }
            } catch (err) {
                console.error('Error processing GetGlobal response:', err);
                this.renderer.showNotification(`Failed to load variable: ${err.message}`, 'error');
            }
        }

        // Handle DoAction responses
        if (data.id === '1') {
            if (data.error) {
                this.renderer.showNotification(`StreamerBot error: ${data.error}`, 'error');
            } else {
                this.renderer.showNotification('Action completed successfully', 'success');
            }
        }
    }

    handleDisconnection(wasActuallyConnected) {
        if (wasActuallyConnected) {
            this.renderer.showNotification('Disconnected from Streamer.bot', 'warn');
        }
    }

    handleConnectionError() {
        if (!this.websocket.wsConnected && this.websocket.connectionAttempted) {
            this.renderer.showNotification('Unable to connect to Streamer.bot', 'error');
        } else {
            this.renderer.showNotification('WebSocket error', 'error');
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.webUI = new DiscordWebhookUI();
});

export { DiscordWebhookUI };