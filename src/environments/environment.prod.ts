export const environment = {
  production: true,
  apiUrl: 'https://ai.factorialsystems.io/api/v1',
  chatServiceUrl: 'wss://ai.factorialsystems.io/api/v1/chat',
  gatewayUrl: 'https://ai.factorialsystems.io',
  useGateway: true,
  appName: 'FactorialBot',
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
    enableWebsiteIngestion: true
  }
};
