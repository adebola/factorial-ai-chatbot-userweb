# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 19 application using standalone components and the new application builder. The project uses TypeScript with strict mode enabled and SCSS for styling.

## Key Architecture Features

- **Standalone Components**: Uses Angular's standalone component architecture (no NgModules)
- **Application Bootstrap**: Uses `bootstrapApplication()` in `src/main.ts` with configuration from `src/app/app.config.ts`
- **Routing**: Router configuration is in `src/app/app.routes.ts` (currently empty)
- **Styling**: Uses SCSS with global styles in `src/styles.scss`
- **TypeScript Configuration**: Strict mode enabled with Angular-specific compiler options

## Development Commands

### Start Development Server
```bash
npm start
# or
ng serve
```
Runs on `http://localhost:4200/` with automatic reload

### Build Project
```bash
npm run build
# or 
ng build
```
Outputs to `dist/test-project/` directory

### Run Tests
```bash
npm test
# or
ng test
```
Uses Karma test runner with Jasmine framework

### Watch Mode for Development
```bash
npm run watch
# or
ng build --watch --configuration development
```

### Generate Components/Services
```bash
ng generate component component-name
ng generate service service-name
ng generate --help  # for all available schematics
```

## Project Structure

- `src/app/` - Main application code with standalone components
- `src/app/app.component.*` - Root component files
- `src/app/app.config.ts` - Application configuration (providers, etc.)
- `src/app/app.routes.ts` - Routing configuration
- `src/main.ts` - Application entry point
- `public/` - Static assets
- TypeScript configurations: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`

## Key Configuration Details

- Angular CLI version: 19.0.0
- Component prefix: `app`
- Default style extension: `.scss`
- Test framework: Jasmine with Karma
- Build output: `dist/test-project`
- Bundle budgets: 500kB warning, 1MB error for initial bundle

## Backend Reference Projects

This Angular test project is designed to integrate with the FactorialBot backend services through a Spring Cloud Gateway. The backend services are located at:
`~/Documents/Dropbox/ProjectsMacBook/FactorialSystems/Projects/factorialbot/dev/backend/`

### API Gateway Integration

All API calls now go through the Spring Cloud Gateway service which routes requests to appropriate microservices:

**Development Environment:**
- Gateway URL: `http://localhost:8080`
- All API calls: `http://localhost:8080/api/v1/*`
- WebSocket chat: `ws://localhost:8080/api/v1/chat`

**Production Environment:**
- Gateway URL: `https://gateway.factorialbot.com`
- All API calls: `https://gateway.factorialbot.com/api/v1/*`
- WebSocket chat: `wss://gateway.factorialbot.com/api/v1/chat`

### Backend Services Architecture

The FactorialBot backend consists of two microservices:

#### 1. Chat Service (Port 8000)
**Location**: `chat-service/`
**Purpose**: Real-time chat with AI responses via WebSockets

**Key Endpoints**:
- `GET /` - Health check
- `GET /health` - Service health status  
- `WS /api/v1/ws/chat?api_key={api_key}&user_identifier={user_id}` - WebSocket chat endpoint

**WebSocket Message Format**:
```json
{"message": "What services do you offer?"}
```

#### 2. Onboarding Service (Port 8001)
**Location**: `onboarding-service/`  
**Purpose**: Tenant management and document/website ingestion

**Key Endpoints**:

**Tenant Management**:
- `POST /api/v1/tenants/` - Create new tenant
- `GET /api/v1/tenants/{tenant_id}` - Get tenant details
- `PUT /api/v1/tenants/{tenant_id}/config` - Update tenant configuration

**Document Management**:
- `POST /api/v1/documents/upload` - Upload document (PDF, DOCX, TXT)
- `GET /api/v1/documents/?api_key={api_key}` - List tenant documents

**Website Ingestion**:
- `POST /api/v1/websites/ingest` - Start website scraping
- `GET /api/v1/ingestions/{ingestion_id}/status?api_key={api_key}` - Check ingestion status
- `GET /api/v1/ingestions/?api_key={api_key}` - List tenant ingestions

### Authentication
- All endpoints require API key authentication via `api_key` parameter
- API keys are tenant-specific and obtained during tenant creation

#### 3. Gateway Service (Port 8080)
**Location**: `gateway-service/`  
**Purpose**: Spring Cloud Gateway for routing and load balancing

**Routes configured:**
- `/api/v1/documents/**` → Onboarding Service
- `/api/v1/tenants/**` → Onboarding Service
- `/api/v1/websites/**` → Onboarding Service
- `/api/v1/ingestions/**` → Onboarding Service
- `/api/v1/auth/**` → Onboarding Service
- `/api/v1/plans/**` → Onboarding Service
- `/api/v1/subscriptions/**` → Onboarding Service
- `/api/v1/payments/**` → Onboarding Service
- `/api/v1/widgets/**` → Onboarding Service
- `/api/v1/chat/**` → Chat Service
- `/api/v1/vectors/**` → Chat Service

### Running Backend Services
```bash
# Navigate to backend directory
cd ~/Documents/Dropbox/ProjectsMacBook/FactorialSystems/Projects/factorialbot/dev/backend/

# Start infrastructure
docker-compose up -d postgres redis minio

# Start services with gateway
./scripts/start-dev.sh
# OR manually:
# Terminal 1: cd chat-service && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Terminal 2: cd onboarding-service && uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
# Terminal 3: cd gateway-service && ./mvnw spring-boot:run
```

### Test Integration Workflow
1. Create a tenant via onboarding service
2. Upload documents or ingest websites for the tenant  
3. Use the API key to connect via WebSocket to chat service
4. Test chat interactions with the ingested knowledge base

### Multi-Tenancy Notes
- Each tenant has isolated data and vector stores
- API keys provide tenant-scoped access
- WebSocket connections are tenant-specific
- All data processing maintains strict tenant isolation