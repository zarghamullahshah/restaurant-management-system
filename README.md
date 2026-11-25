# The Copper Kitchen — Restaurant Management System

A complete, working restaurant management system that runs entirely in the browser: tables, live orders, menu management, billing with tax and discounts, and a sales history with CSV export. Built for a real single-outlet restaurant — no sign-up, no server, no dependencies.

**Live demo:** https://zarghamullahshah.github.io/restaurant-management-system/ — from there: the guest menu (`/menu.html`), table booking (`/booking.html`) and the manager system (`/manager.html`) are all one click away.

## Structure — every page has its own code files

**The website**
- `index.html` + `landing.css` + `landing.js` — the landing page: immersive hero with a 3D-tilting product stage and parallax cards, a full-width kitchen film band, scroll-triggered reveals, animated counters, a scrolling dish marquee, photography sections with scroll parallax, features and reviews.

**The customer system** (`customer.css`, one JS file per page)
- `menu.html` + `menu.js` — the guest menu, rendered live from the same data the kitchen uses: sold-out dishes vanish, price changes appear instantly.
- `booking.html` + `booking.js` — table reservations with a booking reference; guests track the live status (waiting → confirmed → seated) by phone number.

**The manager system** (`manager.css`, one JS file per page, shared sidebar)
- `manager.html` + `manager-dashboard.js` — revenue, bills, occupancy, most-ordered, waiting bookings.
- `orders.html` + `orders.js` — tables & orders with the full billing breakdown.
- `bookings.html` + `bookings.js` — the bookings inbox: confirm, seat at a free table, or cancel; the guest sees it live.
- `menu-editor.html` + `menu-editor.js` — add/edit/delete dishes and mark them sold out.
- `sales.html` + `sales.js` — sales history with day filter and CSV export.

**Shared by all of it**
- `store.js` — one data layer for every page (menu, tables, orders, bills, bookings) in `localStorage`; the pure billing logic in it is what the tests exercise.
- `manager-common.js` — toast + the pending-bookings badge for the manager pages.
- `assets/` — the logo (`logo.svg`, also the favicon), photography and the kitchen film, all stored locally.

## What it does

- **Dashboard** — revenue today, bills completed, tables occupied and average bill, updated live with animated counters; most-ordered dishes and recent bills at a glance.
- **Tables & Orders** — 8 tables (including two family halls) with live Free/Occupied status and running totals. Open a table, add dishes, adjust quantities, apply a discount, and close the bill — the table frees itself automatically.
- **Menu management** — 19 real dishes across Starters, Mains, Breads & Rice, Drinks and Desserts. Add, edit, delete, mark dishes unavailable, search and filter by category. Changes apply to new orders immediately.
- **Billing** — itemised bills with subtotal, percentage discount applied before tax, 5% tax, and a clear total. Every closed bill is saved.
- **Sales history** — every bill ever closed, with date, table, item count, discount and total, plus a one-click **CSV export** for the accountant.
- **Persistent** — all data (menu edits, open orders, bill history) is saved in the browser's local storage, so a refresh or a busy Friday night never loses an order.

## Run it

Open `index.html` in any modern browser — that is all. No build step, no install.

To host it (for example on GitHub Pages), serve the folder as static files; `index.html` is the entry point.

## Tests

The billing logic (totals, discount-before-tax, popular dishes, daily filtering) is unit-tested with Node's built-in test runner:

```bash
node --test test/logic.test.js
```

10 tests, all passing.

## Design

Warm charcoal, cream and copper — the colours of a real kitchen, not a template. Serif display type for the brand, one accent colour throughout, motion kept to purposeful touches: animated counters, staggered card reveals, and quiet hover feedback. No gradients, no stock imagery, no filler.

## Media

Photography from Unsplash and the kitchen film from Pexels (video by Taryn Elliott) — free to use under their licences, stored locally in `assets/` so the page never depends on an outside host. The landing page pairs them with a 3D product stage, scroll parallax and a full-width film band, the way a production marketing site would.

## Tech

Plain HTML, CSS and JavaScript. Zero dependencies.
