# Environment Configuration

This directory contains environment-specific configuration files for the FactorialBot Angular application.

## Files

- **`environment.ts`** - Development environment configuration (default)
- **`environment.prod.ts`** - Production environment configuration

## Configuration Properties

| Property | Description | Dev Value | Prod Value |
|----------|-------------|-----------|------------|
| `production` | Environment flag | `false` | `true` |
| `apiUrl` | Backend API base URL | `http://localhost:8001/api/v1` | `https://api.factorialbot.com/api/v1` |
| `chatServiceUrl` | WebSocket chat service URL | `ws://localhost:8002` | `wss://chat.factorialbot.com` |
| `appName` | Application name | `FactorialBot` | `FactorialBot` |
| `version` | Application version | `1.0.0` | `1.0.0` |
| `enableLogging` | Enable console logging | `true` | `false` |
| `maxFileSize` | Maximum file upload size (bytes) | `10485760` | `10485760` |
| `allowedFileTypes` | Allowed file extensions | Array of extensions | Array of extensions |
| `maxDocuments` | Maximum documents limit | `1000` | `1000` |
| `maxWebsites` | Maximum websites limit | `100` | `100` |
| `sessionTimeout` | Session timeout (milliseconds) | `3600000` | `3600000` |
| `features` | Feature flags object | See below | See below |

### Feature Flags

| Feature | Description | Dev | Prod |
|---------|-------------|-----|------|
| `enableAnalytics` | Enable Google Analytics | `false` | `true` |
| `enableErrorReporting` | Enable error reporting | `false` | `true` |
| `enableChat` | Enable chat functionality | `true` | `true` |
| `enableFileUpload` | Enable file upload | `true` | `true` |
| `enableWebsiteIngestion` | Enable website ingestion | `true` | `true` |

## Usage

Import the environment configuration in your services/components:

```typescript
import { environment } from '../../environments/environment';

// Use environment variables
const apiUrl = environment.apiUrl;
const isProduction = environment.production;
const features = environment.features;

// Example usage in service
constructor(private http: HttpClient) {
  this.baseUrl = environment.apiUrl;
}
```

## Build Configuration

The file replacement is configured in `angular.json`:

```json
{
  "configurations": {
    "production": {
      "fileReplacements": [
        {
          "replace": "src/environments/environment.ts",
          "with": "src/environments/environment.prod.ts"
        }
      ]
    }
  }
}
```

## Commands

- **Development build**: `ng build --configuration=development` (uses `environment.ts`)
- **Production build**: `ng build --configuration=production` (uses `environment.prod.ts`)
- **Development serve**: `ng serve` (uses `environment.ts`)
- **Production serve**: `ng serve --configuration=production` (uses `environment.prod.ts`)

## Notes

- Always update both environment files when adding new configuration properties
- Keep sensitive information out of environment files - use environment variables or secure configuration management
- Update production URLs before deploying to production environment
- Feature flags allow enabling/disabling functionality per environment