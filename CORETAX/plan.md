# CORETAX_XHTML Migration Plan

Goal: recreate CORETAX_STANDALONE in pure XHTML + Tailwind + vanilla JS/CSS (no React build) with identical UI/UX, data flows, and behaviors.

## 1) Setup & Scaffolding
- Initialize XHTML shell: base `index.xhtml`, global Tailwind import (CDN or prebuilt), base CSS utilities, and shared JS bundle entry.
- Define global data helpers: localStorage abstraction, seed demo admin, shared formatters (currency/date), geolocation utilities, tax calc logic, tax sync, and common UI helpers (toasts/modals).
- Prepare assets: inline SVG icon set mirroring lucide usage; slider controls; reusable badge/button/card classes.

## 2) Auth Experience
- Build views: Login, Register (with availability checks), Forgot Password (2-step token), Two-Factor Auth (6-digit grid).
- Implement view switching + state handling without React; preserve loading states, warnings, success screens, timers/redirects, and inline validation messages.
- Wire geolocation notice/warning on login; store `sessionToken` on 2FA success.

## 3) User Shell & Navigation
- Construct mobile header + sidebar with overlay; menu items (Dashboard, Data Diri, Data Kepemilikan, Pajak, Pengaturan); profile badge and logout.
- Implement tab router via JS (class toggles) and ensure state persists when switching pages.

## 4) User Features
- Dashboard: stats cards (assets, total tax due, upcoming payments), location status widget (geolocation check), upcoming taxes list (urgency styling).
- Profile: avatar upload (base64), editable fields (name/email/phone/address) with save success; read-only NIK/DOB; cancel restores values.
- Asset Management:
  - List grid with filters (search, type), badges, sliders, photo/attachment counts, tax info, details by asset type, acquisition date, coordinates for land/buildings.
  - Actions: Add/Edit (full-page form), Transfer (modal), Delete (confirm). Image slider navigation identical to original.
  - Asset Form: step 1 asset type selector; conditional sections for Lancar/Semi/Tidak Lancar with full field sets, location fetch button, single photo for non-current, shared fields (attachments PDF, photos gallery, description). Tax calculation panel (base rate, modifiers, total rate, tax amount). Submit creates/updates asset, seeds tax record when applicable, and tries to save location.
  - Transfer Modal: searchable active users (exclude admin/current), radio select, transferHistory update, taxes reassigned, success overlay.
- Tax Management: list with search + status filter, due date sorting, status pills, countdown/overdue text. Payment modal simulation updates tax status, sets paid date, and creates transaction record; success overlay.
- Settings: change password form with validations + alerts; account info summary.

## 5) Admin Features
- Admin shell and sidebar (Dashboard, Manajemen Pengguna, Manajemen Aset, Transaksi Pajak, Peta Lokasi User) with mobile overlay.
- Admin Dashboard: stats cards (users, active users, assets, revenue, unpaid taxes, last-7-days transactions) and recent activity list.
- User Management: search/filter, table with status pill, activate/deactivate toggle, detail modal.
- Admin Asset Management: card grid mirroring user view plus owner info, transfer count badge.
- Transaction Management: filters (search, date ranges), summary cards, table sorted newest, download report as JSON (simulated PDF).
- User Location Map: stats, role filters, user list with location/action badges, map iframe with zoom controls and overlays, marker selection recentering, detail panel with history list, fit-all action.

## 6) Data Integrity & Sync
- Implement tax sync on load and after asset mutations to keep `taxes` aligned with assets (due date +1 month when created, unpaid default).
- Ensure localStorage schemas match original keys/fields; cap location history at 100 entries.
- Seed demo admin and initialize empty arrays for assets/taxes/transactions when missing.

## 7) UI/UX Parity & Polish
- Match Tailwind class usage: gradients on auth, card elevations, rounded corners, hover/active states, state-colored badges.
- Ensure responsive behavior (mobile sidebar overlay, grids stack, buttons wrap).
- Add toasts/alerts matching original feedback moments (errors/warnings/success).
- Maintain timers (delays for async sims), loaders, and auto-redirects.

## 8) Testing Checklist
- Auth: login with/without location, register validations, forgot flow token, 2FA entry/paste, logout.
- User flows: add/edit/delete asset, transfer ownership, tax creation on asset add, tax payment updates transactions, profile edits, password change, filters/search on assets/taxes.
- Admin flows: toggle user active, view details, asset search, transaction filters & download, location map selection/zoom/filter.
- Persistence: refresh retains session and data; geolocation history capped; tax sync after edits.
