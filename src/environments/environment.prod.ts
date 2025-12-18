export const environment = {
  production: true,
  apiUrl: 'https://api.chatcraft.cc/api/v1',
  chatServiceUrl: 'wss://api.chatcraft.cc/api/v1/chat',
  gatewayUrl: 'https://api.chatcraft.cc',
  qualityServiceUrl: 'https://api.chatcraft.cc/api/v1/quality',
  useGateway: true,
  authServiceUrl: 'https://api.chatcraft.cc/auth',
  clientId: 'webclient',
  clientSecret: 'webclient-secret',
  redirectUri: 'https://app.chatcraft.cc/callback',
  scope: 'openid profile read write',
  appName: 'ChatCraft',
  version: '1.0.0',
  enableLogging: false,
  maxFileSize: 10485760, // 10MB in bytes
  allowedFileTypes: ['.pdf', '.txt', '.doc', '.docx', '.md'],
  maxDocuments: 1000,
  maxWebsites: 100,
  sessionTimeout: 3600000, // 1 hour in milliseconds
  features: {
    enableAnalytics: true,
    enableErrorReporting: true,
    enableChat: true,
    enableFileUpload: true,
    enableWebsiteIngestion: true,
    enableQualityMonitoring: true
  },

  // Billing & Payment Configuration
  paystack: {
    publicKey: 'pk_live_88ca81de79d462e1c826739825e5251a77f8f8db',
    currency: 'NGN'
  },
  billing: {
    paymentCallbackUrl: 'https://app.chatcraft.cc/api/v1/payments/callback',
    defaultCurrency: 'NGN',
    currencySymbol: '₦',
    enablePayments: true,
    enableInvoices: true,
    enableAnalytics: true
  }
};
