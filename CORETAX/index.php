<?php
// Simple front-end shell; all logic handled via JS calling PHP APIs.
?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CORETAX - PWD Portal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
    <style type="text/css">
      .hidden { display: none; }
      .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 0.9rem; box-shadow: 0 12px 45px rgba(15, 23, 42, 0.04); }
      .tag { padding: 0.25rem 0.75rem; border-radius: 9999px; display: inline-block; }
      .input-base { transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease; }
      .input-base:focus { outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25); border-color: #94a3b8; background: #eef3fb; }
      .input-filled { background: #f9fbff; }
      .btn-primary { background: #2f62e5; }
      .btn-primary:hover { background: #2553c7; }
      .btn-success { background: #4f8c5b; }
      .btn-success:hover { background: #3f7349; }
      .muted { color: #6c7280; }
      .hero-wrap { max-width: 1180px; }
      .auth-tab { padding-bottom: 0.35rem; border-bottom: 2px solid transparent; }
      .auth-tab.active { color: #0f172a; border-color: #2f62e5; }
      .auth-tab:not(.active):hover { color: #1d4ed8; }
    </style>
  </head>
  <body class="min-h-screen text-slate-900" style="background: radial-gradient(circle at 20% 20%, #f6f9ff, #f9fbff 50%), radial-gradient(circle at 85% 15%, #f2f6ff, #ffffff 45%);">
    <div class="hero-wrap mx-auto px-6 py-10" id="app-wrapper">
      <div class="flex items-start justify-between mb-8">
        <div class="space-y-1">
          <p class="text-sm uppercase tracking-widest text-blue-600 font-semibold">CORETAX</p>
          <h1 class="text-3xl md:text-4xl font-semibold text-slate-900">Portal Pajak Daerah</h1>
          <p class="text-slate-600 text-base">Kelola aset, tagihan pajak, dan transaksi dalam satu tempat.</p>
        </div>
        <div id="user-pill" class="hidden items-center gap-3 bg-white border border-slate-200 rounded-full px-4 py-2 shadow-sm">
          <div class="text-sm">
            <p id="user-name" class="font-semibold">-</p>
            <p id="user-role" class="text-slate-500">-</p>
          </div>
          <button id="logout-btn" class="text-sm text-red-600 hover:text-red-700">Keluar</button>
        </div>
      </div>
      <div id="auth-section" class="grid grid-cols-1 gap-6">
        <div class="card p-6">
          <div class="flex items-center gap-4 border-b border-slate-200 pb-3 mb-5">
            <button type="button" class="auth-tab text-sm font-semibold text-slate-900" data-tab="login">Masuk</button>
            <button type="button" class="auth-tab text-sm font-semibold text-slate-500" data-tab="register">Buat Akun</button>
          </div>
          <div id="login-panel">
            <h2 class="text-xl font-semibold mb-1">Masuk</h2>
            <p class="muted mb-4 text-sm">Gunakan email atau username yang sudah terdaftar.</p>
            <form id="login-form" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email / Username</label>
                <input type="text" name="identifier" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input type="password" name="password" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <button type="submit" class="w-full btn-primary text-white rounded-lg py-2 hover:brightness-95 transition-colors">Masuk</button>
            </form>
            <p id="login-error" class="text-sm text-red-600 mt-2 hidden"></p>
          </div>
          <div id="register-panel" class="hidden">
            <h2 class="text-xl font-semibold mb-1">Buat Akun</h2>
            <p class="muted mb-4 text-sm">Registrasi cepat untuk pengguna baru.</p>
            <form id="register-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
                <input type="text" name="name" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" name="email" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input type="text" name="username" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input type="password" name="password" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password</label>
                <input type="password" name="confirmPassword" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">NIK</label>
                <input
                  type="text"
                  name="nik"
                  required
                  minlength="16"
                  maxlength="16"
                  pattern="[0-9]{16}"
                  inputmode="numeric"
                  placeholder="16 digit tanpa spasi"
                  class="input-base w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input type="date" name="dateOfBirth" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Alamat</label>
                <input type="text" name="address" class="input-base w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <button type="submit" class="md:col-span-2 btn-success text-white rounded-lg py-2 hover:brightness-95 transition-colors">Daftar</button>
            </form>
            <p id="register-error" class="text-sm text-red-600 mt-2 hidden"></p>
          </div>
        </div>
      </div>

      <div id="app-section" class="hidden space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="card p-4 shadow-sm">
            <p class="text-sm text-slate-500">Total Aset</p>
            <p id="stat-assets" class="text-2xl font-semibold text-slate-900">0</p>
          </div>
          <div class="card p-4 shadow-sm">
            <p class="text-sm text-slate-500">Tagihan Belum Lunas</p>
            <p id="stat-unpaid" class="text-2xl font-semibold text-amber-700">0</p>
          </div>
          <div class="card p-4 shadow-sm">
            <p class="text-sm text-slate-500">Transaksi Selesai</p>
            <p id="stat-transactions" class="text-2xl font-semibold text-emerald-700">0</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div class="card shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold">Kelola Aset</h3>
                <p class="text-slate-600 text-sm">Tambah aset baru atau perbarui data.</p>
              </div>
              <span class="tag bg-blue-100 text-blue-700">Aset &rarr; Pajak</span>
            </div>
            <form id="asset-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="hidden" name="id" id="asset-id" />
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Nama Aset</label>
                <input type="text" name="name" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
                <select name="type" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="vehicle">Kendaraan</option>
                  <option value="property">Properti</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <select name="assetCategory" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="lancar">Lancar</option>
                  <option value="semi-lancar">Semi Lancar</option>
                  <option value="tidak-lancar">Tidak Lancar</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nomor Registrasi</label>
                <input type="text" name="registrationNumber" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nilai Perkiraan (Rp)</label>
                <input type="number" name="estimatedValue" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                <input type="text" name="location" class="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div class="md:col-span-2 flex items-center gap-3">
                <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Simpan</button>
                <button type="button" id="asset-reset" class="text-sm text-slate-600 hover:text-slate-900">Reset Form</button>
              </div>
            </form>
            <p id="asset-message" class="text-sm mt-2 text-emerald-700 hidden">Tersimpan.</p>
          </div>

          <div class="card shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold">Daftar Aset</h3>
                <p class="text-slate-600 text-sm">Klik edit untuk memuat form.</p>
              </div>
              <span class="tag bg-slate-100 text-slate-700">Realtime</span>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500">
                    <th class="py-2 pr-4">Nama</th>
                    <th class="py-2 pr-4">Registrasi</th>
                    <th class="py-2 pr-4">Nilai</th>
                    <th class="py-2 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody id="asset-rows" class="divide-y divide-slate-200">
                  <tr><td colspan="4" class="py-3 text-slate-500">Belum ada aset.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="card shadow-sm p-6 lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold">Tagihan Pajak</h3>
                <p class="text-slate-600 text-sm">Bayar langsung dari tabel berikut.</p>
              </div>
              <span class="tag bg-amber-100 text-amber-700">Pembayaran</span>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead>
                  <tr class="text-left text-slate-500">
                    <th class="py-2 pr-4">Deskripsi</th>
                    <th class="py-2 pr-4">Jatuh Tempo</th>
                    <th class="py-2 pr-4">Total</th>
                    <th class="py-2 pr-4">Status</th>
                    <th class="py-2 pr-4">Aksi</th>
                  </tr>
                </thead>
                <tbody id="tax-rows" class="divide-y divide-slate-200">
                  <tr><td colspan="5" class="py-3 text-slate-500">Tidak ada tagihan.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card shadow-sm p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-semibold">Transaksi</h3>
                <p class="text-slate-600 text-sm">Riwayat pembayaran terakhir.</p>
              </div>
              <span class="tag bg-emerald-100 text-emerald-700">Selesai</span>
            </div>
            <div class="space-y-4" id="transaction-list">
              <p class="text-slate-500 text-sm">Belum ada transaksi.</p>
            </div>
          </div>
        </div>

        <div id="admin-panel" class="card shadow-sm p-6 hidden">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold">Kendali Admin</h3>
              <p class="text-slate-600 text-sm">Aktifkan/nonaktifkan user dan atur peran.</p>
            </div>
            <span class="tag bg-purple-100 text-purple-700">Admin</span>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-slate-500">
                  <th class="py-2 pr-4">Nama</th>
                  <th class="py-2 pr-4">Email</th>
                  <th class="py-2 pr-4">Peran</th>
                  <th class="py-2 pr-4">Status</th>
                  <th class="py-2 pr-4">Aksi</th>
                </tr>
              </thead>
              <tbody id="user-rows" class="divide-y divide-slate-200">
                <tr><td colspan="5" class="py-3 text-slate-500">Memuat...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <script type="text/javascript">
      (function ($) {
        var state = {
          user: null,
          token: null,
          assets: [],
          taxes: [],
          transactions: [],
          users: []
        };

        function setToken(token) {
          state.token = token;
          if (token) {
            localStorage.setItem('coretax_token', token);
          } else {
            localStorage.removeItem('coretax_token');
          }
        }

        function setUser(user) {
          state.user = user;
          if (user) {
            localStorage.setItem('coretax_user', JSON.stringify(user));
          } else {
            localStorage.removeItem('coretax_user');
          }
        }

        function apiRequest(url, method, data) {
          return $.ajax({
            url: url,
            method: method,
            data: data ? JSON.stringify(data) : null,
            contentType: 'application/json',
            beforeSend: function (xhr) {
              if (state.token) {
                xhr.setRequestHeader('Authorization', 'Bearer ' + state.token);
              }
            }
          });
        }

        function refreshStats() {
          $('#stat-assets').text(state.assets.length);
          var unpaid = state.taxes.filter(function (t) { return t.status === 'unpaid'; }).length;
          $('#stat-unpaid').text(unpaid);
          $('#stat-transactions').text(state.transactions.length);
        }

        function renderAssets() {
          var $rows = $('#asset-rows');
          $rows.empty();

          if (!state.assets.length) {
            $rows.append('<tr><td colspan="4" class="py-3 text-slate-500">Belum ada aset.</td></tr>');
            return;
          }

          state.assets.forEach(function (asset) {
            var value = new Intl.NumberFormat('id-ID').format(asset.estimatedValue || 0);
            var row = '' +
              '<tr>' +
              '<td class="py-2 pr-3">' + escapeHtml(asset.name) + '</td>' +
              '<td class="py-2 pr-3 text-slate-600">' + escapeHtml(asset.registrationNumber) + '</td>' +
              '<td class="py-2 pr-3">Rp ' + value + '</td>' +
              '<td class="py-2 pr-3 space-x-2">' +
              '<button class="text-blue-600 hover:underline text-sm" data-edit="' + asset.id + '">Edit</button>' +
              '<button class="text-red-600 hover:underline text-sm" data-delete="' + asset.id + '">Hapus</button>' +
              '</td>' +
              '</tr>';
            $rows.append(row);
          });
        }

        function renderTaxes() {
          var $rows = $('#tax-rows');
          $rows.empty();

          if (!state.taxes.length) {
            $rows.append('<tr><td colspan="5" class="py-3 text-slate-500">Tidak ada tagihan.</td></tr>');
            return;
          }

          state.taxes.forEach(function (tax) {
            var badge = tax.status === 'paid'
              ? '<span class="tag bg-emerald-100 text-emerald-700">Lunas</span>'
              : '<span class="tag bg-amber-100 text-amber-700">Belum Lunas</span>';

            var payButton = tax.status === 'unpaid'
              ? '<button class="text-blue-600 hover:underline text-sm" data-pay="' + tax.id + '">Bayar</button>'
              : '';

            var row = '' +
              '<tr>' +
              '<td class="py-2 pr-3">' + escapeHtml(tax.description || '-') + '</td>' +
              '<td class="py-2 pr-3 text-slate-600">' + (tax.dueDate || '-') + '</td>' +
              '<td class="py-2 pr-3">Rp ' + new Intl.NumberFormat('id-ID').format(tax.amount || 0) + '</td>' +
              '<td class="py-2 pr-3">' + badge + '</td>' +
              '<td class="py-2 pr-3">' + payButton + '</td>' +
              '</tr>';
            $rows.append(row);
          });
        }

        function renderTransactions() {
          var $list = $('#transaction-list');
          $list.empty();

          if (!state.transactions.length) {
            $list.append('<p class="text-slate-500 text-sm">Belum ada transaksi.</p>');
            return;
          }

          state.transactions.forEach(function (txn) {
            var template = '' +
              '<div class="border border-slate-200 rounded-lg p-3">' +
              '<div class="flex items-center justify-between">' +
              '<p class="font-semibold text-sm">Pembayaran ' + escapeHtml(txn.taxId || '-') + '</p>' +
              '<span class="tag bg-emerald-100 text-emerald-700">Selesai</span>' +
              '</div>' +
              '<p class="text-slate-600 text-sm">Rp ' + new Intl.NumberFormat('id-ID').format(txn.amount || 0) + '</p>' +
              '<p class="text-xs text-slate-500">Metode: ' + escapeHtml(txn.method || '-') + ' • ' + (txn.createdAt || '-') + '</p>' +
              '</div>';
            $list.append(template);
          });
        }

        function renderUsers() {
          var $rows = $('#user-rows');
          $rows.empty();

          if (!state.users.length) {
            $rows.append('<tr><td colspan="5" class="py-3 text-slate-500">Tidak ada user.</td></tr>');
            return;
          }

          state.users.forEach(function (u) {
            var status = u.isActive ? 'Aktif' : 'Nonaktif';
            var toggleLabel = u.isActive ? 'Nonaktifkan' : 'Aktifkan';
            var row = '' +
              '<tr>' +
              '<td class="py-2 pr-3">' + escapeHtml(u.name || '-') + '</td>' +
              '<td class="py-2 pr-3 text-slate-600">' + escapeHtml(u.email || '-') + '</td>' +
              '<td class="py-2 pr-3">' + escapeHtml(u.role || '-') + '</td>' +
              '<td class="py-2 pr-3">' + status + '</td>' +
              '<td class="py-2 pr-3 space-x-2">' +
              '<button class="text-blue-600 hover:underline text-sm" data-role="' + u.id + '">Ubah Peran</button>' +
              '<button class="text-slate-700 hover:underline text-sm" data-toggle="' + u.id + '">' + toggleLabel + '</button>' +
              '</td>' +
              '</tr>';
            $rows.append(row);
          });
        }

        function escapeHtml(str) {
          return (str || '').toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }

        function setAuthTab(tab) {
          var showLogin = tab === 'login';
          $('#login-panel').toggleClass('hidden', !showLogin);
          $('#register-panel').toggleClass('hidden', showLogin);
          $('.auth-tab').each(function () {
            var $btn = $(this);
            var isActive = $btn.data('tab') === tab;
            $btn.toggleClass('active', isActive);
            $btn.toggleClass('text-slate-900', isActive);
            $btn.toggleClass('text-slate-500', !isActive);
          });
        }

        function resetAssetForm() {
          $('#asset-id').val('');
          $('#asset-form')[0].reset();
          $('#asset-message').addClass('hidden');
        }

        function loadAll() {
          $.when(
            apiRequest('api/assets.php', 'GET'),
            apiRequest('api/taxes.php', 'GET'),
            apiRequest('api/transactions.php', 'GET')
          ).done(function (assetsRes, taxesRes, txnRes) {
            state.assets = assetsRes[0].items || [];
            state.taxes = taxesRes[0].items || [];
            state.transactions = txnRes[0].items || [];
            renderAssets();
            renderTaxes();
            renderTransactions();
            refreshStats();
            if (state.user && state.user.role === 'admin') {
              loadUsers();
            }
          }).fail(showAuthError);
        }

        function loadUsers() {
          apiRequest('api/users.php', 'GET').done(function (res) {
            state.users = res.items || [];
            renderUsers();
          });
        }

        function showAuthError(xhr) {
          if (xhr && xhr.status === 401) {
            setToken(null);
            setUser(null);
            toggleApp(false);
          }
        }

        function toggleApp(isLoggedIn) {
          if (isLoggedIn) {
            $('#auth-section').addClass('hidden');
            $('#app-section').removeClass('hidden');
            $('#user-pill').removeClass('hidden').addClass('flex');
            $('#user-name').text(state.user.name || state.user.username);
            $('#user-role').text(state.user.role);
            if (state.user.role === 'admin') {
              $('#admin-panel').removeClass('hidden');
            } else {
              $('#admin-panel').addClass('hidden');
            }
            loadAll();
          } else {
            $('#auth-section').removeClass('hidden');
            $('#app-section').addClass('hidden');
            $('#user-pill').addClass('hidden').removeClass('flex');
          }
        }

        $('#login-form').on('submit', function (e) {
          e.preventDefault();
          var data = {
            identifier: $(this).find('input[name="identifier"]').val(),
            password: $(this).find('input[name="password"]').val()
          };

          apiRequest('api/auth.php?action=login', 'POST', data).done(function (res) {
            $('#login-error').addClass('hidden');
            setToken(res.token);
            setUser(res.user);
            toggleApp(true);
          }).fail(function (xhr) {
            var msg = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Login gagal';
            $('#login-error').text(msg).removeClass('hidden');
          });
        });

        $('#register-form').on('submit', function (e) {
          e.preventDefault();
          var $form = $(this);
          var getVal = function (selector) {
            return ($form.find(selector).val() || '').toString().trim();
          };
          var nameVal = getVal('input[name="name"]');
          var emailVal = getVal('input[name="email"]');
          var usernameVal = getVal('input[name="username"]');
          var passwordVal = getVal('input[name="password"]');
          var confirmPassword = getVal('input[name="confirmPassword"]');
          var nikVal = getVal('input[name="nik"]');
          var dobVal = getVal('input[name="dateOfBirth"]');

          var emailRegex = /^\S+@\S+\.\S+$/;
          var nikRegex = /^\d{16}$/;

          if (!nameVal) {
            $('#register-error').text('Nama harus diisi').removeClass('hidden');
            return;
          }
          if (!emailRegex.test(emailVal)) {
            $('#register-error').text('Format email tidak valid').removeClass('hidden');
            return;
          }
          if (!usernameVal) {
            $('#register-error').text('Username harus diisi').removeClass('hidden');
            return;
          }
          if (!passwordVal || passwordVal.length < 6) {
            $('#register-error').text('Password minimal 6 karakter').removeClass('hidden');
            return;
          }
          if (passwordVal !== confirmPassword) {
            $('#register-error').text('Password dan konfirmasi harus sama').removeClass('hidden');
            return;
          }
          if (!nikRegex.test(nikVal)) {
            $('#register-error').text('NIK harus 16 digit angka').removeClass('hidden');
            return;
          }
          if (!dobVal) {
            $('#register-error').text('Tanggal lahir harus diisi').removeClass('hidden');
            return;
          }

          $('#register-error').addClass('hidden');
          var data = {
            name: nameVal,
            email: emailVal,
            username: usernameVal,
            password: passwordVal,
            confirmPassword: confirmPassword,
            nik: nikVal,
            dateOfBirth: dobVal,
            address: getVal('input[name="address"]')
          };

          apiRequest('api/auth.php?action=register', 'POST', data).done(function (res) {
            $('#register-error').addClass('hidden');
            setToken(res.token);
            setUser(res.user);
            toggleApp(true);
          }).fail(function (xhr) {
            var msg = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : 'Registrasi gagal';
            $('#register-error').text(msg).removeClass('hidden');
          });
        });

        $('#logout-btn').on('click', function () {
          apiRequest('api/auth.php?action=logout', 'POST').always(function () {
            setToken(null);
            setUser(null);
            toggleApp(false);
          });
        });

        $('#asset-reset').on('click', function () {
          resetAssetForm();
        });

        $('#asset-form').on('submit', function (e) {
          e.preventDefault();
          var payload = {
            id: $('#asset-id').val(),
            name: $(this).find('input[name="name"]').val(),
            type: $(this).find('select[name="type"]').val(),
            assetCategory: $(this).find('select[name="assetCategory"]').val(),
            registrationNumber: $(this).find('input[name="registrationNumber"]').val(),
            estimatedValue: parseFloat($(this).find('input[name="estimatedValue"]').val() || '0'),
            location: $(this).find('input[name="location"]').val()
          };

          var method = payload.id ? 'PUT' : 'POST';
          var url = 'api/assets.php' + (payload.id ? ('?id=' + payload.id) : '');

          apiRequest(url, method, payload).done(function () {
            $('#asset-message').text('Aset tersimpan dan tagihan pajak diperbarui.').removeClass('hidden');
            resetAssetForm();
            loadAll();
          });
        });

        $('#asset-rows').on('click', 'button[data-delete]', function () {
          var id = $(this).data('delete');
          if (!confirm('Hapus aset ini?')) {
            return;
          }
          apiRequest('api/assets.php?id=' + id, 'DELETE').done(function () {
            loadAll();
          });
        });

        $('#asset-rows').on('click', 'button[data-edit]', function () {
          var id = $(this).data('edit');
          var asset = state.assets.find(function (a) { return a.id === id; });
          if (!asset) { return; }
          $('#asset-id').val(asset.id);
          $('#asset-form').find('input[name="name"]').val(asset.name);
          $('#asset-form').find('select[name="type"]').val(asset.type);
          $('#asset-form').find('select[name="assetCategory"]').val(asset.assetCategory);
          $('#asset-form').find('input[name="registrationNumber"]').val(asset.registrationNumber);
          $('#asset-form').find('input[name="estimatedValue"]').val(asset.estimatedValue);
          $('#asset-form').find('input[name="location"]').val(asset.location);
          $('#asset-message').addClass('hidden');
        });

        $('#tax-rows').on('click', 'button[data-pay]', function () {
          var id = $(this).data('pay');
          apiRequest('api/taxes.php?action=pay', 'POST', { taxId: id, method: 'manual' }).done(function () {
            loadAll();
          });
        });

        $('#user-rows').on('click', 'button[data-toggle]', function () {
          var id = $(this).data('toggle');
          var user = state.users.find(function (u) { return u.id === id; });
          if (!user) { return; }
          apiRequest('api/users.php', 'PATCH', { id: id, isActive: !user.isActive }).done(function (res) {
            state.users = res.items || [];
            renderUsers();
          });
        });

        $('#user-rows').on('click', 'button[data-role]', function () {
          var id = $(this).data('role');
          var user = state.users.find(function (u) { return u.id === id; });
          if (!user) { return; }
          var newRole = user.role === 'admin' ? 'user' : 'admin';
          apiRequest('api/users.php', 'PATCH', { id: id, role: newRole }).done(function (res) {
            state.users = res.items || [];
            renderUsers();
          });
        });

        $('.auth-tab').on('click', function () {
          setAuthTab($(this).data('tab'));
        });

        // force NIK numeric only on input
        $('#register-form').on('input', 'input[name="nik"]', function () {
          var val = $(this).val().toString().replace(/\D/g, '').slice(0, 16);
          $(this).val(val);
          this.setCustomValidity('');
        });

        // custom validity message for NIK pattern
        $('#register-form').on('invalid', 'input[name="nik"]', function () {
          this.setCustomValidity('NIK harus 16 digit angka');
        });

        function bootstrap() {
          var token = localStorage.getItem('coretax_token');
          var savedUser = localStorage.getItem('coretax_user');
          setAuthTab('login');
          if (token && savedUser) {
            try {
              state.user = JSON.parse(savedUser);
              setToken(token);
              toggleApp(true);
              return;
            } catch (e) {
              setToken(null);
              setUser(null);
            }
          }
          toggleApp(false);
        }

        bootstrap();
      })(window.jQuery);
    </script>
  </body>
</html>
