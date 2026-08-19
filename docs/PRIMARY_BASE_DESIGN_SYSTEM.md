# Accountabul Primary Base Design System

**Prepared:** 2026-08-19
**Destination after source reconciliation:** target repository root `DESIGN_SYSTEM.md`
**Visual baseline:** Lovable target snapshot `3601ff823bedcacdeb9d30e3039eaad49a6d7238`

This contract keeps the established Accountabul blue/cyan/green visual identity while making
core product surfaces consistent, accessible, and fast. It is authoritative for the core
release after it is reviewed against the reconciled target tree.

## Product character

Accountabul should feel trustworthy, transparent, useful, and calm. It is a business and
marketplace platform first. Web3 or experimental functionality must not make ordinary account,
directory, listing, or live-event tasks feel speculative or difficult.

Design principles:

1. Show the next useful action clearly.
2. Distinguish verified facts, pending review, warnings, and promotional copy.
3. Keep public discovery open; explain why authentication is required only at private actions.
4. Prefer familiar business language over blockchain terminology on core routes.
5. Every loading, empty, error, retry, denied, offline, and success state is designed behavior.
6. Motion supports orientation and respects reduced-motion preferences.

## Foundation tokens

The inspected target already uses HSL variables. Preserve their semantic roles and remove
one-off hex/color values from core components.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `background` | `210 20% 98%` | `215 25% 7%` | Page canvas |
| `foreground` | `215 25% 10%` | `210 40% 98%` | Primary text |
| `card` | `0 0% 100%` | `215 25% 9%` | Surfaces |
| `primary` | `212 94% 40%` | `212 94% 55%` | Primary actions, links, focus |
| `secondary` | `186 94% 50%` | `186 94% 60%` | Supporting emphasis, not body text |
| `accent`/`success` | `158 68% 50%` | `158 68% 60%` | Verified/success state |
| `warning` | `42 96% 55%` | `42 96% 65%` | Pending/caution state |
| `destructive` | `0 84% 60%` | `0 84% 65%` | Destructive/error state |
| `border` | `214 20% 88%` | `215 20% 20%` | Boundaries |
| `muted` | `210 20% 95%` | `215 20% 15%` | Subtle surfaces |
| `muted-foreground` | `215 15% 45%` | must pass contrast review | Secondary text |

Foreground/background combinations must pass WCAG AA contrast for their rendered size. Cyan
and green are not assumed accessible merely because they are brand colors; use the paired
foreground token and verify contrast.

## Gradients, shadows, and shape

- Primary gradient: blue to cyan, reserved for the hero or one high-emphasis moment per view.
- Secondary gradient: cyan to green, reserved for verified/positive highlights.
- Do not use gradients behind long copy, forms, tables, or status explanations.
- Default radius: `0.5rem`; cards may use `0.75rem` where a larger content surface needs it.
- Default card shadow remains low contrast. Hover shadow is allowed only for clickable cards.
- Focus is never communicated by shadow/color alone; use a visible two-pixel ring and offset.

## Typography

- Use one bundled/system sans-serif stack for UI and content; do not add a render-blocking
  font solely for decoration.
- Body: 16px base, minimum 1.5 line height for reading copy.
- Small/supporting text: 14px; 12px only for short metadata with verified contrast.
- Page title: responsive 32–48px, tight but readable line height.
- Section title: 24–32px.
- Card title: 18–20px.
- Use sentence case. Avoid all-caps paragraphs or status labels.
- Numbers, prices, dates, and statuses use consistent formatting helpers.

## Spacing and layout

- Base spacing unit: 4px. Normal component gaps use 8, 12, 16, 24, 32, or 48px.
- Public content container: maximum 1280–1400px with 16px mobile, 24px tablet, and 32px
  desktop gutters.
- Reading copy stays near 65–75 characters per line.
- Touch targets are at least 44x44 CSS pixels unless an equivalent larger interactive region
  surrounds the visible control.
- Core viewport proofs: 360x800, 768x1024, and 1440x900.
- Horizontal scrolling is limited to clearly labeled data regions; the document itself must
  not overflow horizontally.
- Never hide scrollbars globally. Style only a component that has a demonstrated visual need,
  and keep a visible/operable alternative.

## Navigation

Desktop navigation must become visible at the documented breakpoint; unconditional `hidden`
containers are invalid. The public primary items are:

1. Marketplace
2. Businesses/Services
3. Live
4. Optional Causes when included in launch scope

Signed-out action: Sign in, with a secondary Create account path.

