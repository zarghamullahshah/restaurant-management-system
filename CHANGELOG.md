# Changelog

All notable changes to The Copper Kitchen are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions are dated while the project is pre-1.0.

## [Unreleased]

### Added
- Reports page (`reports.html`): 14-day revenue chart, revenue by category,
  best sellers, average bill and best day, with a 14-day CSV download.
  New pure reporting functions in the store (`revenueByDay`,
  `revenueByCategory`, `averageOrderValue`), covered by 3 new tests.
- No-show marking on the bookings inbox: a confirmed or waiting booking
  whose guests never arrive can be marked no-show, with its own filter.
- A longer, more cinematic landing journey: a scroll-scrubbed manifesto
  statement, three dish spotlights, an illustrated service timeline
  whose line draws as you scroll, an FAQ accordion and a giant-type
  finale.
- Guest online ordering: cart and checkout on the menu page (dine-in or
  takeaway), a waiter-side online inbox, takeaway tickets on the kitchen
  display, sale recording on handover, and order tracking by phone.
- Staff login with three role workspaces — Manager, Chef (kitchen
  display) and Waiter (floor system) — linked by live kitchen tickets.
- Cinematic landing experience: loader intro, inertia smooth scrolling,
  masked-word headline reveals, scroll-driven horizontal gallery and a
  chapter rail.

### Changed
- Project reorganised into `css/`, `js/` and `docs/`; architecture
  documented in `docs/ARCHITECTURE.md`.

## [2026-11-25] — Initial release

### Added
- Immersive landing page with 3D hero, kitchen film band, real
  photography and a hand-drawn SVG logo.
- Guest system: live menu and table booking with reference lookup.
- Manager system: dashboard, tables & orders, bookings inbox, menu
  editor and sales history with CSV export.
- Shared data layer (`store`) with discount-before-tax billing;
  10 unit tests.
