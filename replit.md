# Roblox Gaming Hub

## Overview

A full-stack web application serving as a Roblox gaming hub with performance monitoring, game library management, and PS99 (Pet Simulator 99) leak tracking features. The application provides system performance metrics, game discovery, Roblox user integration, and specialized tools for tracking PS99 developer assets and potential content leaks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query for server state and caching
- **Styling**: Tailwind CSS v4 with CSS custom properties for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Build Tool**: Vite with React plugin

The frontend follows a pages-based architecture with reusable components. Key pages include Dashboard, Game Library, Performance monitoring, Optimization tools, News, and PS99 Leaks tracker.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (via Neon serverless or standard pg connection)
- **Session Management**: connect-pg-simple for PostgreSQL-backed sessions

The backend implements a REST API pattern with routes for:
- Game data fetching from Roblox APIs
- System performance monitoring (via systeminformation library)
- PS99 asset scanning and leak detection
- Roblox API proxy with optional anti-detection features

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Fallback**: In-memory storage when database is unavailable
- **Schema Location**: `shared/schema.ts` with Zod validation schemas
- **Tables**: users, ps99_assets, ps99_scan_progress

### Key Design Patterns
1. **Shared Schema**: Database schemas defined in `shared/` directory, accessible to both frontend and backend
2. **Path Aliases**: `@/` for client source, `@shared/` for shared modules
3. **API Proxy Pattern**: Roblox API requests proxied through backend to handle rate limiting and add headers
4. **Graceful Degradation**: Application works with in-memory storage if database unavailable

### PS99 Scanner System
The application includes a specialized scanner for Pet Simulator 99 content:
- Tracks verified developer accounts and their assets
- Monitors for new content/leaks using keyword matching
- Implements anti-rate-limiting techniques for Roblox API access
- Constants and developer IDs maintained in `shared/ps99-constants.ts`

## External Dependencies

### Database
- **PostgreSQL**: Primary data store via `pg` driver
- **Neon Database**: Serverless PostgreSQL option (`@neondatabase/serverless`)
- **Drizzle ORM**: Type-safe database operations with automatic migrations

### Roblox API Integration
- Proxied requests to various Roblox API endpoints (users, thumbnails, games, catalog)
- Rate limiting and session rotation to avoid API blocks
- Configurable bypass features (disabled by default for ToS compliance)

### Third-Party Services
- **RSS Parser**: For fetching news feeds
- **systeminformation**: Node.js library for system metrics (CPU, RAM, etc.)

### UI Dependencies
- Full Radix UI primitive suite for accessible components
- Lucide React for icons
- class-variance-authority and clsx for styling utilities
- cmdk for command palette functionality
- date-fns for date formatting

### Build & Development
- Vite for frontend bundling and HMR
- esbuild for backend bundling
- TypeScript with strict mode enabled
- PostCSS with Tailwind CSS v4