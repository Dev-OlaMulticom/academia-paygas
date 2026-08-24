---
name: responsive-audit
description: Systematic methodology for auditing a web project's responsive design and mobile behavior — reviews CSS, pages, components, layout shell, touch targets, and produces scored findings with prioritized fix recommendations.
source: auto-skill
extracted_at: '2026-07-14T18:26:08.507Z'
---

# Responsive & Mobile Audit

Systematic approach to evaluate a web project's responsive design and mobile behavior, producing scored findings and prioritized fix recommendations.

## When to Use

When the user asks to "analyze responsive behavior", "review mobile design", "check mobile readiness", or similar. Also useful as a pre-PR check for UI changes.

## Procedure

### Phase 1: Project Context

1. Read project documentation (`AGENTS.md`, architecture docs, coding rules) to understand tech stack and CSS approach.
2. Identify the CSS framework (Tailwind, plain CSS, SCSS, etc.), component library (shadcn/ui, MUI, etc.), and responsive strategy (mobile-first vs desktop-first).
3. Map project structure — list all pages, components, layout files, CSS/style files, and router config.

### Phase 2: Global Responsive Infrastructure

1. Read the main CSS file(s) completely. Extract ALL `@media` rules with their breakpoints, selectors, and overrides.
2. Catalog every breakpoint used and count how many rules target each.
3. Check for:
   - `body` overflow handling (is scrolling delegated properly?)
   - Viewport/container configuration in CSS and framework config (Tailwind `screens`, container settings)
   - Global `useIsMobile` or similar breakpoint hooks — verify they're actually imported and used
   - Layout shell (header height, sidebar width, main padding) — verify progressive compaction at breakpoints
   - Sidebar behavior on mobile (slide-in with overlay? Sheet/Drawer? always-visible?)

### Phase 3: Page-by-Page Audit

For each page component, check:

1. **Responsive classes/prefixes**: Does it use Tailwind `sm:/md:/lg:` or CSS class media queries?
2. **useIsMobile usage**: Conditional rendering for mobile-specific layouts?
3. **Fixed widths**: `min-width`, hardcoded `width` in px, `minmax(Xpx, 1fr)` grids where X is too large for 320px phones
4. **Overflow handling**: `overflow-x: auto` on tables, `overflow: hidden` on containers, `text-overflow: ellipsis`
5. **Grid layouts**: `grid-template-columns` that adapt or stack at mobile breakpoints
6. **Flex layouts**: `flex-wrap`, `flex-direction: column` at breakpoints
7. **Touch targets**: Interactive elements ≥ 44px height/width (WCAG 2.5.5)
8. **Modal/drawer behavior**: `max-width: 90vw+` safety net, bottom-sheet on mobile?

Score each page 1-5 for mobile readiness. Record specific issues.

### Phase 4: Component Audit

For each custom/shared UI component:

1. **Dropdown/popover positioning**: Viewport-edge clamping? Bottom-sheet on mobile?
2. **Touch target sizing**: Buttons, toggles, inputs ≥ 44px
3. **Touch events**: Custom controls need `onTouchStart/onTouchMove` — not just mouse events
4. **Hover-only interactions**: Tooltip menus, hover reveals that are inaccessible on touch
5. **Fixed dimensions**: `width: Xpx`, `min-width: Xpx` that can overflow on small screens
6. **Mobile hide vs adapt**: Components hidden via `display: none` on mobile (loss of functionality) vs. adapted to mobile layout (Sheet, Drawer, etc.)

Score each component 1-5. Flag components hidden entirely on mobile as critical.

### Phase 5: Compile Report

Produce a structured report:

1. **Architecture overview**: CSS approach, breakpoints, responsive strategy
2. **App Shell assessment**: Header, sidebar, main content — is the shell properly responsive?
3. **Page scores table**: Page name, score, key issues (one line each)
4. **Component scores table**: Component name, score, key issues
5. **Cross-cutting issues**: Systemic problems (undersized touch targets, unused hooks, dual systems)
6. **Prioritized recommendations**: P0 (critical/broken), P1 (high/usability), P2 (medium/polish), P3 (low/refactor)

### Key Patterns to Flag

- **`minmax(Xpx, 1fr)` where X > 180**: Will overflow on 320px phones
- **`min-width: Xpx` on containers/panels**: Creates viewport gap where no override exists
- **`display: none` on functional components at mobile**: Lost functionality, not adapted
- **Duplicate hooks**: Local `useIsMobile` instead of importing global one
- **Inline `style={{ minWidth/width }}`**: Bypasses responsive CSS system
- **Dual layout systems**: Two sidebar implementations, two CSS approaches competing
- **Mouse-only event handlers**: `onMouseEnter/Leave` without touch equivalents
- **`body { overflow: hidden }`**: Fragile — if `.main` fails to contain, page is unscrollable
