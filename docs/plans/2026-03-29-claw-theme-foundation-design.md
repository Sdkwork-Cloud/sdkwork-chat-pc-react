# Claw Theme Foundation Alignment Design

## Goal

Refactor `sdkwork-chat-pc-react` so its theme system, shell framework, and foundational UI surfaces align with the visual and structural standards used by `apps/claw-studio`, while keeping product behavior and business flows unchanged.

## Context

The current app already has a shared UI package and a shared shell package, but they are visually driven by an older AI-dark token system:

- `src/index.css` defines a custom `--ai-*` token family and many product-specific visuals.
- `src/app/providers/ThemeManager.tsx` maps store state into those custom variables.
- `@sdkwork/openchat-pc-ui` and `@sdkwork/openchat-pc-commons` still expose controls and shell primitives that style against the old token model.
- `@sdkwork/openchat-pc-commons/src/shell/MainLayout.tsx` and `Sidebar.tsx` still use the older dark, glowing, icon-grid shell rather than the `claw-studio` desktop shell language.
- Loading, auth, shell, settings, overlays, and page chrome do not yet share one consistent foundation.

`claw-studio` already solved this with a clearer standard:

- `data-theme` controls the brand palette.
- `.dark` controls light and dark mode.
- the shell is layered with restrained neutral surfaces plus radial highlight accents.
- controls and overlays use one shared surface system (`white/zinc` in light mode and `zinc` in dark mode).
- scrollbars, rings, shadows, and panels are part of the same theme contract.

The gap is not only color. It is architecture, token shape, surface behavior, and shell composition.

## Approaches Considered

### 1. Pure recolor

Only replace color variables and keep the existing shell and component surface rules.

Pros:

- lowest change volume
- lower immediate regression risk

Cons:

- cannot achieve real parity with `claw-studio`
- leaves old shell geometry, overlay surfaces, and component feel in place
- produces a “same palette, different product language” result

### 2. Full shell-and-foundation alignment

Keep routing and business flows unchanged, but align the theme contract, foundational controls, shell layout, overlays, auth/loading states, and key container surfaces to `claw-studio`.

Pros:

- the only option that can achieve near-complete parity
- future maintenance becomes easier because one theme language governs the app
- removes split behavior between shell, overlays, and business pages

Cons:

- larger edit surface
- requires coordinated changes across theme, UI package, shell, and tests

### 3. Direct dependency on `claw-studio` shell/UI packages

Try to import `claw-studio` shell packages directly into this app and adapt around them.

Pros:

- strongest code reuse on paper

Cons:

- package boundaries and routing assumptions differ
- high integration risk
- would couple this app to another product’s internal module graph
- unnecessary for the user’s goal

## Decision

Use approach 2.

This app should adopt the `claw-studio` standard as a design system reference, not as a direct package dependency. The result should be a local implementation that matches `claw-studio` in theme behavior, shell framework, and UI surfaces while preserving this app’s routing, product modules, and business logic.

## Target Architecture

### Theme contract

The app should move from the current mostly semantic `--ai-*` token family toward a dual-layer contract:

- brand scale tokens compatible with `claw-studio`
  - `--theme-primary-50` through `--theme-primary-950`
- semantic app tokens derived from those brand tokens
  - background surfaces
  - text hierarchy
  - border/ring values
  - shadow values
  - overlay/backdrop values
  - scrollbar colors

This keeps compatibility with existing code that still reads semantic variables, while making the theme system structurally match `claw-studio`.

### Theme runtime behavior

- `data-theme` continues to reflect the selected color family from app state.
- `.dark` continues to reflect dark mode and system mode resolution.
- `ThemeManager` becomes the single runtime adapter that writes both the brand scale and semantic variables.
- `src/index.css` becomes a thin base theme layer instead of an oversized product-specific skin.

### Foundation ownership

- `@sdkwork/openchat-pc-ui` is the only visual foundation source for controls, cards, badges, overlays, and shared patterns.
- `@sdkwork/openchat-pc-commons` remains a compatibility bridge and shell host, not a second visual system.
- business packages should inherit the new surface rules automatically where possible, and only receive targeted page/container adjustments where the old shell assumptions leak through.

