# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ChatCraft** is a production-grade Angular 19 application providing an intelligent conversational AI platform with document ingestion and multi-tenant support. The application uses standalone components, OAuth2 authentication via Spring Authorization Server, and integrates with a microservices backend architecture.

## Application Architecture

### Frontend (Angular 19)
- **Framework**: Angular 19 with standalone components architecture
- **Authentication**: OAuth2 Authorization Code flow with PKCE via Spring Authorization Server
- **Styling**: SCSS with responsive design and ChatCraft branding
- **State Management**: RxJS with BehaviorSubject for user state
- **HTTP Client**: Angular HttpClient with authentication interceptor
- **Routing**: Feature-based routing with auth guards

### Key Features
- **Multi-Tenant Authentication**: OAuth2-based tenant isolation
- **Document Management**: Upload and process PDF, DOCX, TXT files
- **Website Ingestion**: Crawl and index website content
- **Real-time Chat**: WebSocket-based AI conversations
- **Settings Management**: Tenant customization and branding
- **Plans & Subscriptions**: Tiered service offerings

## Development Environment

### Prerequisites
- Node.js 18+ and npm
- Angular CLI 19+
- Backend services running (see Backend Integration section)

### Development Commands

#### Start Development Server
```bash
npm start
# or
ng serve
```
Runs on `http://localhost:4200/` with automatic reload

#### Build for Production
```bash
npm run build
# or 
ng build --configuration production
```
Outputs to `dist/chatcraft/` directory

#### Run Tests
```bash
npm test
# or
ng test
```
Uses Karma test runner with Jasmine framework

#### Build Analysis
```bash
npm run build -- --source-map
npx webpack-bundle-analyzer dist/chatcraft/main.*.js
```

#### Code Quality
```bash
ng lint                    # ESLint analysis
npm run build -- --stats-json  # Build statistics
```

## Project Structure

```
src/
├── app/
│   ├── auth/              # Authentication components (login, signup, callback)
│   ├── dashboard/         # Main dashboard view
│   ├── documents/         # Document management
│   ├── messages/          # Chat interface
│   ├── plans/            # Subscription plans
│   ├── settings/         # Tenant settings
│   ├── shared/           # Shared components (side-menu, etc.)
│   ├── guards/           # Route guards
│   ├── interceptors/     # HTTP interceptors
│   ├── services/         # Business logic services
│   ├── website-ingestion/ # Website crawling interface
│   ├── app.component.*   # Root component
│   ├── app.config.ts     # Application providers
│   └── app.routes.ts     # Route configuration
├── environments/         # Environment configurations
├── assets/              # Static assets
└── public/              # Public files (logos, favicon)
```

## Configuration

### Environment Configuration

#### Development (`environment.ts`)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1',
  chatServiceUrl: 'ws://localhost:8080/api/v1/chat',
  gatewayUrl: 'http://localhost:8080',
  authServiceUrl: 'http://localhost:9002/auth',
  clientId: 'webclient',
  clientSecret: 'webclient-secret',
  redirectUri: 'http://localhost:4200/callback',
  scope: 'openid profile read write',
  appName: 'ChatCraft'
};
```

#### Production (`environment.prod.ts`)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.chatcraft.com/api/v1',
  chatServiceUrl: 'wss://api.chatcraft.com/api/v1/chat',
  gatewayUrl: 'https://api.chatcraft.com',
  authServiceUrl: 'https://auth.chatcraft.com/auth',
  // OAuth2 configuration managed by deployment
  appName: 'ChatCraft'
};
```

## Authentication Architecture

### OAuth2 Flow with Spring Authorization Server
- **Authorization Server**: Spring Authorization Server on port 9002
- **Client Type**: Public client with PKCE (Proof Key for Code Exchange)
- **Grant Type**: Authorization Code flow
- **Token Storage**: JWT tokens in localStorage with automatic refresh
- **Multi-tenancy**: Tenant-scoped authentication and authorization

