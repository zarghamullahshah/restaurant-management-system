# Architecture — The Copper Kitchen

A zero-dependency, multi-page web app. No build step, no framework, no
server: static files on GitHub Pages, all state in the browser. Every page
is a separate HTML file with its own script; shared behaviour lives in
small, single-purpose modules.

## Layout

```
index.html            Landing page (marketing + entry point)
menu.html             Guest menu (read-only, live from the store)
booking.html          Guest reservations + status lookup by phone
login.html            Staff login (role picker + PIN)
manager.html          Manager dashboard          ┐
orders.html           Tables & orders            │ manager role
bookings.html         Reservation inbox          │
menu-editor.html      Menu management            │
sales.html            Sales history + CSV        ┘
chef.html             Kitchen display system (KDS)
waiter.html           Waiter floor system
css/                  One stylesheet per audience (landing, customer, manager, staff)
js/                   One script per page, plus shared modules (store, auth, manager-common)
assets/               Logo (SVG), photography, kitchen film, CREDITS.md
test/                 Node unit tests for the billing/kitchen logic
docs/                 This file
```

## The store (`js/store.js`)

One module owns all state. Pages never touch `localStorage` directly.

- **Persistence:** a single key, `copper-kitchen-v1`. `loadState()`
  migrates older saves forward (missing collections are backfilled), so
  new features never wipe an existing device's data.
- **Model:**
  - `menu[]` — dishes `{ id, name, price, category, available, photo? }`
  - `tables[]` — `{ id, name, seats }`
  - `orders` — `tableId -> [{ itemId, qty }]`
  - `discounts` — `tableId -> percent`
  - `bills[]` — closed bills with priced line snapshots and totals
  - `bookings[]` — guest reservations with a `CK-####` reference
  - `kitchen` — `tableId -> { status, placedAt, byName }` (see below)
- **Billing rules (unit-tested):** discount is applied **before** the 5%
  tax; percentages are clamped to 0–100; money is rounded to whole rupees.
  Bills store priced line snapshots, so later menu edits never rewrite
  history.

## Roles & sessions (`js/auth.js`, `login.html`)

Three staff roles, three workspaces, one shared store:

| Role    | Workspace      | Can do                                                            |
| ------- | -------------- | ----------------------------------------------------------------- |
| Manager | `manager.html` | Everything: dashboard, orders, bookings, menu, sales              |
| Chef    | `chef.html`    | Move kitchen tickets: new → preparing → ready                     |
| Waiter  | `waiter.html`  | Take orders, watch kitchen status, mark served, close bills       |

A session (`ck-session`) is written by `staffLogin()` and checked by
`requireRole()`; every staff page declares its requirement with
`body[data-requires]` (`manager` or `staff`), enforced centrally by
`js/manager-common.js`. Chef/waiter pages are viewable by any signed-in
staff member, but write actions check the role in the page script.
This is a demo-grade front-end lock (PINs are printed on the login page);
a production deployment would move auth to a server.

## The kitchen link (`kitchen` tickets)

The ticket is the contract between floor and kitchen:

1. A waiter (or manager) adds the first dish to a table → `openTicket()`
   creates a ticket: `status: "new"`, `placedAt`, `byName`.
2. The chef's display groups live tickets into **New / Preparing /
   Ready** columns; the chef advances the status.
3. The waiter's floor shows the same status as a pill on the table card;
   `ready` pulses green and raises a "Ready to serve" banner.
4. The waiter marks the ticket `served`. Adding more dishes after that
   opens a fresh ticket. Closing the bill (or clearing the order) clears
   the ticket.

Pages re-render on the `storage` event, so with the system open in two
tabs (or two devices sharing a browser profile), an order taken in one
appears in the other without a refresh.

## Landing page motion (`js/landing.js`)

One `requestAnimationFrame` loop drives the hero tilt, photo parallax,
scroll progress and the horizontal gallery, easing every value toward
its target (lerp) instead of snapping. Scroll reveals use
`IntersectionObserver` with per-group stagger; headlines use masked-word
reveals. An inertia smooth-scroll (desktop, fine pointer only) feeds the
same loop. `prefers-reduced-motion` disables the engine entirely, and
all content is visible without JavaScript.

## Testing

```
node --test test/logic.test.js
```

Covers the pure logic in `js/store.js`: billing maths, discount
clamping, day filtering, popularity aggregation and the kitchen ticket
lifecycle.

## Deployment

GitHub Pages serves the repository root. There is nothing to build:
push, wait for the Pages build, verify the live URL.
