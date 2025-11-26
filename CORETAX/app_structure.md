# CORETAX XHTML Migration Map

This document captures the full UI/UX, flows, and data behaviors from `CORETAX_STANDALONE` that must be mirrored in `CORETAX_XHTML` (static XHTML + Tailwind + vanilla JS/CSS, no React build).

## Global Application Flow
- Roles: `admin` and `user`; single seeded admin (`admin/admin123`). LocalStorage keys: `users`, `assets`, `taxes`, `transactions`, `userLocations`, `sessionToken`.
- Auth gating: if no session, show login/register/forgot password/2FA screens. Successful login triggers 2FA step, then loads role-based layout. Logout clears `sessionToken`.
- Location tracking: attempted on login, asset submit, and periodic (5 min) while logged in. Uses browser geolocation; success stored in `userLocations` with `action` (`login`, `form_submit`, `periodic`), failure shows warning but does not block flows.

## Authentication Screens
- **Login**: Identifier (email/username) + password, geolocation notice, warnings for denied location, error toast for invalid creds, link to register/forgot. Demo creds note.
- **Register**: Multi-column form (name, username, email with availability indicators, password/confirm, NIK 16 digits, DOB). Inline validations, success screen auto-redirects to login.
- **Forgot Password**: Step 1 collect email, generate token (displayed inline), step 2 verify token + new password + confirm. Success screen with CTA back to login.
- **Two-Factor Auth**: 6-digit code input grid with paste/auto-advance; code displayed inline (simulated email). Error resets inputs; resend link (UI only).

## User Application Layout
- Shell: mobile header with menu toggle; persistent sidebar (Dashboard, Data Diri, Data Kepemilikan, Pajak, Pengaturan), profile badge, logout.
- Pages:
  - **Dashboard**: Stats cards (total assets, total tax due, upcoming payments 30 days), location status widget, upcoming taxes list (urgency highlighting, due date, amount).
  - **Data Diri (Profile)**: Photo upload (avatar), view-only NIK/DOB, editable name/email/phone/address with save + success alert; cancel resets edits.
  - **Data Kepemilikan (Assets)**:
    - Filters: search by name/reg number, type filter (all/vehicle/property). Cards grid with icon by asset kind, asset-type badge (lancar/semi-lancar/tidak-lancar), image slider (photos) or single photo, details (registration, value, tax info with rate/amount, type-specific fields), acquisition date, coordinates for land/buildings, attachment/photo counts. Actions: Edit, Transfer, Delete (confirm).
    - **Asset Form** (full-page swap): step 1 choose asset type (LANCAR/SEMI_LANCAR/TIDAK_LANCAR) with descriptions. Conditional sections:
      - Lancar options (Kas/Bank, Piutang, Persediaan, Deposito Jangka Pendek, Investasi Lancar) with related fields.
      - Semi-Lancar options (Investasi Jangka Menengah, Sertifikat Deposito, Piutang Jangka Menengah).
      - Tidak Lancar options (Tanah, Bangunan, Kendaraan, Mesin/Peralatan, Perabot Kantor, Aset Tak Berwujud, Investasi Jangka Panjang) with deep field sets (certificates, land/building dimensions/materials, vehicle engine/fuel, etc.). Includes location picker button to fetch geolocation, and single photo upload for these sections.
    - Shared fields: asset name, registration/sertifikat, value, acquisition date, description, PDF attachments uploader (list with remove), general photos gallery (multi-upload with remove). Tax calculation box shows base rate, modifiers list, total rate, and computed tax amount; saves rate/amount into asset and seeds tax record on create. Submit creates/updates asset, writes tax records, and captures location (non-blocking). Cancel button returns to list.
    - **Transfer Ownership Modal**: searchable user list (excludes admins/current owner), radio select, transfer button writes `transferHistory` and reassigns taxes; success toast overlay.
  - **Pajak (Tax Management)**: Table list with search (asset/tax number), status filter (all/paid/unpaid), sorted by due date. Rows show asset name + tax type, tax number, amount + rate, due date + countdown/overdue indicator, status pill. Unpaid rows have “Bayar” button opening Payment modal.
    - **Payment Modal**: Simulated payment summary, confirm to mark tax `paid`, set `paidDate`, and append transaction record; success overlay then closes.
  - **Pengaturan (Settings)**: Change password form (old/new/confirm) with validations and success/error alerts; account info summary panel (name/email/username/role).

## Admin Application Layout
- Shell: mobile header, admin sidebar (Dashboard, Manajemen Pengguna, Manajemen Aset, Transaksi Pajak, Peta Lokasi User), admin badge, logout.
- Pages:
  - **Dashboard**: Stats cards (total users, active users, total assets, total revenue from transactions, unpaid taxes count, transactions in last 7 days). Recent activity list of latest transactions with user, asset, amount, date.
  - **Manajemen Pengguna**: Search bar; table of users (non-admin) with name/username, email, NIK, registration date, status pill. Actions: view detail modal (full user info) and toggle active/inactive.
  - **Manajemen Aset**: Search by name/reg number; cards grid similar to user view showing owner name, type badges, tax info, photos slider, attachments/photos counts, vehicle/building details, transfer count badge.
  - **Transaksi Pajak**: Filters: search (asset/tax/user), date filter (all/today/week/month). Summary cards (total transactions, total revenue). Table sorted newest first with date, user, asset, tax number, amount. “Download Laporan” creates JSON report and triggers download (simulated PDF).
  - **Peta Lokasi User**: Stats (tracked users, active in last hour, total locations). User list with role filters (all/user/admin), location and timestamp, action badge. Map panel using OpenStreetMap iframe centered on selected/first location with zoom controls + center info overlay. Selecting user recenters map and shows detail panel (coords, accuracy, last action, history list). Fit-all button recenters to first filtered location.

## Data & Behavior Notes
- Asset creation updates `taxes` with an initial unpaid entry (due date +1 month) when tax calculation returns >0; tax data later consumed by Tax pages and admin stats.
- Payment flow appends to `transactions`; admin dashboard and transaction page aggregate revenue and counts, including recent activity list.
- Transfer ownership also reassigns taxes to the new user.
- Geolocation history retained per user (max 100 records) for admin map; stored under `userLocations`.
- Styling: Tailwind utility classes throughout; gradients on auth screens, card-style surfaces, rounded corners, hover states, badges, and state-colored pills should be preserved one-to-one in XHTML/CSS.

## Shell & Routing Expectations
- No URL routing; single-page view switching based on current role and selected menu tab. In XHTML version, replicate via JS-driven view toggling without React.
- Mobile behavior: overlay sidebar with backdrop and close button; header toggle icon (menu/X).

## Assets & Utilities
- Icons via lucide in React version; in XHTML replace with inline SVG set or equivalent while keeping same visuals.
- ImageSlider component cycles uploaded photos with navigation arrows; required on asset cards in user/admin views.
- Utility modules to mirror: `geolocation` (get/save/format), `taxCalculation` (base rates + modifiers, total rate, tax amount), `taxSync` (keeps taxes aligned with assets on load).

Use this map to rebuild identical flows and UI fidelity in the XHTML/Tailwind implementation.***