### Authentication Flow
1. User accesses protected route → Auth Guard redirects to `/login`
2. Login component redirects to Spring Authorization Server
3. User authenticates on OAuth2 server
4. Authorization server redirects back to `/callback` with auth code
5. Angular app exchanges auth code for JWT tokens
6. Tokens stored in localStorage, user info extracted from JWT
7. Auth interceptor adds Bearer token to all API requests

## Backend Integration

### Backend Server Location
**Backend Server Path**: `~/Documents/Dropbox/ProjectsMacBook/FactorialSystems/Projects/factorialbot/dev/backend`

### API Gateway Architecture
All API requests go through the Spring Cloud Gateway which routes to appropriate microservices:

**Development URLs:**
- **API Gateway**: `http://localhost:8080/api/v1/*`
- **OAuth2 Server**: `http://localhost:9002/auth/*`
- **WebSocket Chat**: `ws://localhost:8080/api/v1/chat`

**Production URLs:**
- **API Gateway**: `https://api.chatcraft.com/api/v1/*`
- **OAuth2 Server**: `https://auth.chatcraft.com/auth/*`
- **WebSocket Chat**: `wss://api.chatcraft.com/api/v1/chat`

### Microservices
1. **Chat Service** - Real-time AI conversations via WebSocket
2. **Onboarding Service** - Tenant management, documents, website ingestion
3. **Gateway Service** - Request routing and load balancing
4. **Authorization Service** - OAuth2 authentication and authorization (includes tenant settings management migrated from onboarding service)

### Key API Endpoints

#### Authentication
- `POST /auth/oauth2/token` - Token exchange
- `GET /auth/oauth2/userinfo` - User information
- `POST /auth/register` - Tenant registration

#### Documents
- `GET /api/v1/documents/` - List tenant documents
- `POST /api/v1/documents/upload` - Upload document
- `DELETE /api/v1/documents/{id}` - Delete document

#### Chat
- `WS /api/v1/chat` - WebSocket chat endpoint

#### Tenants
- `GET /api/v1/tenants/{id}/settings` - Get tenant settings
- `PUT /api/v1/tenants/{id}/settings` - Update tenant settings

## Security

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication with tenant claims
- **Auth Interceptor**: Automatic Bearer token injection
- **Route Guards**: Protect authenticated routes
- **CORS Configuration**: Proper cross-origin handling
- **Token Refresh**: Automatic token renewal

### Multi-Tenancy
- **Tenant Isolation**: Data segregation per tenant
- **Scoped Permissions**: Role-based access control
- **API Key Management**: Service-to-service authentication

## Deployment

### Build Configuration
- **Angular CLI**: Production-optimized builds
- **Bundle Analysis**: Size optimization and tree shaking
- **Source Maps**: Debug support in production
- **Service Worker**: Optional PWA capabilities

### Production Checklist
- [ ] Environment variables configured
- [ ] OAuth2 client registered
- [ ] CORS policies updated
- [ ] SSL certificates in place
- [ ] CDN configuration
- [ ] Error monitoring setup
- [ ] Performance monitoring

## Monitoring & Analytics

### Error Tracking
- **Frontend Errors**: JavaScript error reporting
- **API Failures**: HTTP error logging
- **Authentication Issues**: OAuth2 flow monitoring

### Performance Metrics
- **Core Web Vitals**: Loading, interactivity, visual stability
- **Bundle Size**: Track asset optimization
- **API Response Times**: Monitor backend performance

## Contributing

### Development Workflow
1. Feature branches from `main`
2. Local development with backend services
3. Testing with OAuth2 flow
4. Code review and testing
5. Deployment to staging/production

### Code Standards
- **TypeScript Strict Mode**: Type safety enforcement
- **ESLint Configuration**: Code quality rules
- **SCSS Guidelines**: Consistent styling patterns
- **Component Architecture**: Standalone components preferred

---

**ChatCraft** - Intelligent Conversational AI Platform
*Production deployment with enterprise-grade architecture*