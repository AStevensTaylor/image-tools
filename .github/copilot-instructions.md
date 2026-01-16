# GitHub Copilot Instructions for image-tools

## Project Purpose
This is a web-based image manipulation tool that provides various utilities for working with images:
- Aspect ratio cropping
- GIF/WebP frame extraction
- Image format conversion (to PNG)

The application is built as a single-page application (SPA) designed to run on Cloudflare Workers.

## Tech Stack
- **Runtime**: Bun (v1.3.5+) - JavaScript runtime
- **Frontend Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Build System**: Custom build script using Bun
- **Deployment**: Cloudflare Workers via Wrangler
- **Key Libraries**:
  - `lucide-react` for icons
  - `gifuct-js` for GIF processing
  - `class-variance-authority` and `clsx` for styling utilities

## Commands
```bash
# Install dependencies
bun install

# Development server with hot reload
# Note: package.json references src/index.ts, but the actual frontend entry is src/frontend.tsx
bun dev

# Production build (uses build.ts script)
bun run build

# Run in production mode (locally)
bun start

# Deploy to Cloudflare Workers
bun run deploy
```

## Project Structure
```
/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui base components
│   │   ├── AspectRatioCrop.tsx
│   │   ├── GifFrameExtractor.tsx
│   │   ├── ImageGallery.tsx
│   │   └── PngConverter.tsx
│   ├── lib/              # Utility functions
│   ├── App.tsx           # Main application component
│   ├── frontend.tsx      # Entry point (React root setup)
│   └── index.html        # HTML template
├── public/               # Static assets
├── styles/               # Additional styles
├── build.ts              # Build script
├── wrangler.jsonc        # Cloudflare Workers config
└── components.json       # shadcn/ui configuration
```

## Code Style & Conventions

### TypeScript
- **Strict mode enabled**: Use strict TypeScript settings
- **No `any` types**: Avoid using `any`; use proper types or `unknown`
- **JSX syntax**: Use `react-jsx` transform (no need for `React` import)
- **Path aliases**: Use `@/` prefix for imports from `src/` directory

Example:
```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

### React Patterns
- Use functional components with hooks
- Prefer `useCallback` for event handlers to optimize re-renders
- Use proper TypeScript types for props and state
- Component files should use PascalCase naming

Example:
```typescript
interface ImageItem {
  id: string;
  file: File;
  url: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  onImageSelect: (id: string) => void;
}

export function ImageGallery({ images, onImageSelect }: ImageGalleryProps) {
  const handleSelect = useCallback((id: string) => {
    onImageSelect(id);
  }, [onImageSelect]);
  
  return (
    <div>
      {/* component JSX */}
    </div>
  );
}
```

### Styling
- Use Tailwind CSS utility classes
- Use `cn()` utility from `@/lib/utils` to merge classNames conditionally
- Follow shadcn/ui patterns for component styling
- Responsive design: consider mobile and desktop layouts

Example:
```typescript
<Button
  variant={isActive ? "default" : "outline"}
  className={cn(isDisabled && "opacity-50")}
>
  Click me
</Button>
```

## Git Workflow
- Create feature branches with descriptive names: `feature/description`, `fix/bug-name`, `docs/update-readme`
- Commit messages should be clear and concise
- PRs should reference issue numbers when applicable
- Keep commits focused and atomic

## Boundaries & Constraints

### Do Not Modify
- `node_modules/` - managed by Bun
- `dist/` - build output directory (default)
- `out/` - alternative build output directory
- `.env` files or any secrets
- `bun.lock` - unless updating dependencies

### Security
- Never commit API keys, tokens, or sensitive data
- Validate and sanitize any user inputs
- Be mindful of XSS vulnerabilities when handling image data and URLs

### Browser Compatibility
- Target modern browsers (ES2020+)
- Be aware of File API and canvas API usage
- Test with various image formats (PNG, JPEG, GIF, WebP)

## Testing
Currently, this project does not have automated tests. When adding tests:
- Consider using Vitest for unit tests
- Test React components with @testing-library/react
- Focus on critical functionality: image processing, file handling, UI interactions

## Deployment Notes
- The app is deployed to Cloudflare Workers as a static SPA
- The `wrangler.jsonc` configuration handles routing and asset serving
- Build output goes to `dist/` directory
- Uses single-page-application mode for client-side routing