Signed-in personal actions: Saved and Dashboard. Business-member actions live in Dashboard,
not as global clutter. Admin appears only after a server-derived admin result. Mobile uses a
button with name/state, Escape close, focus containment/return, and a scrollable drawer.

## Core component contracts

### Buttons

- Primary: one dominant action per local section.
- Secondary/outline: safe alternative.
- Destructive: confirmation required for material deletion/revocation.
- Loading disables duplicate submission and preserves the action label context.
- Icon-only buttons require an accessible name and tooltip where meaning is not universal.

### Forms

- Visible label, description where needed, and field-level error tied with `aria-describedby`.
- Validate on submit and after interaction; do not punish untouched fields.
- Preserve safe input after provider/network failure.
- Business membership and admin role are never editable profile-form controls.

### Cards and list results

- Entire-card click behavior must not conflict with nested save/contact actions.
- Listing cards show image, title, location/category, publish/verification truth, and one clear
  next action.
- Image aspect ratio and dimensions are fixed to prevent layout shift.
- Directory cards never display private contact or internal review fields.

### Status badges

| State | Semantic treatment |
| --- | --- |
| Verified/published/live success | Green plus text/icon |
| Pending/scheduled/review | Amber plus text/icon |
| Draft/offline/ended | Neutral plus text |
| Rejected/error/suspended | Red plus text/icon |

Color alone never communicates status.

### Tables and dashboards

- Use a table for true comparative data; use cards/list rows on narrow screens.
- Column headings remain associated with data.
- Actions have explicit names and destructive confirmation.
- Loading skeletons approximate final geometry; empty and error states explain the next step.

### Live room

- Video region uses responsive 16:9 geometry with an accessible iframe title.
- Player state label is visible outside the iframe.
- Desktop: player and chat may share columns; mobile: player precedes event details and chat.
- Scheduled/offline/connecting/reconnecting/ended/provider-down states have distinct copy and
  recovery action.
- Chat supports keyboard submission, live-region announcements that do not overwhelm, retry,
  moderation feedback, and a sign-in prompt for writers when reads are public.

## Page patterns

### Marketplace/directory

- Page title and one-sentence purpose.
- Search and filters remain usable at 360px and serialize to URL parameters where practical.
- Results announce count changes accessibly.
- Server-side bounded pagination or “Load more”; never download every record to filter locally.
- Empty search result differs from empty marketplace/directory.

### Authentication

- Individual and business entry paths share one identity system.
- Business onboarding creates/joins a business after the person account exists.
- Errors avoid revealing whether an unrelated email exists.
- Successful sign-in returns to the intended safe private action.

### Dashboard

- Personal profile, business management, listings/services, leads, saved items, and billing
  are separate destinations with consistent navigation.
- Role-ineligible destinations are absent or clearly denied; they are never shown as broken.
- Experimental finance/wallet panels do not dominate the core dashboard.

## Motion

- Default UI transitions: 150–250ms, transform/opacity only where practical.
- Long decorative float/pulse animations are not used in forms, dashboards, tables, live chat,
  or status indicators.
- Under `prefers-reduced-motion: reduce`, nonessential animation and smooth scrolling stop.
- Loading animation includes text or an accessible status, not an unlabeled spinner alone.

## Accessibility release checks

- Semantic landmarks, skip link, meaningful page title and one page-level heading.
- Visible focus, logical order, no keyboard trap, safe dialog/drawer focus return.
- Labels, descriptions, validation messages, alt text, iframe titles, and status announcements.
- AA contrast in light and dark modes, including muted text and all badge combinations.
- 200% zoom and text reflow without loss of function.
- No global scrollbar or focus suppression.
- Zero critical/serious automated violations plus documented keyboard and screen-reader smoke.

## Performance rules

- Route-lazy-load admin and experimental modules.
- Do not load wallet/XRPL libraries on homepage, marketplace, directory, auth, or live discovery.
- Use explicit columns, pagination, stable cache keys, and measured refetch intervals.
- Images declare dimensions, use responsive sizes, compress formats, and lazy-load below fold.
- Avoid continuous polling when focus/realtime/event transitions provide a bounded alternative.
- Meet G8 budgets in `docs/PRODUCTION_CORE_DEFINITION_OF_DONE.md` on the published candidate.

## Design review evidence

For each core page, retain light/dark screenshots at mobile and desktop, component state
captures, automated accessibility results, keyboard notes, and any approved deviation. A page
is not design-complete because its happy path matches a screenshot; all required states and
interactions must satisfy this contract.
