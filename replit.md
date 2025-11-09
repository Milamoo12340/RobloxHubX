# Roblox Gaming Hub

## Overview

A performance-focused gaming hub for Roblox, inspired by Razer Cortex and Omen Gaming Hub. The application provides game discovery, system performance monitoring, social features, and real-time integration with Roblox's API. Built as a full-stack web application with a modern React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing (single-route app currently)

**UI Component System**
- Shadcn UI (New York style) with Radix UI primitives for accessible, composable components
- Tailwind CSS for utility-first styling with custom design system
- CSS custom properties for theming (light/dark mode support)
- Gaming-focused design language with custom font stack (Inter, JetBrains Mono, Rajdhani)

**State Management**
- TanStack Query (React Query) for server state management, caching, and real-time data synchronization
- Local state with React hooks
- LocalStorage for persisting user preferences (theme, linked Roblox account)

**Data Fetching Strategy**
- Centralized query client with custom fetch wrapper (`apiRequest`)
- 30-second polling intervals for live data (friends list, system performance)
- Infinite stale time for static data with manual refetch control
- Credentials included for session management

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- ESM module system throughout
- Custom middleware for request logging and JSON body parsing with raw buffer capture

**API Design**
- RESTful endpoints organized by domain (`/api/games/*`, `/api/roblox/*`, `/api/performance/*`)
- External API integration with Roblox public APIs (no authentication required)
- RSS feed parsing for gaming news aggregation
- System information gathering via `systeminformation` library

**Session Management**
- Express sessions with connect-pg-simple for PostgreSQL-backed session storage
- Cookie-based authentication
- User data stored in memory (MemStorage class) with planned database migration path

**Data Layer Architecture**
- Storage abstraction layer (`IStorage` interface) allows switching between in-memory and database implementations
- Drizzle ORM configured for PostgreSQL with schema-first approach
- Schema validation using Drizzle-Zod for type-safe data operations

### External Dependencies

**Third-Party APIs**
- Roblox Games API (`games.roblox.com`) - Game details, universe IDs, thumbnails
- Roblox Users API (`users.roblox.com`) - User profiles, avatars, verification badges  
- Roblox Presence API (`presence.roblox.com`) - Online status, current game information
- Roblox Friends API (`friends.roblox.com`) - Friends list and social features
- Roblox Thumbnails API (`thumbnails.roblox.com`) - Game and user avatar images
- RSS feeds for gaming news content

**Database**
- PostgreSQL with Neon serverless driver (`@neondatabase/serverless`)
- Drizzle ORM for query building and migrations
- Connection pooling handled by Neon driver
- Schema: Users table with UUID primary keys, username/password fields

**External Services**
- Systeminformation library for real-time CPU, RAM, temperature monitoring
- RSS Parser for news feed aggregation

**Development Tools**
- Replit-specific plugins for development environment (cartographer, dev banner, error overlay)
- TSX for TypeScript execution in development
- ESBuild for production server bundling

**Key Architectural Decisions**

1. **Hybrid Data Strategy**: Uses in-memory storage for rapid prototyping with clear migration path to PostgreSQL through storage abstraction layer

2. **Real-time Performance Monitoring**: Client-side polling (2-second intervals) for system metrics to provide gaming hub experience without WebSocket complexity

3. **External API Integration**: Direct integration with Roblox public APIs without backend proxy for game data, reducing server load and latency

4. **Component-Driven UI**: Extensive use of Radix UI primitives ensures accessibility while maintaining gaming aesthetic through Tailwind customization

5. **Gaming-Focused UX**: Design system prioritizes gaming hub patterns (fixed sidebar, performance metrics, game cards) over traditional web app layouts