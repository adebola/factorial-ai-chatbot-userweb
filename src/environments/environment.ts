export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  chatServiceUrl: 'ws://localhost:8080/api/v1/chat',
  gatewayUrl: 'http://localhost:8080',
  qualityServiceUrl: 'http://localhost:8080/api/v1/quality',
  useGateway: true,
  clientId: 'webclient',
  clientSecret: 'webclient-secret',
  redirectUri: 'http://localhost:4200/callback',
  scope: 'openid profile read write',
  authServiceUrl: 'http://localhost:9002/auth',

  appName: 'ChatCraft',
  version: '1.0.0',
  enableLogging: true,
  maxFileSize: 10485760, // 10MB in bytes
  allowedFileTypes: ['.pdf', '.txt', '.doc', '.docx', '.md'],
  maxDocuments: 1000,
  maxWebsites: 100,
  sessionTimeout: 3600000, // 1 hour in milliseconds
  features: {
    enableAnalytics: false,
    enableErrorReporting: false,
    enableChat: true,
    enableFileUpload: true,
    enableWebsiteIngestion: true,
    enableQualityMonitoring: true
  },

  // Billing & Payment Configuration
  paystack: {
    publicKey: 'pk_test_ff767409ddc0e32c17b18e9a34175c4fb7332cb6', // Replace with actual test key
    currency: 'NGN'
  },
  billing: {
    paymentCallbackUrl: 'http://localhost:8000/api/v1/payments/callback',
    defaultCurrency: 'NGN',
    currencySymbol: '₦',
    enablePayments: true,
    enableInvoices: true,
    enableAnalytics: true
  }
};

