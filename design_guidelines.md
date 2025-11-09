# Roblox Gaming Hub - Design Guidelines

## Design Approach

**Hybrid Gaming System Approach**: Drawing inspiration from Razer Cortex and Omen Gaming Hub's utilitarian gaming interfaces, with modern dashboard patterns from Linear and Notion. The design prioritizes quick access to functions, real-time data visualization, and a performance-oriented aesthetic that gamers expect from premium gaming software.

## Typography System

**Font Stack**:
- Primary: 'Inter' or 'Roboto' (700, 600, 500, 400) - clean, technical readability
- Accent: 'Rajdhani' or 'Orbitron' (700, 600) - for headers and gaming-focused elements
- Monospace: 'JetBrains Mono' - for statistics, metrics, performance numbers

**Hierarchy**:
- Hero/Dashboard Title: text-4xl/5xl font-bold
- Section Headers: text-2xl/3xl font-semibold
- Card Titles: text-lg/xl font-semibold
- Body Text: text-sm/base font-medium
- Stats/Metrics: text-xl/2xl font-bold (monospace)
- Labels: text-xs/sm font-medium uppercase tracking-wide

## Layout System

**Spacing Units**: Use Tailwind units of 2, 3, 4, 6, 8, 12 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: gap-4 to gap-8
- Dashboard margins: m-6 to m-8
- Card spacing: space-y-3 to space-y-4

**Grid System**:
- Main dashboard: Sidebar (240-280px fixed) + Main content area (flex-1)
- Game library grid: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
- Stats panels: grid-cols-2 lg:grid-cols-4
- Feature cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Core Layout Structure

### Sidebar Navigation (Fixed Left)
- Width: 240px desktop, collapsible on mobile
- Sections: Dashboard, Game Library, Performance, Optimization, Social, Settings
- Each nav item with icon + label, active state indicator
- User profile section at top with avatar, username, level badge
- Quick stats widget at bottom (total playtime, games owned)

### Main Dashboard View
**Top Bar**: 
- Search bar (prominent, centered)
- Quick actions (Launch Game, Game Mode Toggle, Notifications)
- System status indicators (CPU/RAM usage mini-bars)

**Hero Section** (No image - Data Dashboard):
- Full-width performance overview cards
- Real-time metrics grid: FPS, Ping, CPU%, GPU%, RAM usage
- Large animated numbers with trend indicators
- Quick access "Boost Performance" CTA button

**Content Sections**:
1. **Recently Played** (Horizontal scroll carousel)
   - Large game cards with thumbnail, title, last played time, playtime
   
2. **Game Library Grid**
   - Filterable game cards with hover states
   - Each card: Game thumbnail, title, play button overlay, favorite star, stats (plays, rating)

3. **Performance Monitor Panel**
   - Real-time graphs (line charts for FPS/ping over time)
   - Toggles for overlay settings

4. **Friend Activity Feed**
   - Compact list with friend avatar, game currently playing, join button
   - Status indicators (online/in-game/offline)

5. **News & Updates**
   - Card-based feed with game updates, featured content
   - Two-column layout on desktop

## Component Library

### Game Cards
- Aspect ratio 16:9 for thumbnails
- Overlay gradient on hover with play icon
- Badge indicators (New, Popular, Favorite)
- Quick stats bar at bottom
- Corner bookmark/favorite button

### Performance Widgets
- Bordered panels with metric label + large number display
- Progress bars for percentage-based stats
- Sparkline micro-graphs for trends
- Warning/optimal state indicators

### Action Buttons
- Primary CTA: Large, prominent, rounded-lg px-8 py-3
- Secondary: Outlined style, same sizing
- Icon buttons: Square, p-2 to p-3, rounded-md
- All with blur backdrop when over images

### Status Indicators
- Pill-shaped badges for online status
- Circular dots for notification counts
- Linear progress bars for system resources
- Animated pulse for active states

### Modal/Overlays
- Game launch modal with settings
- Performance overlay configuration panel
- Full-screen optimization workflow

### Data Visualization
- Line charts for FPS/ping history (Chart.js or Recharts)
- Donut charts for storage/memory usage
- Bar graphs for game playtime comparisons

## Interactive Patterns

### Navigation
- Persistent sidebar with icon-only collapsed state
- Smooth transitions between views
- Breadcrumb trail for nested sections

### Game Launching
- Click game card → Quick launch or detailed view modal
- Favorite/bookmark with immediate visual feedback
- Launch with optimization toggle

### Search & Filters
- Instant search with debounce
- Multi-select category filters (chips/pills)
- Sort options: Popular, Recent, Playtime, Alphabetical

### Performance Monitoring
- Toggle overlay on/off with keyboard shortcut
- Customizable metric positions
- Auto-hide when fullscreen gaming

## Animations

**Minimal and Purposeful**:
- Number counters: Animate on load (count-up effect)
- State transitions: Fade between dashboard views (200ms)
- Hover states: Scale transform on game cards (scale-105)
- Loading: Skeleton screens for data fetching
- NO scroll-triggered animations, NO complex hero animations

## Images

**Hero Section**: No hero image - this is a data-focused dashboard with real-time metrics display

**Game Thumbnails**: 
- Roblox game screenshots/thumbnails via API
- Lazy-loaded, optimized for quick display
- Fallback placeholder for missing images

**User Avatars**:
- Roblox profile pictures in sidebar and friend activity
- Circular, consistent sizing (32px-48px)

**Icons**:
- Use Heroicons or Lucide Icons via CDN
- Consistent 20px-24px sizing throughout
- Gaming-specific icons: gamepad, chart-line, zap, settings, users

## Accessibility

- High contrast ratios for all text on backgrounds
- Keyboard navigation for all interactive elements
- Focus indicators on buttons and inputs
- Screen reader labels for icon-only buttons
- ARIA labels for live-updating stats

## Responsive Behavior

- Desktop (1280px+): Full sidebar + multi-column grids
- Tablet (768-1279px): Collapsible sidebar + 2-3 column grids
- Mobile (<768px): Hidden sidebar (hamburger menu), single-column stacks, bottom tab navigation

**Critical**: Maintain data density even on mobile - use horizontal scrolling for stats panels rather than stacking everything vertically.