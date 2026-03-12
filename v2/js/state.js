// State management
export const state = {
  // Mode
  isEditMode: true,
  theme: 'dark',
  
  // UI
  currentTab: 'webhook',
  
  // Data
  embeds: [],
  embedIdCounter: 0,
  fieldIdCounter: 0,
  avatarUrl: '',
  messageContent: '',
  
  // WebSocket
  ws: null,
  wsConnected: false,
  
  // Popover
  popoverContext: null,
  
  // Timers
  jsonTimer: null,
  saveStorageTimer: null,
};

export const config = {
  STORAGE_KEY: 'webwui-v2-payload',
  STORAGE_WEBHOOK_URL_KEY: 'webwui-v2-webhook-url',
  STORAGE_VAR_NAME_KEY: 'webwui-v2-var-name',
  STORAGE_DELAY: 400,
  JSON_UPDATE_DELAY: 700,
  TIMESTAMP_UPDATE_INTERVAL: 30000,
};
