# UI COMPONENTS (shadcn/ui)

**Vendor Code:** Third-party UI primitives from shadcn/ui project

## OVERVIEW
shadcn/ui base components (Radix UI primitives + Tailwind styling). These are **vendor-supplied patterns**, not application code.

## STRUCTURE
```
ui/
├── button.tsx       # Button with variant system (CVA)
├── card.tsx         # Card layout primitives
├── dialog.tsx       # Modal dialog (Radix UI Dialog)
├── input.tsx        # Text input
├── label.tsx        # Form label (Radix UI Label)
├── radio-group.tsx  # Radio buttons (Radix UI RadioGroup)
├── select.tsx       # Dropdown select (Radix UI Select)
└── textarea.tsx     # Multi-line text input
```

## WHERE TO LOOK

| Task | Approach |
|------|----------|
| Add new UI component | Copy from shadcn/ui docs, place here |
| Modify variant | Edit CVA config in component file |
| Style adjustment | Modify Tailwind classes in component |
| Add new variant | Extend CVA variants object |

## CONVENTIONS (DIFFERENT FROM PARENT)

**These files follow shadcn/ui patterns, NOT application patterns:**

| Convention | Pattern | Example |
|------------|---------|---------|
| **Import style** | `import * as React` | Namespace imports |
| **Export style** | End-of-file | `function Button(...) {}` then `export { Button }` |
| **Props typing** | `React.ComponentProps<"button">` | Leverage React utility types |
| **Documentation** | ❌ **NO JSDoc** | Vendor code not documented |
| **"use client"** | ⚠️ Selective (label, select) | Radix UI requirement |
| **Variants** | class-variance-authority (CVA) | Type-safe styling system |
| **data-slot** | ✅ Always present | `data-slot="button"` for CSS targeting |

## ANTI-PATTERNS (THIS DIRECTORY)

- ❌ **Do NOT add JSDoc** - these are vendor components
- ❌ **Do NOT refactor to match app patterns** - maintain shadcn/ui style
- ❌ **Do NOT add business logic** - keep as pure presentation
- ❌ **Do NOT remove "use client"** - required by Radix UI

## UNIQUE STYLES

**shadcn/ui Conventions (NOT Application Conventions):**

```typescript
// Pattern: Namespace import
import * as React from "react";
import { cn } from "@/lib/utils";

// Pattern: Separate function declaration
function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button data-slot="button" className={cn(...)} {...props} />;
}

// Pattern: End-of-file export
export { Button, buttonVariants };
```

**Contrast with Feature Components:**
```typescript
// Feature components use named imports
import { useState, useCallback } from "react";

// Feature components use inline exports
export function AspectRatioCrop({ imageUrl }: Props) { ... }

// Feature components have extensive JSDoc
/**
 * AspectRatioCrop provides...
 */
```

## NOTES

**Why Different Conventions:**
- These are **copy-pasted from shadcn/ui docs** (not npm packages)
- Maintaining upstream style enables **easy updates**
- Conventions differ intentionally to mark **vendor code boundary**
- No JSDoc because these are **not our abstractions**

**When Adding New Components:**
1. Visit https://ui.shadcn.com/
2. Copy component code as-is
3. Place in this directory
4. **Do NOT refactor to match app style**
5. **Do NOT add documentation**

**Styling System:**
- Uses class-variance-authority (CVA) for variants
- All styling via Tailwind classes (long className strings)
- `cn()` utility merges classes intelligently
- `data-slot` attributes for scoped CSS targeting

**"use client" Directives:**
- Only 2/8 files use it (label.tsx, select.tsx)
- Required by Radix UI for client-side interactivity
- Left in place for Next.js/RSC compatibility (future-proofing)
