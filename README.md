# The Copper Kitchen — Restaurant Management System

A complete, working restaurant management system that runs entirely in the browser: tables, live orders, menu management, billing with tax and discounts, and a sales history with CSV export. Built for a real single-outlet restaurant — no sign-up, no server, no dependencies.

**Live demo:** https://zarghamullahshah.github.io/restaurant-management-system/

## What it does

- **Dashboard** — revenue today, bills completed, tables occupied and average bill, updated live with animated counters; most-ordered dishes and recent bills at a glance.
- **Tables & Orders** — 8 tables (including two family halls) with live Free/Occupied status and running totals. Open a table, add dishes, adjust quantities, apply a discount, and close the bill — the table frees itself automatically.
- **Menu management** — 18 real dishes across Starters, Mains, Breads & Rice, Drinks and Desserts. Add, edit, delete, mark dishes unavailable, search and filter by category. Changes apply to new orders immediately.
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

## Tech

Plain HTML, CSS and JavaScript. Zero dependencies.
