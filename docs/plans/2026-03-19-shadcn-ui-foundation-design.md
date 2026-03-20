# Shadcn UI Foundation Upgrade Design

## Goal

Upgrade the workspace to a single, reusable, shadcn-style UI foundation centered on `@sdkwork/openchat-pc-ui`, then migrate business pages and business components to consume shared primitives and shared patterns instead of raw HTML controls and duplicated modal/form logic.

## Context

The current repository has three overlapping UI layers:

- `@sdkwork/openchat-pc-ui` already exposes a small foundation (`Button`, `Input`, `Modal`, `Card`, `ThemeProvider`, `toast`), but it is incomplete and not yet the clear single source of truth.
- `@sdkwork/openchat-pc-commons` still contains legacy UI implementations and compatibility helpers.
- Business packages still render large numbers of raw `<button>`, `<input>`, `<select>`, and `<textarea>` elements directly, often with repeated class strings and repeated interaction logic.

That split causes high coupling, inconsistent behavior, and weak change control. The upgrade needs to converge both the component source and the usage pattern.

## Approaches Considered

### 1. Big-bang hard replacement

Replace every page and component directly against a new UI kit in one pass.

Pros:

- Fastest conceptual convergence.
- No intermediate compatibility layer.

Cons:

- Highest regression risk.
- Too easy to break many packages at once without strong guardrails.

### 2. New foundation plus compatibility bridge plus full migration

Turn `@sdkwork/openchat-pc-ui` into the only foundational UI source, let `@sdkwork/openchat-pc-commons` become a compatibility re-export layer, then migrate business packages to the new primitives and patterns, backed by an audit test.

Pros:

- Best balance of correctness, maintainability, and migration safety.
- Supports incremental package migration while still enforcing a single source of truth.
- Keeps old import surfaces working while code is being moved.

Cons:

- Slightly more upfront work because both the foundation and the enforcement need to be built.

### 3. Component-library-only upgrade

Add more UI components to `@sdkwork/openchat-pc-ui` but leave business packages mostly unchanged.

Pros:

- Lowest short-term change.

Cons:

- Fails the goal of centralized reuse.
- Leaves duplicated controls and modal logic in place.

## Decision

Use approach 2.

`@sdkwork/openchat-pc-ui` becomes the single foundational source for reusable UI primitives and reusable UI patterns. `@sdkwork/openchat-pc-commons` keeps compatibility exports only. Business packages will be migrated toward wrapped controls and shared layout/panel/form/overlay patterns. A repository audit test will prevent raw business controls from growing back.

## Target Architecture

### Package responsibilities

- `@sdkwork/openchat-pc-ui`
  - foundation tokens and utilities
  - shared providers (`ThemeProvider`, `Toaster`)
  - reusable primitives (`Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `Label`, `Badge`, `Card`, `Tabs`, `Separator`, `ScrollArea`)
  - reusable overlays (`Dialog`, `Drawer`, `Popover`, `Tooltip`, `DropdownMenu`, `ConfirmDialog`)
  - reusable form scaffolding (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormDescription`, `FormMessage`)
  - reusable app-level patterns (`Field`, `FieldGroup`, `Panel`, `SectionCard`, `PageToolbar`, `SearchField`, `EmptyState`, `StatusNotice`, `LoadingBlock`)

- `@sdkwork/openchat-pc-commons`
  - re-export UI package public API
  - keep shell/layout exports
  - stop acting as a second UI implementation source

- business packages
  - consume shared UI components only
  - do not define new ad-hoc button/input/modal foundations locally
  - keep business logic, algorithms, and workflows unchanged unless the migration exposes defects

### Design principles

- High cohesion: shared controls live in one place with one API surface.
- Low coupling: business packages should depend on behavior-level primitives, not internal styling recipes.
- Pass-through ergonomics: shared controls still accept native props and `className` so migration does not require unnatural wrappers.
- Compatibility first: primitives support both controlled and native event usage where needed so existing business logic can move without semantic drift.
- Auditability: regression prevention must be automated, not manual.

## Component Strategy

### Primitive layer

The primitive layer will be shadcn-style in structure and API shape:

- variant-driven components with predictable `className` composition
- ref forwarding
- optional `asChild` behavior where it materially reduces wrapper nesting
- accessible overlays and menus
- styling aligned to the existing CSS token system so the visual language remains coherent

### Pattern layer

Many pages repeat the same layout logic even when the raw controls differ. The pattern layer will centralize those recurring shapes:

- auth card shell
- filter/search row
- settings section card
- key/value info list
- modal footer action group
- toolbar with primary and secondary actions
- empty, loading, success, warning, and error surfaces

These patterns reduce the need for every module to hand-roll its own spacing and feedback states.

## Migration Scope

### First-class migration targets

High-occurrence packages and high-value workflows:

- `auth`
- `settings`
- `agent`
- `skill`
- `tool`
- `tools`
- `appstore`
- `im`
- `contacts`
- `commerce`
- `wallet`
- `terminal`
- `social`

### Special handling

- Existing specialized editors and stream/video surfaces may retain native elements inside deeply specialized implementation details when a shared wrapper would reduce clarity or break behavior. Those cases should be isolated behind shared UI-adjacent abstractions where possible.
- The UI audit will explicitly exclude foundational UI packages themselves and only enforce business usage boundaries.

## Data Flow and Logic Safety

This upgrade is primarily a UI-architecture refactor, but it must still check behavior and algorithms:

- preserve controlled-state logic and existing async flows
- preserve translations and user-facing messages
- preserve workflow sequencing such as verification code countdowns, form validation, and submission states
- inspect action loops for incomplete branches while touching pages
- prefer extracting duplicated validation and UI flow helpers when repeated logic becomes obvious during migration

## Error Handling

- shared form/message surfaces should show validation, async, and failure states consistently
- modal and drawer interactions should keep existing cancel/confirm semantics
- shared buttons and form controls must preserve `disabled`, `loading`, and keyboard behaviors
- when a page already has meaningful error text, keep the existing translated copy and migrate only the surface

## Testing and Verification

### New enforcement

Add a UI audit test that scans business package source files for direct raw control usage and legacy overlay usage outside approved foundational locations.

### Component verification

Add focused tests for:

- button variants and disabled/loading behavior
- form field messaging
- dialog/drawer open-close interactions
- compatibility exports from `commons`

### Page verification

Update or add focused page tests for high-risk flows:

- auth pages
- settings page
- chat modal flows already using `@sdkwork/openchat-pc-ui`

### Full verification commands

- `pnpm run typecheck`
- `pnpm run typecheck:packages`
- `pnpm run test`
- `pnpm run verify:packages`

## Expected Outcome

After this upgrade:

- `@sdkwork/openchat-pc-ui` is the single foundational UI source
- `@sdkwork/openchat-pc-commons` stops carrying a second UI implementation burden
- business packages consume wrapped UI components instead of raw controls wherever feasible
- overlay, form, action, and feedback behavior become consistent
- a test guard prevents future drift back to scattered primitive usage
