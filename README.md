# The Copper Kitchen — Restaurant Management System

A complete restaurant management system that runs entirely in the browser:
a guest website, table booking, and three staff workspaces — manager, chef
and waiter — linked by one live data layer. No sign-up, no server, no
dependencies, no build step.

**Live demo:** https://zarghamullahshah.github.io/restaurant-management-system/
— the [guest menu](https://zarghamullahshah.github.io/restaurant-management-system/menu.html),
[table booking](https://zarghamullahshah.github.io/restaurant-management-system/booking.html)
and [staff login](https://zarghamullahshah.github.io/restaurant-management-system/login.html)
are all one click from there.

## Staff workspaces

One login page, three roles, three workspaces — all reading and writing
the same store, so an order a waiter takes appears on the chef's display
the second it is placed.

| Role    | PIN  | Workspace      | What it does                                                       |
| ------- | ---- | -------------- | ------------------------------------------------------------------ |
| Manager | 1234 | `manager.html` | Dashboard, tables & orders, bookings inbox, menu editor, sales     |
| Chef    | 2345 | `chef.html`    | Kitchen display: live tickets — new → preparing → ready            |
| Waiter  | 3456 | `waiter.html`  | Floor system: tables, order-taking, ready alerts, mark served      |

PINs are printed on the login page too — this is a front-end demo, and
the lock exists to route each role to its workspace, not to secure a
production system.

## Project structure

```
.
├── index.html            Landing page
├── menu.html             Guest menu (live from the store)
├── booking.html          Guest reservations + status lookup
├── login.html            Staff login
├── manager.html          Manager dashboard
├── orders.html           Tables & orders (manager)
├── bookings.html         Reservation inbox (manager)
├── menu-editor.html      Menu management (manager)
├── sales.html            Sales history + CSV export (manager)
├── chef.html             Kitchen display system
├── waiter.html           Waiter floor system
├── css/                  landing · customer · manager · staff stylesheets
├── js/                   One script per page + shared modules:
│                         store.js (data layer) · auth.js (sessions) ·
│                         manager-common.js (guard, toast, badges)
├── assets/               Logo (SVG), photography, kitchen film, CREDITS.md
├── test/                 Node unit tests for the store logic
└── docs/ARCHITECTURE.md  Data model, roles, kitchen-ticket flow, motion system
```

Every page has its own script and shares its audience's stylesheet.
See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for how it fits
together.

## What it does

- **Landing page** — cinematic entry (loader, inertia smooth scroll,
  masked-word headlines), 3D-tilting product stage, full-width kitchen
  film, scroll-driven horizontal photography gallery, animated counters.
- **Guest system** — a live menu (sold-out dishes vanish, price edits
  appear instantly) and reservations with a `CK-####` reference that
  guests track by phone: waiting → confirmed → seated.
- **Manager system** — revenue dashboard, tables & orders with the full
  billing breakdown, a bookings inbox (confirm / seat / cancel — the
  guest sees it live), a menu editor, and sales history with CSV export.
- **Kitchen link** — adding a dish opens a kitchen ticket; the chef works
  it new → preparing → ready; the waiter's table lights up green, they
  mark it served, and closing the bill clears the ticket.
- **Billing, done right** — discount applied **before** the 5% tax,
  clamped and rounded; bills keep priced snapshots so menu edits never
  rewrite history.

## Run it locally

Any static server works — or just open `index.html`:

```
npx serve .
# or
python3 -m http.server 8000
```

## Tests

```
node --test test/logic.test.js
```

13 tests cover the pure logic in `js/store.js`: billing maths, discount
clamping, day filtering, popularity aggregation and the kitchen ticket
lifecycle.

## Media

Photography via Unsplash; kitchen film by Taryn Elliott via Pexels.
Full credits in [`assets/CREDITS.md`](assets/CREDITS.md). The logo is an
original SVG (serving cloche mark), also used as the favicon.

## Conventions

- Vanilla HTML/CSS/JS only — no frameworks, no build tooling.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- State changes go through `js/store.js`; pages never touch storage
  directly.
