# IMAGE-TOOLS KNOWLEDGE BASE

**Generated:** 2026-01-29 21:01  
**Commit:** 2c6e406  
**Branch:** chore/license

## OVERVIEW
Browser-based image manipulation SPA (React 19 + Bun) for cropping, format conversion, and GIF frame extraction. Deployed to Cloudflare Workers. No server—fully client-side using Canvas API and File System Access API.

## STRUCTURE
```
./
├── src/
│   ├── components/       # 7 feature components + ui/ subdirectory
│   │   └── ui/          # 8 shadcn/ui base components (see ui/AGENTS.md)
│   ├── lib/             # Shared utilities (cn, settings, fileSystem, gallery)
│   ├── frontend.tsx     # React entry point (actual entry, not index.ts)
│   ├── App.tsx          # Main orchestrator with tool routing
│   └── index.html       # HTML entry (loads frontend.tsx)
├── build.ts             # Custom Bun build script (NOT standard bundler)
├── dist/                # Build output (Cloudflare Workers assets)
├── styles/globals.css   # Tailwind v4 config (CSS-first, not JS config)
└── wrangler.jsonc       # Cloudflare Workers deployment config
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new tool | `src/App.tsx` tools array | Register in array, add route in render |
| Modify theme/settings | `src/lib/settings.tsx` | React Context with localStorage |
| Add utility function | `src/lib/utils.ts` | Central utilities (cn for styling) |
| File save operations | `src/lib/fileSystem.ts` | File System Access API abstraction |
| Add UI component | `src/components/ui/` | shadcn/ui patterns (see ui/AGENTS.md) |
| Build configuration | `build.ts` | Custom script, not vite.config |
| Linting/formatting | `biome.jsonc` | Biome (not ESLint/Prettier) |
| Entry point issue | `package.json` dev/start | ⚠️ BROKEN: references non-existent src/index.ts |

## CONVENTIONS

**Code Style (STRICT):**
- **TABS for indentation** (not spaces—enforced by Biome)
- **No `any` types** (use proper types or `unknown`)
- **Double quotes** for strings
- **Import alias:** `@/*` maps to `./src/*`
- **Strict TypeScript:** noUncheckedIndexedAccess enabled (array access returns `T | undefined`)

**Architecture:**
- **No backend:** Pure client-side SPA
- **State management:** React Context (settings) + useState (component state)
- **Cross-component communication:** `window.addGeneratedImage` callback pattern
- **Persistent storage:** localStorage (settings), IndexedDB (directory handles)
- **Component patterns:** Functional components with hooks (no classes)

**Security:**
- **SVG sanitization:** DOMPurify before rendering
- **URL validation:** Whitelist https/http/data/blob protocols
- **Filename sanitization:** Strip path separators, control chars, normalize Unicode
- **MIME type validation:** Whitelist raster formats only

## ANTI-PATTERNS (THIS PROJECT)

**From Biome config:**
- ❌ **No `any` types** (error: noExplicitAny)
- ❌ **No CommonJS** (error: noCommonJs) - ESM only
- ❌ **No `var`** (error: noVar) - use const/let
- ❌ **No TypeScript namespaces** (error: noNamespace)

**From TypeScript config:**
- ❌ **No type suppression** (`as any`, `@ts-ignore`)
- ✅ **Check array access** (always handle `| undefined` due to noUncheckedIndexedAccess)

**From security patterns:**
- ❌ **Never commit** API keys, .env secrets, credentials
- ❌ **Never trust user input** - validate URLs, filenames, MIME types
- ❌ **Never render unsanitized SVG** - use DOMPurify

## UNIQUE STYLES

**Two-Tier Component Architecture:**
1. **UI Primitives** (`src/components/ui/`) - shadcn/ui vendor code, minimal JSDoc, namespace imports
2. **Feature Components** (`src/components/`) - application logic, extensive JSDoc, named imports

**Different conventions by layer:**
| Layer | Import Style | Export Style | JSDoc |
|-------|-------------|--------------|-------|
| UI primitives | `import * as React` | End-of-file | None (vendor) |
| Features | `import { useState }` | Inline | Extensive |
| Lib | `import { x }` | Inline | Comprehensive |

**Cloudflare Workers Patterns:**
- Static assets in `src/` root (not `public/`)
- Custom build.ts (not standard bundler config)
- SPA routing via wrangler.jsonc

**Modern React:**
- React 19 (no React import needed for JSX)
- Hooks-based (useState, useCallback, useEffect, useRef, useMemo)
- No HOCs, no render props, no class components

**Tailwind v4:**
- CSS-first approach (config in styles/globals.css, not tailwind.config.js)
- OKLCH color space (modern)
- Custom dark mode variant: `:is(.dark *)`

## COMMANDS

```bash
# Development (⚠️ BROKEN - references non-existent src/index.ts)
bun dev              # Should serve index.html, but script is broken

# Production
bun start            # Local production mode
bun run build        # Build to dist/ via custom build.ts
bun run deploy       # Build + deploy to Cloudflare Workers

# Code Quality
bun run lint         # Biome check (linter + formatter)
bun run lint:ci      # CI mode with GitHub reporter
bun run fmt          # Format code with Biome

# Testing
# ⚠️ NO TESTS - No test framework configured
# Bun has built-in test runner available but unused

# Dependencies
bun install          # Install dependencies (uses bun.lock)
```

## NOTES

**Critical Issues:**
1. **dev/start scripts broken:** `package.json` references `src/index.ts` which doesn't exist. Actual entry is `src/frontend.tsx` loaded from `src/index.html`.
2. **No testing infrastructure:** Zero tests, no framework configured.
3. **No git hooks:** Linting only enforced in CI, not pre-commit.

**Notable Quirks:**
- Service worker in src/ as .js (only JS file in TypeScript project)
- Separate styles/ directory at root (breaks convention of everything in src/)
- Assets (icons, manifest) in src/ root instead of public/
- "use client" directives present despite being pure client-side SPA (SSR-ready architecture)

**Browser APIs Used:**
- Canvas API (image manipulation)
- File System Access API (directory picker, batch save)
- IndexedDB (cache directory handles)
- localStorage (user settings)
- Service Worker (offline support)

**Key Dependencies:**
- React 19, Bun runtime
- Radix UI primitives, shadcn/ui patterns
- Tailwind CSS v4, Biome toolchain
- gifuct-js (GIF parsing), DOMPurify (SVG sanitization)

**Architectural Decisions:**
- No state management library (plain Context + hooks)
- No router (conditional rendering)
- No backend/API layer
- Window callback pattern for cross-component communication
- Two-tier component system (UI primitives vs features)