## Visual Standards To Align

### Color and surface language

Adopt the same overall language as `claw-studio`:

- light mode uses zinc and white surfaces with restrained transparency
- dark mode uses zinc-950 and zinc-900 surfaces with subtle white overlays
- primary accents come from the brand scale rather than isolated one-off color values
- overlays use softened dark backdrops with blur instead of flat heavy black
- panel borders, focus rings, and shadows are lighter and more controlled than the current AI-glow approach

### Shell language

The app shell should align with `claw-studio` in structure:

- layered radial top accent
- optional side ambient gradient
- header-aware content framing
- sidebar as a more refined dark navigation rail, not the current “floating icon launcher” style
- main content surface using translucent light/dark panels rather than full-bleed hard backgrounds

### Control language

Base controls should align with `claw-studio`:

- rounded-xl to rounded-3xl geometry depending on component type
- white/zinc control surfaces
- standard focus rings tied to the primary scale
- shared button, input, textarea, select, modal, drawer, badge, and card surfaces
- consistent scrollbar behavior

## Scope

### In scope

- `src/index.css`
- `src/app/providers/ThemeManager.tsx`
- `@sdkwork/openchat-pc-ui` foundational theme and control surfaces
- `@sdkwork/openchat-pc-commons` shell layout and sidebar
- auth/loading/shell container presentation
- overlay/backdrop/modal/drawer surfaces
- tests that audit the theme and shell standard

### Out of scope

- business logic changes
- route changes
- feature removal
- API/service changes
- large content redesign inside every feature page unless shell/theme parity requires targeted surface cleanup

## Implementation Strategy

### Phase 1: lock the standard with tests

Before implementation, add or update audit tests so the repo asserts:

- theme runtime publishes `claw-studio`-style brand scale tokens
- shell surfaces use the aligned background/panel classes
- compatibility bridge files still point into the shared UI package

### Phase 2: align the theme runtime and global CSS

- rebuild `ThemeManager` so it writes `--theme-primary-*` tokens and derived semantic tokens
- reduce `src/index.css` to global base styles, scrollbar rules, selection rules, motion helpers, and chat-editor exceptions
- align color scheme, scrollbar, and root body surfaces with `claw-studio`

### Phase 3: align the foundation surfaces

- retune shared UI components so buttons, inputs, cards, badges, modals, and drawers visually match `claw-studio`
- preserve API compatibility where existing pages depend on current props

### Phase 4: align the shell framework

- refactor the main shell layout to use the same visual layering principles as `claw-studio`
- refactor the sidebar to match the darker refined navigation language while preserving this app’s route map
- align loading/auth wrappers to the same surface system

### Phase 5: verify and polish

- run targeted tests first, then typecheck and full tests
- inspect remaining mismatches and iterate on the worst surface gaps
- stop only when shell, theme, and foundational UI no longer visibly diverge from the `claw-studio` reference standard

## Error Handling and Safety

- theme changes must not break `system` mode behavior
- auth and route guards must not regress
- desktop bootstrap paths must continue to mount correctly
- any business page relying on current semantic variables must still resolve valid colors after the token rewrite
- if a page uses unusual custom classes, prefer adapting shared tokens first before patching the page directly

## Testing and Verification

Focused verification should cover:

- theme runtime output
- shell and sidebar alignment
- foundation audit coverage
- routing layout integrity

Final verification should include:

- `pnpm run test -- src/tests/ui.foundation.audit.test.ts src/tests/app.shell.alignment.test.ts src/tests/router.layout-shell.test.tsx`
- `pnpm run typecheck`
- `pnpm run typecheck:packages`
- `pnpm run test`
- `pnpm run verify:packages`

## Expected Outcome

After the refactor:

- the app uses a `claw-studio`-aligned theme contract instead of the old isolated AI-dark theme system
- shell, auth/loading states, overlays, and controls visually feel like the same product family as `claw-studio`
- foundational UI stays centralized in `@sdkwork/openchat-pc-ui`
- product functions remain unchanged
- future theme work can happen against one coherent standard instead of layered visual drift
