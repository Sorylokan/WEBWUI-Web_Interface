// StreamerBot WebSocket communication
export class WebUIWebSocket {
    constructor() {
        this.ws = null;
        this.wsConnected = false;
        this.connectionAttempted = false;
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onMessage: null,
            onError: null
        };

        // DOM elements for connection
        this.wsAddress = document.getElementById('wsAddress');
        this.wsPort = document.getElementById('wsPort');
        this.wsStatusDot = document.getElementById('wsStatus');
        this.wsStatusText = document.getElementById('wsStatusText');
        this.globalVarName = document.getElementById('globalVarName');
    }

    setCallbacks({ onConnect, onDisconnect, onMessage, onError }) {
        this.callbacks.onConnect = onConnect;
        this.callbacks.onDisconnect = onDisconnect;
        this.callbacks.onMessage = onMessage;
        this.callbacks.onError = onError;
    }

    connect() {
        if (this.wsConnected) {
            console.warn('Already connected to WebSocket');
            return;
        }

        const host = this.wsAddress?.value || 'ws://localhost';
        const port = this.wsPort?.value || '8080';
        const url = host.includes('://') ? `${host}:${port}` : `ws://${host}:${port}`;

        try {
            this.connectionAttempted = true;
            this.ws = new WebSocket(url);

            this.ws.addEventListener('open', () => {
                this.wsConnected = true;
                this.updateConnectionStatus();
                if (this.callbacks.onConnect) {
                    this.callbacks.onConnect();
                }
            });

            this.ws.addEventListener('message', (event) => {
                this.handleMessage(event);
            });

            this.ws.addEventListener('close', (event) => {
                const wasActuallyConnected = this.wsConnected;
                this.wsConnected = false;
                this.connectionAttempted = false;
                this.updateConnectionStatus();
                if (this.callbacks.onDisconnect) {
                    this.callbacks.onDisconnect(wasActuallyConnected);
                }
            });

            this.ws.addEventListener('error', (error) => {
                console.error('WebSocket error:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            });

        } catch (err) {
            console.error('Failed to create WebSocket connection:', err);
            this.connectionAttempted = false;
            if (this.callbacks.onError) {
                this.callbacks.onError(err);
            }
        }
    }

    disconnect() {
        const wasConnected = this.wsConnected;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.wsConnected = false;
        this.connectionAttempted = false;
        this.updateConnectionStatus();

        // Trigger disconnect callback if we were actually connected
        if (wasConnected && this.callbacks.onDisconnect) {
            this.callbacks.onDisconnect(true);
        }
    }

    updateConnectionStatus() {
        if (this.wsStatusDot) {
            this.wsStatusDot.className = this.wsConnected ? 'status-dot online' : 'status-dot offline';
        }

        if (this.wsStatusText) {
            this.wsStatusText.textContent = this.wsConnected ? 'Connected' : 'Disconnected';
        }

        // Update connect button text
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.textContent = this.wsConnected ? 'Disconnect' : 'Connect';
        }
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('WebSocket message received:', data);

            if (this.callbacks.onMessage) {
                this.callbacks.onMessage(data);
            }
        } catch (err) {
            console.error('Error parsing WebSocket message:', err);
        }
    }

    sendPayloadToAction(payload) {
        if (!this.wsConnected || !this.ws) {
            throw new Error('Not connected to Streamer.bot');
        }

        const varName = this.globalVarName?.value || 'WEBWUI_WebhookPayload';
        const jsonString = JSON.stringify(payload);

        console.log('Sending to Streamer.bot:', { varName, jsonString });

        // StreamerBot DoAction format
        const request = {
            request: 'DoAction',
            id: '1',
            action: { 
                id: '74e1d5e7-a4c8-4799-871f-f444eb8ace03' // Action ID for WEBUI handler
            },
            args: {
                variableName: varName,
                JsonPayload: jsonString
            }
        };

        this.ws.send(JSON.stringify(request));
        return { varName, jsonString };
    }

    loadGlobalVariable() {
        if (!this.wsConnected || !this.ws) {
            throw new Error('Not connected to Streamer.bot');
        }

        const varName = this.globalVarName?.value || 'WEBWUI_WebhookPayload';

        const request = {
            request: 'GetGlobal',
            id: '2',
            variable: varName,
            persisted: true
        };

        this.ws.send(JSON.stringify(request));
        console.log('Requested global variable:', varName);

        return varName;
    }

    async testWebhookDirect(webhookUrl, payload) {
        if (!webhookUrl) {
            throw new Error('Webhook URL is required');
        }

        // Replace auto timestamps with current time for testing
        let testPayload = JSON.parse(JSON.stringify(payload));
        if (testPayload.embeds) {
            testPayload.embeds = testPayload.embeds.map(embed => {
                if (embed.timestamp === '__AUTO_TIMESTAMP__') {
                    embed.timestamp = new Date().toISOString();
                }
                return embed;
            });
        }

        // Add ?wait=true for response
        const testUrl = webhookUrl.includes('?wait=true') ? webhookUrl : 
                       webhookUrl + (webhookUrl.includes('?') ? '&wait=true' : '?wait=true');

        try {
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload)
            });

            let responseData = null;
            try {
                const text = await response.text();
                if (text) {
                    responseData = JSON.parse(text);
                }
            } catch (e) {
                console.warn('Failed to parse webhook response as JSON:', e.message);
            }

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                data: responseData
            };
        } catch (err) {
            throw new Error(`Network error: ${err.message}`);
        }
    }

    isConnected() {
        return this.wsConnected;
    }

    getReadyState() {
        if (!this.ws) return WebSocket.CLOSED;
        return this.ws.readyState;
    }
}