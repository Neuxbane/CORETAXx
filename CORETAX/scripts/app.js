const state = {
  authPage: 'login', // login | register | forgot-password | 2fa
  needs2FA: false,
  pendingUser: null,
  currentUser: null,
  twoFactorCode: '',
  userPage: 'dashboard',
  adminPage: 'dashboard',
  sidebarOpen: false,
  authWarnings: {
    location: '',
    error: '',
  },
};

function h(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function setHTML(target, html) {
  if (!target) return;
  if (window.$ && $.parseHTML) {
    $(target).empty().append($.parseHTML(html));
  } else {
    target.innerHTML = html;
  }
}

async function boot() {
  if (window.sync && window.sync.init) {
    window.sync.init();
  }

  await window.storage.ensureDefaults();
  window.taxSync.syncTaxRecordsWithAssets();

  const sessionId = window.storage.getSession();
  if (sessionId) {
    if (window.sync && window.sync.pullSnapshot) {
      await window.sync.pullSnapshot(sessionId);
    }

    const users = window.storage.getUsers();
    const user = users.find((u) => u.id === sessionId);
    if (user && user.isActive) {
      state.currentUser = user;
    } else {
      window.storage.clearSession();
    }
  }

  render();
}

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  window.utils.clearChildren(app);

  if (!state.currentUser) {
    renderAuth(app);
    return;
  }

  if (state.currentUser.role === 'admin') {
    renderAdminLayout(app);
  } else {
    renderUserLayout(app);
  }
}

/* USER HELPERS */
function userAssets() {
  return window.storage.getAssets().filter((a) => a.userId === state.currentUser.id);
}

function userTaxes() {
  window.taxSync.syncTaxRecordsWithAssets();
  return window.taxSync.getTaxRecordsWithAssetData().filter((t) => t.userId === state.currentUser.id);
}

function userTransactions() {
  return window.storage.getTransactions().filter((t) => t.userId === state.currentUser.id);
}

function renderUserDashboard() {
  const assets = userAssets();
  const taxes = userTaxes();

  const totalTaxDue = assets.reduce((sum, a) => sum + (a.taxAmount || 0), 0);
  const today = new Date();
  const upcoming = taxes
    .filter((t) => t.status === 'unpaid')
    .filter((t) => {
      const due = new Date(t.dueDate);
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 3);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Dashboard</h1>
      <p class="text-gray-600">Selamat datang, ${state.currentUser.name}!</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      ${statCard(iconCar(), 'Total Aset', assets.length)}
      ${statCard(iconMoney(), 'Total Pajak Terutang', window.utils.formatCurrency(totalTaxDue))}
      ${statCard(iconAlert(), 'Jatuh Tempo (30 Hari)', upcoming.length)}
    </div>
    <div id="location-status"></div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-gray-900 font-semibold">Pajak Jatuh Tempo Terdekat</h2>
      </div>
      <div class="p-6" id="upcoming-taxes"></div>
    </div>
  `;

  renderLocationStatus(wrap.querySelector('#location-status'));
  renderUpcomingList(wrap.querySelector('#upcoming-taxes'), upcoming);
  return wrap;
}

function inputField(label, id, placeholder, value) {
  return `
    <div>
      <label class="block text-gray-700 mb-2">${label}</label>
      <input id="${id}" type="text" value="${h(value || '')}" placeholder="${h(placeholder || '')}" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  `;
}

function numberField(label, id, value) {
  return `
    <div>
      <label class="block text-gray-700 mb-2">${label}</label>
      <input id="${id}" type="number" value="${h(value || '')}" min="0" step="0.01" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  `;
}

function dateField(label, id, value) {
  return `
    <div>
      <label class="block text-gray-700 mb-2">${label}</label>
      <input id="${id}" type="date" value="${h(value || '')}" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  `;
}

function selectField(label, field, options, selected) {
  return `
    <div>
      <label class="block text-gray-700 mb-2">${label}</label>
      <select data-select="${field}" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        ${options
          .map(
            ([value, label]) => {
              const selectedAttr = selected === value ? ' selected="selected"' : '';
              return `<option value="${h(value)}"${selectedAttr}>${h(label)}</option>`;
            }
          )
          .join('')}
      </select>
    </div>
  `;
}

/* ADMIN LAYOUT */
function renderAdminLayout(container) {
  const wrap = document.createElement('div');
  wrap.className = 'min-h-screen bg-gray-50 flex flex-col';
  wrap.innerHTML = `
    <div class="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <h1 class="text-gray-900 font-semibold">Admin Panel</h1>
      <button id="admin-menu-toggle" class="p-2 hover:bg-gray-100 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
    <div class="flex flex-1">
      <aside id="admin-sidebar" class="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ease-in-out -translate-x-full lg:translate-x-0">
        ${renderAdminSidebarContent()}
      </aside>
      <div id="admin-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-30 hidden lg:hidden"></div>
      <main class="flex-1 lg:ml-64">
        <div class="p-4 lg:p-8" id="admin-page-container"></div>
      </main>
    </div>
  `;
  container.appendChild(wrap);

  const toggle = wrap.querySelector('#admin-menu-toggle');
  const sidebar = wrap.querySelector('#admin-sidebar');
  const overlay = wrap.querySelector('#admin-overlay');
  const links = sidebar.querySelectorAll('[data-admin-page]');
  const logoutBtn = sidebar.querySelector('#admin-logout');
  const closeBtn = sidebar.querySelector('#admin-close');
  const pageContainer = wrap.querySelector('#admin-page-container');

  function updateSidebarActive() {
    links.forEach((link) => {
      if (link.getAttribute('data-admin-page') === state.adminPage) {
        link.classList.add('bg-red-50', 'text-red-600');
      } else {
        link.classList.remove('bg-red-50', 'text-red-600');
      }
    });
  }

  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  });
  overlay.addEventListener('click', closeSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);

  links.forEach((link) => {
    link.addEventListener('click', () => {
      state.adminPage = link.getAttribute('data-admin-page');
      updateSidebarActive();
      renderAdminPage(pageContainer);
      closeSidebar();
    });
  });

  logoutBtn.addEventListener('click', () => {
    window.storage.clearSession();
    state.currentUser = null;
    state.authPage = 'login';
    render();
  });

  updateSidebarActive();
  renderAdminPage(pageContainer);
}

function renderAdminSidebarContent() {
  const user = state.currentUser || {};
  return `
    <div class="flex flex-col h-full">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h1 class="text-gray-900 font-semibold">Admin Panel</h1>
          <button id="admin-close" class="lg:hidden p-1 hover:bg-gray-100 rounded">
            ${iconClose('w-5 h-5')}
          </button>
        </div>
        <div class="mt-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              ${iconShield('w-5 h-5 text-red-600')}
            </div>
            <div>
              <p class="text-gray-900 font-semibold">${user.name || ''}</p>
              <p class="text-gray-500 text-sm">Administrator</p>
            </div>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-4 space-y-1">
        ${[
          { id: 'dashboard', label: 'Dashboard', icon: iconDashboard() },
          { id: 'users', label: 'Manajemen Pengguna', icon: iconUsers() },
          { id: 'assets', label: 'Manajemen Aset', icon: iconCar() },
          { id: 'transactions', label: 'Transaksi Pajak', icon: iconReceipt() },
          { id: 'location', label: 'Peta Lokasi User', icon: iconMapPin() },
        ]
          .map(
            (item) => `
          <button data-admin-page="${item.id}" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left">
            ${item.icon}
            <span>${item.label}</span>
          </button>`
          )
          .join('')}
      </nav>
      <div class="p-4 border-t border-gray-200">
        <button id="admin-logout" class="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          ${iconLogout()}
          <span>Logout</span>
        </button>
      </div>
    </div>
  `;
}

function renderAdminPage(container) {
  if (!container) return;
  container.innerHTML = '';
  switch (state.adminPage) {
    case 'dashboard':
      container.appendChild(renderAdminDashboard());
      break;
    case 'users':
      container.appendChild(renderAdminUsers());
      break;
    case 'assets':
      container.appendChild(renderAdminAssets());
      break;
    case 'transactions':
      container.appendChild(renderAdminTransactions());
      break;
    case 'location':
      container.appendChild(renderAdminLocation());
      break;
    default:
      container.appendChild(renderAdminDashboard());
  }
}

function renderAdminDashboard() {
  const users = window.storage.getUsers();
  const assets = window.storage.getAssets();
  const taxes = window.storage.getTaxes();
  const transactions = window.storage.getTransactions();

  const totalUsers = users.filter((u) => u.role === 'user').length;
  const activeUsers = users.filter((u) => u.role === 'user' && u.isActive).length;
  const totalAssets = assets.length;
  const totalRevenue = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const unpaidTaxes = taxes.filter((t) => t.status === 'unpaid').length;
  const recentTransactions = transactions.filter((t) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(t.paymentDate) >= sevenDaysAgo;
  }).length;

  const activities = [...transactions]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5)
    .map((t) => ({
      ...t,
      userName: (users.find((u) => u.id === t.userId) || {}).name || 'Unknown User',
    }));

  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Dashboard Admin</h1>
      <p class="text-gray-600">Ringkasan sistem dan aktivitas terkini</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${statCard(iconUsers('w-6 h-6 text-blue-600'), 'Total Pengguna', `${totalUsers}<br/><span class="text-green-600">${activeUsers} aktif</span>`)}
      ${statCard(iconCar('w-6 h-6 text-purple-600'), 'Total Aset Terdaftar', totalAssets)}
      ${statCard(iconMoney('w-6 h-6 text-green-600'), 'Total Pendapatan', window.utils.formatCurrency(totalRevenue))}
      ${statCard(iconActivity('w-6 h-6 text-orange-600'), 'Pajak Belum Dibayar', unpaidTaxes)}
      ${statCard(iconDashboard('w-6 h-6 text-cyan-600'), 'Transaksi (7 Hari)', recentTransactions)}
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-gray-900 font-semibold">Aktivitas Terkini</h2>
      </div>
      <div class="p-6">
        ${
          activities.length === 0
            ? `<div class="text-center py-8">${iconActivity('w-12 h-12 text-gray-300 mx-auto mb-2')}<p class="text-gray-500">Belum ada aktivitas</p></div>`
            : `<div class="space-y-4">
            ${activities
              .map(
                (a) => `
              <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">${iconMoney('w-5 h-5 text-green-600')}</div>
                <div class="flex-1">
                  <p class="text-gray-900"><span>${h(a.userName)}</span> membayar pajak</p>
                  <p class="text-gray-600">${h(a.assetName)}</p>
                  <p class="text-gray-900 mt-1">${window.utils.formatCurrency(a.amount)}</p>
                  <p class="text-gray-500 mt-1">${window.utils.formatDateTime(a.paymentDate)}</p>
                </div>
              </div>`
              )
              .join('')}
          </div>`
        }
      </div>
    </div>
  `;
  return wrap;
}

function renderAdminUsers() {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Manajemen Pengguna</h1>
      <p class="text-gray-600">Kelola pengguna sistem</p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="relative">
        ${iconSearch('w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2')}
        <input type="text" id="admin-user-search" placeholder="Cari pengguna..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
    </div>
    <div id="admin-user-table"></div>
    <div id="admin-user-modal" class="hidden"></div>
  `;

  const searchInput = wrap.querySelector('#admin-user-search');
  const tableContainer = wrap.querySelector('#admin-user-table');
  const modalContainer = wrap.querySelector('#admin-user-modal');

  function renderTable() {
    const term = (searchInput.value || '').toLowerCase();
    const users = window.storage
      .getUsers()
      .filter((u) => u.role === 'user')
      .filter(
        (u) =>
          !term ||
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.nik || '').includes(term)
      );

    if (users.length === 0) {
      tableContainer.innerHTML = `<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Tidak ada pengguna</div>`;
      return;
    }

    tableContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-gray-700">Nama</th>
              <th class="px-6 py-3 text-left text-gray-700">Email</th>
              <th class="px-6 py-3 text-left text-gray-700">NIK</th>
              <th class="px-6 py-3 text-left text-gray-700">Tanggal Daftar</th>
              <th class="px-6 py-3 text-left text-gray-700">Status</th>
              <th class="px-6 py-3 text-left text-gray-700">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${users
              .map((u) => {
                const created = u.createdAt ? window.utils.formatDate(u.createdAt) : '-';
                return `
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4"><p class="text-gray-900 font-semibold">${h(u.name)}</p><p class="text-gray-500">@${h(u.username)}</p></td>
                <td class="px-6 py-4">${h(u.email)}</td>
                <td class="px-6 py-4 font-mono">${h(u.nik)}</td>
                <td class="px-6 py-4 text-gray-600">${created}</td>
                <td class="px-6 py-4">
                  <span class="px-3 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${u.isActive ? 'Aktif' : 'Non-Aktif'}</span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex gap-2">
                    <button data-detail="${u.id}" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail">${iconEye('w-4 h-4')}</button>
                    <button data-toggle="${u.id}" class="p-2 ${u.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} rounded-lg transition-colors" title="${u.isActive ? 'Nonaktifkan' : 'Aktifkan'}">${u.isActive ? iconUserX('w-4 h-4') : iconUserCheck('w-4 h-4')}</button>
                  </div>
                </td>
              </tr>
            `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;

    tableContainer.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-toggle');
        const users = window.storage.getUsers();
        const idx = users.findIndex((u) => u.id === id);
        if (idx !== -1) {
          users[idx].isActive = !users[idx].isActive;
          window.storage.setUsers(users);
          renderTable();
        }
      });
    });

    tableContainer.querySelectorAll('[data-detail]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-detail');
        const user = window.storage.getUsers().find((u) => u.id === id);
        if (user) openUserModal(user);
      });
    });
  }

  function openUserModal(user) {
    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-gray-900 font-semibold">Detail Pengguna</h2>
          </div>
          <div class="p-6 space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div><p class="text-gray-600">Nama Lengkap</p><p class="text-gray-900 font-semibold">${h(user.name)}</p></div>
              <div><p class="text-gray-600">Username</p><p class="text-gray-900">${h(user.username)}</p></div>
              <div><p class="text-gray-600">Email</p><p class="text-gray-900">${h(user.email)}</p></div>
              <div><p class="text-gray-600">NIK</p><p class="text-gray-900">${h(user.nik)}</p></div>
              <div><p class="text-gray-600">Tanggal Lahir</p><p class="text-gray-900">${window.utils.formatDate(user.dateOfBirth)}</p></div>
              <div><p class="text-gray-600">Telepon</p><p class="text-gray-900">${h(user.phone || '-')}</p></div>
              <div class="col-span-2"><p class="text-gray-600">Alamat</p><p class="text-gray-900">${h(user.address || '-')}</p></div>
            </div>
          </div>
          <div class="p-6 border-t border-gray-200">
            <button id="user-modal-close" class="w-full px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg transition-colors">Tutup</button>
          </div>
        </div>
      </div>
    `;
    modalContainer.classList.remove('hidden');
    modalContainer.querySelector('#user-modal-close').addEventListener('click', () => {
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
    });
  }

  searchInput.addEventListener('input', renderTable);
  renderTable();
  return wrap;
}

function renderAdminAssets() {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Manajemen Aset</h1>
      <p class="text-gray-600">Kelola semua aset yang terdaftar</p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="relative">
        ${iconSearch('w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2')}
        <input type="text" id="admin-asset-search" placeholder="Cari aset..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
      </div>
    </div>
    <div id="admin-asset-list"></div>
  `;

  const searchInput = wrap.querySelector('#admin-asset-search');
  const listContainer = wrap.querySelector('#admin-asset-list');
  const users = window.storage.getUsers();

  function getOwnerName(id) {
    const u = users.find((x) => x.id === id);
    return u ? u.name : 'Unknown';
  }

  function renderList() {
    const term = (searchInput.value || '').toLowerCase();
    const assets = window.storage
      .getAssets()
      .filter(
        (a) =>
          !term ||
          (a.assetName || '').toLowerCase().includes(term) ||
          (a.registrationNumber || '').toLowerCase().includes(term)
      );

    if (assets.length === 0) {
      listContainer.innerHTML = `<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">${term ? 'Tidak ada aset yang ditemukan' : 'Belum ada aset'}</div>`;
      return;
    }

    try {
      setHTML(listContainer, `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${assets
            .map((asset) => {
              const badge = asset.assetType
                ? `<span class="px-3 py-1 rounded-full text-white text-sm ${
                    asset.assetType === 'LANCAR'
                      ? 'bg-green-500'
                      : asset.assetType === 'SEMI_LANCAR'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }">${h((asset.assetType || '').replace(/_/g, ' '))}</span>`
                : '';
              const taxInfo =
                asset.taxAmount > 0
                  ? `<div class="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm flex justify-between"><span class="text-gray-700">Pajak (${(asset.taxRate || 0).toFixed(2)}%):</span><span class="text-blue-600">${window.utils.formatCurrency(asset.taxAmount)}/tahun</span></div>`
                  : '';
              const coords =
                (asset.latitude || asset.longitude) && (asset.nonCurrentAssetType === 'TANAH' || asset.nonCurrentAssetType === 'BANGUNAN')
                  ? `<div class="flex items-center gap-1 text-gray-600 text-sm mb-2">${iconMapPin('w-4 h-4')}<span>${Number(asset.latitude).toFixed(6)}, ${Number(asset.longitude).toFixed(6)}</span></div>`
                  : '';
              return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">${iconForAssetType(asset)}</div>
                    ${badge}
                  </div>
                  <div class="mb-2"><span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">${h(asset.nonCurrentAssetType || asset.assetType || 'Aset')}</span></div>
                  <h3 class="text-gray-900 font-semibold mb-1">${h(asset.assetName || asset.name)}</h3>
                  <p class="text-gray-600 mb-1">${h(asset.registrationNumber || '')}</p>
                  <p class="text-gray-900 font-semibold mb-2">${window.utils.formatCurrency(asset.acquisitionValue || 0)}</p>
                  ${taxInfo}
                  <p class="text-gray-600 text-sm mb-2">Pemilik: <span class="text-gray-900 font-semibold">${h(getOwnerName(asset.userId))}</span></p>
                  ${coords}
                  <p class="text-gray-500 text-sm">Diperoleh: ${window.utils.formatDate(asset.acquisitionDate)}</p>
                </div>
              `;
            })
            .join('')}
        </div>
      `);
    } catch (err) {
      console.error('Render admin asset list error', err);
      listContainer.textContent = 'Gagal merender daftar aset.';
      return;
    }
  }

  searchInput.addEventListener('input', renderList);
  renderList();
  return wrap;
}

function renderAdminTransactions() {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-gray-900 text-xl font-semibold mb-2">Manajemen Transaksi</h1>
        <p class="text-gray-600">Kelola dan lihat semua transaksi pembayaran pajak</p>
      </div>
      <button id="admin-download" class="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
        ${iconDownload('w-5 h-5')}
        Download Laporan
      </button>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          ${iconSearch('w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2')}
          <input type="text" id="admin-trx-search" placeholder="Cari transaksi..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div class="flex items-center gap-2">
          ${iconFilter('w-5 h-5 text-gray-400')}
          <select id="admin-trx-date" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">Semua Waktu</option>
            <option value="today">Hari Ini</option>
            <option value="week">7 Hari Terakhir</option>
            <option value="month">30 Hari Terakhir</option>
          </select>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p class="text-gray-600">Total Transaksi</p>
        <p class="text-gray-900 font-semibold" id="admin-trx-count">0</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p class="text-gray-600">Total Pendapatan</p>
        <p class="text-gray-900 font-semibold" id="admin-trx-revenue">Rp0</p>
      </div>
    </div>
    <div id="admin-trx-table"></div>
  `;

  const searchInput = wrap.querySelector('#admin-trx-search');
  const dateSelect = wrap.querySelector('#admin-trx-date');
  const tableContainer = wrap.querySelector('#admin-trx-table');
  const countEl = wrap.querySelector('#admin-trx-count');
  const revEl = wrap.querySelector('#admin-trx-revenue');
  const downloadBtn = wrap.querySelector('#admin-download');
  const users = window.storage.getUsers();

  function getUserName(id) {
    const u = users.find((x) => x.id === id);
    return u ? u.name : 'Unknown';
  }

  function filterTransactions() {
    const term = (searchInput.value || '').toLowerCase();
    const dateFilter = dateSelect.value;
    let list = window.storage.getTransactions();
    const now = new Date();
    if (dateFilter === 'today') {
      list = list.filter((t) => new Date(t.paymentDate).toDateString() === now.toDateString());
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      list = list.filter((t) => new Date(t.paymentDate) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      list = list.filter((t) => new Date(t.paymentDate) >= monthAgo);
    }
    if (term) {
      list = list.filter(
        (t) =>
          (t.assetName || '').toLowerCase().includes(term) ||
          (t.taxNumber || '').toLowerCase().includes(term) ||
          getUserName(t.userId).toLowerCase().includes(term)
      );
    }
    list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
    return list;
  }

  function renderTable() {
    const list = filterTransactions();
    countEl.textContent = list.length;
    revEl.textContent = window.utils.formatCurrency(list.reduce((sum, t) => sum + (t.amount || 0), 0));

    if (list.length === 0) {
      tableContainer.innerHTML = `<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">Tidak ada transaksi yang ditemukan</div>`;
      return;
    }

    tableContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-200">
            <tr>
              <th class="px-6 py-3 text-left text-gray-700">Tanggal</th>
              <th class="px-6 py-3 text-left text-gray-700">Pengguna</th>
              <th class="px-6 py-3 text-left text-gray-700">Aset</th>
              <th class="px-6 py-3 text-left text-gray-700">No. Pajak</th>
              <th class="px-6 py-3 text-left text-gray-700">Jumlah</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${list
              .map(
                (t) => `
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    ${iconCalendar('w-4 h-4 text-gray-400')}
                    <span class="text-gray-900">${window.utils.formatDateTime(t.paymentDate)}</span>
                  </div>
                </td>
                <td class="px-6 py-4"><p class="text-gray-900">${h(getUserName(t.userId))}</p></td>
                <td class="px-6 py-4"><p class="text-gray-900">${h(t.assetName)}</p></td>
                <td class="px-6 py-4"><p class="text-gray-900 font-mono">${h(t.taxNumber)}</p></td>
                <td class="px-6 py-4"><p class="text-green-600 font-semibold">${window.utils.formatCurrency(t.amount)}</p></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function downloadReport() {
    const list = filterTransactions();
    const reportData = {
      date: new Date().toISOString(),
      filter: dateSelect.value,
      totalTransactions: list.length,
      totalRevenue: list.reduce((sum, t) => sum + (t.amount || 0), 0),
      transactions: list.map((t) => ({
        date: window.utils.formatDateTime(t.paymentDate),
        user: getUserName(t.userId),
        asset: t.assetName,
        taxNumber: t.taxNumber,
        amount: window.utils.formatCurrency(t.amount),
      })),
    };
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const name = `laporan-transaksi-${dateSelect.value}-${Date.now()}.json`;
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', name);
    link.click();
    alert('Laporan berhasil diunduh! (simulasi JSON, bukan PDF)');
  }

  searchInput.addEventListener('input', renderTable);
  dateSelect.addEventListener('change', renderTable);
  downloadBtn.addEventListener('click', downloadReport);
  renderTable();
  return wrap;
}

function renderAdminLocation() {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Peta Lokasi Pengguna</h1>
      <p class="text-gray-600">Tracking lokasi pengguna</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">${iconUsers('w-6 h-6 text-blue-600')}</div>
          <div><p class="text-gray-600">Total User Tracked</p><p class="text-gray-900 font-semibold" id="loc-total">0</p></div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">${iconActivity('w-6 h-6 text-green-600')}</div>
          <div><p class="text-gray-600">Active Users (1h)</p><p class="text-gray-900 font-semibold" id="loc-active">0</p></div>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">${iconMapPin('w-6 h-6 text-purple-600')}</div>
          <div><p class="text-gray-600">Total Locations</p><p class="text-gray-900 font-semibold" id="loc-count">0</p></div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 space-y-4">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div class="flex items-center gap-2 mb-4">${iconUsers('w-5 h-5 text-gray-600')}<h3 class="text-gray-900 font-semibold">Daftar Pengguna</h3></div>
          <div class="flex gap-2 mb-4">
            <button data-filter="all" class="loc-filter flex-1 px-3 py-2 rounded-lg transition-colors bg-blue-600 text-white">Semua</button>
            <button data-filter="user" class="loc-filter flex-1 px-3 py-2 rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200">User</button>
            <button data-filter="admin" class="loc-filter flex-1 px-3 py-2 rounded-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200">Admin</button>
          </div>
          <div id="loc-list" class="space-y-2 max-h-[600px] overflow-y-auto scroll-area"></div>
        </div>
      </div>
      <div class="lg:col-span-2">
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="relative h-[600px] bg-gray-100">
            <iframe id="loc-map" src="" class="w-full h-full border-0" title="Map"></iframe>
            <div class="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button id="loc-zoom-in" class="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors" title="Zoom In">+</button>
              <button id="loc-zoom-out" class="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors" title="Zoom Out">-</button>
              <button id="loc-fit" class="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors" title="Fit All">${iconMap('w-5 h-5 text-gray-700')}</button>
            </div>
            <div class="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-3 text-sm">
              <p class="text-gray-600">Center: <span id="loc-center-text">-</span></p>
              <p class="text-gray-600">Zoom: <span id="loc-zoom-text">12</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div id="loc-detail" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hidden"></div>
  `;

  const filters = wrap.querySelectorAll('.loc-filter');
  const listEl = wrap.querySelector('#loc-list');
  const mapFrame = wrap.querySelector('#loc-map');
  const centerText = wrap.querySelector('#loc-center-text');
  const zoomText = wrap.querySelector('#loc-zoom-text');
  const totalEl = wrap.querySelector('#loc-total');
  const activeEl = wrap.querySelector('#loc-active');
  const countEl = wrap.querySelector('#loc-count');
  const detailEl = wrap.querySelector('#loc-detail');

  let filterState = 'all';
  let zoom = 12;
  let center = { lat: -6.2088, lng: 106.8456 }; // Jakarta default

  function loadLocations() {
    const all = window.geo.getAllUserLocations();
    const filtered = all.filter((loc) => filterState === 'all' || loc.role === filterState);
    totalEl.textContent = all.length;
    activeEl.textContent = all.filter((loc) => {
      const diffMs = new Date().getTime() - new Date(loc.currentLocation.timestamp).getTime();
      return diffMs < 3600000;
    }).length;
    countEl.textContent = all.reduce((sum, loc) => sum + (loc.locationHistory ? loc.locationHistory.length : 0), 0);
    renderList(filtered);
    if (filtered.length > 0) {
      setCenter(filtered[0].currentLocation.latitude, filtered[0].currentLocation.longitude);
    } else {
      updateMap();
    }
  }

  function renderList(list) {
    if (list.length === 0) {
      listEl.innerHTML = `<div class="text-center py-8 text-gray-500">${iconMapPin('w-12 h-12 mx-auto mb-2 text-gray-300')}<p>Belum ada data lokasi</p></div>`;
      return;
    }
    listEl.innerHTML = list
      .map(
        (loc) => `
      <button data-loc="${loc.userId}" class="w-full text-left p-3 rounded-lg border transition-colors ${center.lat === loc.currentLocation.latitude && center.lng === loc.currentLocation.longitude ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}">
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="text-gray-900 font-semibold">${h(loc.fullName)}</p>
            <p class="text-xs text-gray-500">${h(loc.username)}</p>
          </div>
          <span class="px-2 py-1 rounded text-xs ${loc.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">${loc.role}</span>
        </div>
        <div class="flex items-center gap-1 text-xs text-gray-600 mb-1">${iconMapPin('w-3 h-3')}<span>${window.geo.formatLocation(loc.currentLocation.latitude, loc.currentLocation.longitude)}</span></div>
        <div class="flex items-center gap-1 text-xs text-gray-500">${iconClock('w-3 h-3')}<span>${formatTimestamp(loc.currentLocation.timestamp)}</span></div>
        ${loc.currentLocation.action ? `<div class="mt-2"><span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">${loc.currentLocation.action}</span></div>` : ''}
      </button>
    `
      )
      .join('');

    listEl.querySelectorAll('[data-loc]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const loc = window.geo.getAllUserLocations().find((l) => l.userId === btn.getAttribute('data-loc'));
        if (loc) {
          setCenter(loc.currentLocation.latitude, loc.currentLocation.longitude);
          renderDetail(loc);
        }
      });
    });
  }

  function renderDetail(loc) {
    detailEl.classList.remove('hidden');
    detailEl.innerHTML = `
      <h3 class="text-gray-900 font-semibold mb-4">Detail Lokasi: ${loc.fullName}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <p class="text-gray-600 mb-2">Informasi User</p>
          <div class="space-y-1 text-sm">
            <p><strong>Username:</strong> ${h(loc.username)}</p>
            <p><strong>Email:</strong> ${h(loc.email || '-')}</p>
            <p><strong>Role:</strong> <span class="px-2 py-1 rounded ${loc.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}">${loc.role}</span></p>
          </div>
        </div>
        <div>
          <p class="text-gray-600 mb-2">Lokasi Terakhir</p>
          <div class="space-y-1 text-sm">
            <p><strong>Koordinat:</strong> ${window.geo.formatLocation(loc.currentLocation.latitude, loc.currentLocation.longitude)}</p>
            <p><strong>Akurasi:</strong> ${Number(loc.currentLocation.accuracy).toFixed(0)} meter</p>
            <p><strong>Waktu:</strong> ${formatTimestamp(loc.currentLocation.timestamp)}</p>
            ${loc.currentLocation.action ? `<p><strong>Aksi:</strong> ${loc.currentLocation.action}</p>` : ''}
          </div>
        </div>
      </div>
      ${
        loc.locationHistory && loc.locationHistory.length > 0
          ? `<div>
        <p class="text-gray-600 mb-3">Riwayat Lokasi (${loc.locationHistory.length})</p>
        <div class="max-h-60 overflow-y-auto space-y-2">
          ${[...loc.locationHistory]
            .reverse()
            .map(
              (hist) => `
            <div class="p-3 bg-gray-50 rounded-lg text-sm">
              <div class="flex justify-between items-start mb-1">
                <span class="text-gray-900">${window.geo.formatLocation(hist.latitude, hist.longitude)}</span>
                ${hist.action ? `<span class="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">${h(hist.action)}</span>` : ''}
              </div>
              <p class="text-gray-500">${formatTimestamp(hist.timestamp)}</p>
              <p class="text-gray-500">Akurasi: ${Number(hist.accuracy).toFixed(0)}m</p>
            </div>
          `
            )
            .join('')}
        </div>
      </div>`
          : ''
      }
    `;
  }

  function setCenter(lat, lng) {
    center = { lat, lng };
    updateMap();
  }

  function updateMap() {
    const bbox = `${center.lng - 0.1},${center.lat - 0.1},${center.lng + 0.1},${center.lat + 0.1}`;
    mapFrame.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${center.lat},${center.lng}`;
    centerText.textContent = window.geo.formatLocation(center.lat, center.lng);
    zoomText.textContent = zoom;
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.remove('bg-blue-600', 'text-white'));
      btn.classList.add('bg-blue-600', 'text-white');
      filterState = btn.getAttribute('data-filter');
      loadLocations();
    });
  });

  wrap.querySelector('#loc-zoom-in').addEventListener('click', () => {
    zoom = Math.min(zoom + 1, 18);
    updateMap();
  });
  wrap.querySelector('#loc-zoom-out').addEventListener('click', () => {
    zoom = Math.max(zoom - 1, 1);
    updateMap();
  });
  wrap.querySelector('#loc-fit').addEventListener('click', () => {
    const all = window.geo.getAllUserLocations().filter((loc) => filterState === 'all' || loc.role === filterState);
    if (all.length > 0) {
      setCenter(all[0].currentLocation.latitude, all[0].currentLocation.longitude);
    }
  });

  loadLocations();
  return wrap;
}

function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit yang lalu`;
  if (diffHours < 24) return `${diffHours} jam yang lalu`;
  if (diffDays < 7) return `${diffDays} hari yang lalu`;
  return window.utils.formatDateTime(ts);
}

function iconShield(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.5 12l2 2 3-4"/></svg>`;
}
function iconEye(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
}
function iconUserX(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18 8a4 4 0 11-8 0 4 4 0 018 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 14h-1a5 5 0 00-5 5v1"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 17l4 4m0-4l-4 4"/></svg>`;
}
function iconUserCheck(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14a7 7 0 00-7 7h7"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 19l2 2 4-4"/></svg>`;
}
function iconMap(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5-2V6l5 2 6-2 5 2v12l-5-2-6 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 8v12M15 6v12"/></svg>`;
}
function iconClock(cls = 'w-3 h-3') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7v5l3 3"/></svg>`;
}

function iconForAssetType(asset) {
  const cls = 'w-6 h-6 text-blue-600';
  if (asset.nonCurrentAssetType === 'KENDARAAN') return iconCar(cls);
  if (asset.nonCurrentAssetType === 'BANGUNAN' || asset.nonCurrentAssetType === 'TANAH') return iconHome(cls);
  return iconCar(cls);
}

/* ICON HELPERS */
function iconDashboard(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13h8V3H3v10zm10 8h8v-6h-8v6zm0-8h8V3h-8v10zM3 21h8v-6H3v6z"/></svg>`;
}
function iconUser(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`;
}
function iconCar(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13l2-5h14l2 5v5a1 1 0 01-1 1h-1a3 3 0 01-6 0H9a3 3 0 01-6 0H2a1 1 0 01-1-1v-5z"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/></svg>`;
}
function iconReceipt(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 5h10M7 9h10m-8 4h8m-4 4h4"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 3h14v18l-3-2-3 2-3-2-3 2V3z"/></svg>`;
}
function iconSettings(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317l.79-1.733a1 1 0 011.77 0l.79 1.733a1 1 0 00.95.617h1.852a1 1 0 01.98 1.198l-.374 1.77a1 1 0 00.287.95l1.31 1.31a1 1 0 010 1.414l-1.31 1.31a1 1 0 00-.287.95l.374 1.77a1 1 0 01-.98 1.198h-1.852a1 1 0 00-.95.617l-.79 1.733a1 1 0 01-1.77 0l-.79-1.733a1 1 0 00-.95-.617H7.523a1 1 0 01-.98-1.198l.374-1.77a1 1 0 00-.287-.95l-1.31-1.31a1 1 0 010-1.414l1.31-1.31a1 1 0 00.287-.95l-.374-1.77a1 1 0 01.98-1.198h1.852a1 1 0 00.95-.617z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
}
function iconLogout(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12H3m12 0l-4-4m4 4l-4 4m6-10h3v12h-3"/></svg>`;
}
function iconMoney(cls = 'w-6 h-6') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 9h.01M17 15h.01M12 12.5a2 2 0 100-4 2 2 0 000 4z"/></svg>`;
}
function iconAlert(cls = 'w-6 h-6') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 20h13.86A2.07 2.07 0 0021 17.93L12 3 3 17.93A2.07 2.07 0 005.07 20z"/></svg>`;
}
function iconCalendar(cls = 'w-6 h-6') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10m-13 6h16a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
}
function iconInfo(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01"/><circle cx="12" cy="12" r="9"/></svg>`;
}
function iconCheck(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
}
function iconCamera(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8h4l2-3h6l2 3h4v11H3V8z"/><circle cx="12" cy="13" r="3"/></svg>`;
}
function iconId(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M13 11h4M13 14h3"/></svg>`;
}
function iconMail(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4z"/><path stroke-linecap="round" stroke-linejoin="round" d="M4 6l8 6 8-6"/></svg>`;
}
function iconPhone(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h2l2 5-2 1a11 11 0 006 6l1-2 5 2v2a2 2 0 01-2 2h-1C7.82 19 5 16.18 5 12V6a2 2 0 00-2-2z"/></svg>`;
}
function iconMap(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5-2V6l5 2 6-2 5 2v12l-5-2-6 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 8v12M15 6v12"/></svg>`;
}
function iconLock(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 1110 0v4"/></svg>`;
}
function iconSearch(cls = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 16l4 4"/></svg>`;
}
function iconFilter(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M7 12h10M10 18h4"/></svg>`;
}
function iconPlus(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>`;
}
function iconHome(cls = 'w-6 h-6') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l9-9 9 9"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 10v10h14V10"/></svg>`;
}
function iconEdit(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9"/><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
}
function iconTrash(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 4v6m4-6v6M5 7h14l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7z"/></svg>`;
}
function iconBack(cls = 'w-6 h-6') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>`;
}
function iconUpload(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"/></svg>`;
}
function iconMapPin(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 11a4 4 0 100-8 4 4 0 000 8z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-6-5.686-6-11a6 6 0 1112 0c0 5.314-6 11-6 11z"/></svg>`;
}
function iconFile(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3h8l4 4v14H7z"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h8V3"/></svg>`;
}
function iconClose(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
}
function iconCard(cls = 'w-6 h-6') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 15h1m3 0h6"/></svg>`;
}
function iconCalc(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6M9 11h6M9 15h6"/></svg>`;
}
function iconSave(cls = 'w-4 h-4') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5h11l3 3v11a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 5v4h6V5M9 15h6"/></svg>`;
}
function iconUsers(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path stroke-linecap="round" stroke-linejoin="round" d="M23 20v-2a4 4 0 00-3-3.87"/><path stroke-linecap="round" stroke-linejoin="round" d="M16 3.13a4 4 0 010 7.75"/></svg>`;
}
function iconDownload(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"/><path stroke-linecap="round" stroke-linejoin="round" d="M7 11l5 5 5-5"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12"/></svg>`;
}
function iconActivity(cls = 'w-5 h-5') {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M22 12h-4l-3 9-6-18-3 9H2"/></svg>`;
}

function statCard(icon, label, value) {
  return `
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          ${icon}
        </div>
        <div>
          <p class="text-gray-600">${label}</p>
          <p class="text-gray-900 font-semibold">${value}</p>
        </div>
      </div>
    </div>
  `;
}

function renderUpcomingList(container, list) {
  if (!container) return;
  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8">
        ${iconCalendar('w-12 h-12 text-gray-300 mx-auto mb-2')}
        <p class="text-gray-500">Tidak ada pajak yang jatuh tempo dalam 30 hari ke depan</p>
      </div>
    `;
    return;
  }

  const today = new Date();
  container.innerHTML = list
    .map((tax) => {
      const due = new Date(tax.dueDate);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const urgent = daysLeft <= 7;
      return `
        <div class="p-4 rounded-lg border-2 mb-3 ${urgent ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-gray-900 font-semibold">${h(tax.assetName || '-')}</p>
              <p class="text-gray-600">${tax.taxNumber}</p>
            </div>
            <div class="text-right">
              <p class="text-gray-900 font-semibold">${window.utils.formatCurrency(tax.amount)}</p>
              <p class="${urgent ? 'text-red-600' : 'text-orange-600'}">${daysLeft} hari lagi</p>
            </div>
          </div>
          <div class="mt-2 flex items-center gap-2 text-gray-600">
            ${iconCalendar('w-4 h-4')}
            <span>Jatuh tempo: ${window.utils.formatDate(tax.dueDate)}</span>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderLocationStatus(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="bg-gray-50 rounded-lg p-3 flex items-center gap-3 text-sm">
      ${iconInfo('w-5 h-5 text-gray-400')}
      <span class="text-gray-600">Memeriksa status lokasi...</span>
    </div>
  `;

  window.geo
    .getCurrentLocation()
    .then((loc) => {
      container.innerHTML = `
        <div class="bg-green-50 rounded-lg p-3 border border-green-200">
          <div class="flex items-start gap-3">
            ${iconCheck('w-5 h-5 text-green-600 flex-shrink-0 mt-0.5')}
            <div class="flex-1">
              <p class="text-sm text-green-800 mb-1"><strong>Tracking lokasi aktif</strong></p>
              <p class="text-xs text-green-700">Lokasi: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}<br/>Akurasi: ${loc.accuracy.toFixed(0)}m</p>
            </div>
          </div>
        </div>
      `;
    })
    .catch(() => {
      container.innerHTML = `
        <div class="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div class="flex items-start gap-3">
            ${iconAlert('w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5')}
            <div class="flex-1">
              <p class="text-sm text-yellow-800 mb-1"><strong>Tracking lokasi nonaktif</strong></p>
              <p class="text-xs text-yellow-700 mb-2">Aktifkan lokasi untuk fitur tracking yang lebih baik.</p>
              <button id="location-retry" class="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors">Aktifkan Lokasi</button>
            </div>
          </div>
        </div>
      `;
      const btn = container.querySelector('#location-retry');
      if (btn) {
        btn.addEventListener('click', () => renderLocationStatus(container));
      }
    });
}

function renderUserProfile() {
  const user = state.currentUser;
  const wrap = document.createElement('div');
  wrap.className = 'max-w-4xl mx-auto space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Data Diri</h1>
      <p class="text-gray-600">Kelola informasi profil Anda</p>
    </div>
    <div id="profile-success" class="hidden bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
      ${iconCheck('w-5 h-5 text-green-600')}
      <span class="text-green-700">Profil berhasil diperbarui!</span>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-gray-900 font-semibold mb-4">Foto Profil</h2>
        <div class="flex items-center gap-6">
          <div class="relative">
            <div id="profile-photo" class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center overflow-hidden">
              ${user.profilePhoto ? `<img src="${h(user.profilePhoto)}" class="w-full h-full object-cover" alt="Profile" />` : iconUser('w-12 h-12 text-blue-600')}
            </div>
            <label class="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
              ${iconCamera('w-4 h-4 text-white')}
              <input type="file" id="photo-upload" accept="image/*" class="hidden" />
            </label>
          </div>
          <div>
            <p class="text-gray-900 font-semibold">${user.name}</p>
            <p class="text-gray-600 text-sm">Klik ikon kamera untuk mengganti foto</p>
          </div>
        </div>
      </div>
      <div class="p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${profileInput('Nama Lengkap', 'name', user.name, iconUser('w-4 h-4'))}
          ${profileReadonly('NIK', user.nik, iconId('w-4 h-4'), 'NIK tidak dapat diubah')}
          ${profileInput('Email', 'email', user.email, iconMail('w-4 h-4'), 'email')}
          ${profileReadonly('Tanggal Lahir', window.utils.formatDate(user.dateOfBirth), iconCalendar('w-4 h-4'), '')}
          ${profileInput('Nomor Telepon', 'phone', user.phone || '', iconPhone('w-4 h-4'), 'tel')}
          ${profileTextarea('Alamat', 'address', user.address || '', iconMap('w-4 h-4'))}
        </div>
        <div class="flex gap-3 mt-6">
          <button id="profile-save" class="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            ${iconSave('w-4 h-4')}
            Simpan Perubahan
          </button>
          <button id="profile-cancel" class="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">
            Batal
          </button>
        </div>
      </div>
    </div>
  `;

  const formState = {
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    address: user.address || '',
  };

  function bindInputs() {
    wrap.querySelectorAll('[data-field]').forEach((input) => {
      const field = input.getAttribute('data-field');
      input.addEventListener('input', (e) => {
        formState[field] = e.target.value;
      });
    });
  }

  bindInputs();

  const saveBtn = wrap.querySelector('#profile-save');
  const cancelBtn = wrap.querySelector('#profile-cancel');
  const successBox = wrap.querySelector('#profile-success');
  const photoInput = wrap.querySelector('#photo-upload');

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      formState.profilePhoto = reader.result;
      const photo = wrap.querySelector('#profile-photo');
      if (photo) {
        photo.innerHTML = `<img src="${h(reader.result)}" class="w-full h-full object-cover" alt="Profile" />`;
      }
    };
    reader.readAsDataURL(file);
  });

  saveBtn.addEventListener('click', () => {
    const users = window.storage.getUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...formState,
      };
      window.storage.setUsers(users);
      state.currentUser = users[idx];
      successBox.classList.remove('hidden');
      setTimeout(() => successBox.classList.add('hidden'), 3000);
    }
  });

  cancelBtn.addEventListener('click', () => {
    formState.name = user.name;
    formState.email = user.email;
    formState.phone = user.phone || '';
    formState.address = user.address || '';
    wrap.querySelectorAll('[data-field]').forEach((input) => {
      const field = input.getAttribute('data-field');
      input.value = formState[field] || '';
    });
  });

  return wrap;
}

function profileInput(label, field, value, icon, type = 'text') {
  return `
    <div>
      <label class="flex items-center gap-2 text-gray-700 mb-2">${icon}${label}</label>
      <input data-field="${field}" type="${type}" value="${value || ''}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
    </div>
  `;
}

function profileTextarea(label, field, value, icon) {
  return `
    <div class="md:col-span-2">
      <label class="flex items-center gap-2 text-gray-700 mb-2">${icon}${label}</label>
      <textarea data-field="${field}" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="3">${value || ''}</textarea>
    </div>
  `;
}

function profileReadonly(label, value, icon, note) {
  return `
    <div>
      <label class="flex items-center gap-2 text-gray-700 mb-2">${icon}${label}</label>
      <p class="text-gray-900">${value}</p>
      ${note ? `<p class="text-gray-500 text-sm">${note}</p>` : ''}
    </div>
  `;
}

function renderUserSettings() {
  const user = state.currentUser;
  const wrap = document.createElement('div');
  wrap.className = 'max-w-2xl mx-auto space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Pengaturan</h1>
      <p class="text-gray-600">Kelola pengaturan akun Anda</p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          ${iconLock('w-5 h-5 text-blue-600')}
        </div>
        <div>
          <h2 class="text-gray-900 font-semibold">Ganti Password</h2>
          <p class="text-gray-600 text-sm">Perbarui password akun Anda</p>
        </div>
      </div>
      <div id="settings-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
        ${iconAlert('w-5 h-5 text-red-600 flex-shrink-0 mt-0.5')}
        <span class="text-red-700" id="settings-error-text"></span>
      </div>
      <div id="settings-success" class="hidden mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
        ${iconCheck('w-5 h-5 text-green-600 flex-shrink-0 mt-0.5')}
        <span class="text-green-700">Password berhasil diubah!</span>
      </div>
      <form id="settings-form" class="space-y-4">
        <div>
          <label class="block text-gray-700 mb-2">Password Lama</label>
          <input type="password" name="oldPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" required="required" />
        </div>
        <div>
          <label class="block text-gray-700 mb-2">Password Baru</label>
          <input type="password" name="newPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" required="required" />
          <p class="mt-1 text-gray-500 text-sm">Minimal 6 karakter</p>
        </div>
        <div>
          <label class="block text-gray-700 mb-2">Konfirmasi Password Baru</label>
          <input type="password" name="confirmPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" required="required" />
        </div>
        <button type="submit" class="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Ganti Password</button>
      </form>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 class="text-gray-900 font-semibold mb-4">Informasi Akun</h2>
      <div class="space-y-3">
        <div class="flex justify-between py-2 border-b border-gray-200"><span class="text-gray-600">Nama:</span><span class="text-gray-900">${user.name}</span></div>
        <div class="flex justify-between py-2 border-b border-gray-200"><span class="text-gray-600">Email:</span><span class="text-gray-900">${user.email}</span></div>
        <div class="flex justify-between py-2 border-b border-gray-200"><span class="text-gray-600">Username:</span><span class="text-gray-900">${user.username}</span></div>
        <div class="flex justify-between py-2"><span class="text-gray-600">Role:</span><span class="text-gray-900">${user.role === 'admin' ? 'Administrator' : 'User'}</span></div>
      </div>
    </div>
  `;

  const form = wrap.querySelector('#settings-form');
  const errorBox = wrap.querySelector('#settings-error');
  const errorText = wrap.querySelector('#settings-error-text');
  const successBox = wrap.querySelector('#settings-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    successBox.classList.add('hidden');
    const fd = new FormData(form);
    const oldPassword = (fd.get('oldPassword') || '').toString();
    const newPassword = (fd.get('newPassword') || '').toString();
    const confirmPassword = (fd.get('confirmPassword') || '').toString();

    const users = window.storage.getUsers();
    const current = users.find((u) => u.id === user.id);
    if (!current) {
      showSettingsError('Pengguna tidak ditemukan');
      return;
    }
    const { matches } = await window.security.verifyPassword(current, oldPassword);
    if (!matches) {
      showSettingsError('Password lama tidak sesuai');
      return;
    }
    if (newPassword.length < 6) {
      showSettingsError('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      showSettingsError('Konfirmasi password tidak sesuai');
      return;
    }
    if (newPassword === oldPassword) {
      showSettingsError('Password baru harus berbeda dengan password lama');
      return;
    }
    current.password = await window.security.hashPassword(newPassword);
    window.storage.setUsers(users);
    successBox.classList.remove('hidden');
    form.reset();
  });

  function showSettingsError(msg) {
    errorText.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  return wrap;
}

function renderUserTaxes() {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div>
      <h1 class="text-gray-900 text-xl font-semibold mb-2">Manajemen Pajak</h1>
      <p class="text-gray-600">Lihat dan bayar pajak aset Anda</p>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          ${iconSearch('w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2')}
          <input type="text" id="tax-search" placeholder="Cari pajak..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div class="flex items-center gap-2">
          ${iconFilter('w-5 h-5 text-gray-400')}
          <select id="tax-status" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">Semua Status</option>
            <option value="unpaid">Belum Bayar</option>
            <option value="paid">Sudah Bayar</option>
          </select>
        </div>
      </div>
    </div>
    <div id="tax-table"></div>
    <div id="tax-modal" class="hidden"></div>
  `;

  const searchInput = wrap.querySelector('#tax-search');
  const statusSelect = wrap.querySelector('#tax-status');
  const tableContainer = wrap.querySelector('#tax-table');
  const modalContainer = wrap.querySelector('#tax-modal');

  function renderTable() {
    const searchTerm = (searchInput.value || '').toLowerCase();
    const statusFilter = statusSelect.value;
    const taxes = userTaxes()
      .filter((t) => {
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        if (
          searchTerm &&
          !t.assetName.toLowerCase().includes(searchTerm) &&
          !t.taxNumber.toLowerCase().includes(searchTerm)
        )
          return false;
        return true;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    if (taxes.length === 0) {
      tableContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          ${iconReceipt('w-12 h-12 text-gray-300 mx-auto mb-4')}
          <p class="text-gray-500">${searchTerm || statusFilter !== 'all' ? 'Tidak ada pajak yang sesuai dengan filter' : 'Belum ada tagihan pajak'}</p>
        </div>
      `;
      return;
    }

    tableContainer.innerHTML = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-gray-700">Nama Aset</th>
                <th class="px-6 py-3 text-left text-gray-700">No. Pajak</th>
                <th class="px-6 py-3 text-left text-gray-700">Jumlah</th>
                <th class="px-6 py-3 text-left text-gray-700">Jatuh Tempo</th>
                <th class="px-6 py-3 text-left text-gray-700">Status</th>
                <th class="px-6 py-3 text-left text-gray-700">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${taxes
                .map((tax) => {
                  const due = new Date(tax.dueDate);
                  const diffDays = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isOverdue = diffDays < 0 && tax.status === 'unpaid';
                  return `
                    <tr class="hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}">
                      <td class="px-6 py-4">
                        <p class="text-gray-900 font-semibold">${h(tax.assetName)}</p>
                        ${tax.taxType ? `<p class="text-xs text-gray-500 mt-1">${h(tax.taxType)}</p>` : ''}
                      </td>
                      <td class="px-6 py-4">
                        <p class="text-gray-600 font-mono">${h(tax.taxNumber)}</p>
                      </td>
                      <td class="px-6 py-4">
                        <p class="text-gray-900 font-semibold">${window.utils.formatCurrency(tax.amount)}</p>
                        ${tax.taxRate ? `<p class="text-xs text-blue-600 mt-1">Tarif: ${tax.taxRate.toFixed(2)}%</p>` : ''}
                      </td>
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2 text-gray-600">
                          ${iconCalendar('w-4 h-4')}
                          <span>${window.utils.formatDate(tax.dueDate)}</span>
                        </div>
                        ${
                          tax.status === 'unpaid'
                            ? `<p class="mt-1 ${isOverdue ? 'text-red-600' : diffDays <= 7 ? 'text-orange-600' : 'text-gray-500'}">${
                                isOverdue ? `Terlambat ${Math.abs(diffDays)} hari` : `${diffDays} hari lagi`
                              }</p>`
                            : tax.paidDate
                            ? `<p class="text-green-600 mt-1">Dibayar: ${window.utils.formatDate(tax.paidDate)}</p>`
                            : ''
                        }
                      </td>
                      <td class="px-6 py-4">${taxStatusBadge(tax, diffDays)}</td>
                      <td class="px-6 py-4">
                        ${
                          tax.status === 'unpaid'
                            ? `<button data-pay="${tax.id}" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Bayar</button>`
                            : `<span class="text-gray-400">-</span>`
                        }
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tableContainer.querySelectorAll('[data-pay]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const taxId = btn.getAttribute('data-pay');
        const tax = taxes.find((t) => t.id === taxId);
        if (tax) openPaymentModal(tax);
      });
    });
  }

  function taxStatusBadge(tax, diffDays) {
    if (tax.status === 'paid') {
      return `<span class="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full">${iconCheck('w-4 h-4')}Sudah Bayar</span>`;
    }
    if (diffDays < 0) {
      return `<span class="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full">${iconAlert('w-4 h-4')}Terlambat</span>`;
    }
    if (diffDays <= 7) {
      return `<span class="flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full">${iconAlert('w-4 h-4')}Segera Jatuh Tempo</span>`;
    }
    return `<span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">Belum Bayar</span>`;
  }

  function openPaymentModal(tax) {
    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl max-w-md w-full">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 class="text-gray-900 font-semibold">Pembayaran Pajak</h2>
            <button id="pay-close" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">${iconClose('w-5 h-5')}</button>
          </div>
          <div class="p-6 space-y-4">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p class="text-blue-900 mb-1">Ini adalah simulasi pembayaran</p>
              <p class="text-blue-700 text-sm">Dalam sistem sebenarnya, ini akan terintegrasi dengan payment gateway</p>
            </div>
            <div class="space-y-3">
              <div class="flex justify-between"><span class="text-gray-600">Nama Aset:</span><span class="text-gray-900">${h(tax.assetName)}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">No. Pajak:</span><span class="text-gray-900 font-mono">${h(tax.taxNumber)}</span></div>
              <div class="flex justify-between"><span class="text-gray-600">Jatuh Tempo:</span><span class="text-gray-900">${window.utils.formatDate(tax.dueDate)}</span></div>
              <div class="pt-3 border-t border-gray-200 flex justify-between font-semibold"><span class="text-gray-900">Total Pembayaran:</span><span class="text-gray-900">${window.utils.formatCurrency(tax.amount)}</span></div>
            </div>
            <div class="pt-4 border-t border-gray-200">
              <div class="flex items-center gap-3 p-4 border-2 border-blue-600 rounded-lg bg-blue-50">
                ${iconCard('w-6 h-6 text-blue-600')}
                <div>
                  <p class="text-gray-900 font-semibold">Pembayaran Simulasi</p>
                  <p class="text-gray-600 text-sm">Klik bayar untuk melanjutkan</p>
                </div>
              </div>
            </div>
          </div>
          <div class="p-6 border-t border-gray-200 flex gap-3">
            <button id="pay-submit" class="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">Bayar Sekarang</button>
            <button id="pay-cancel" class="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">Batal</button>
          </div>
        </div>
      </div>
    `;
    modalContainer.classList.remove('hidden');

    const close = () => {
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
    };

    modalContainer.querySelector('#pay-close').addEventListener('click', close);
    modalContainer.querySelector('#pay-cancel').addEventListener('click', close);
    modalContainer.querySelector('#pay-submit').addEventListener('click', () => {
      const taxes = window.storage.getTaxes();
      const idx = taxes.findIndex((t) => t.id === tax.id);
      if (idx !== -1) {
        taxes[idx].status = 'paid';
        taxes[idx].paidDate = new Date().toISOString().split('T')[0];
        window.storage.setTaxes(taxes);
      }
      const transactions = window.storage.getTransactions();
      transactions.push({
        id: 'trx-' + Date.now(),
        userId: tax.userId,
        taxId: tax.id,
        assetName: tax.assetName,
        taxNumber: tax.taxNumber,
        amount: tax.amount,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'simulation',
      });
      window.storage.setTransactions(transactions);
      close();
      renderTable();
    });
  }

  searchInput.addEventListener('input', renderTable);
  statusSelect.addEventListener('change', renderTable);
  renderTable();

  return wrap;
}

function renderUserAssets() {
  const wrap = document.createElement('div');
  wrap.className = 'space-y-6';
  wrap.innerHTML = `
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-gray-900 text-xl font-semibold mb-2">Data Kepemilikan</h1>
        <p class="text-gray-600">Kelola aset kendaraan dan properti Anda</p>
      </div>
      <button id="asset-add" class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
        ${iconPlus('w-5 h-5')}
        Tambah Aset
      </button>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          ${iconSearch('w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2')}
          <input type="text" id="asset-search" placeholder="Cari aset..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div class="flex items-center gap-2">
          ${iconFilter('w-5 h-5 text-gray-400')}
          <select id="asset-filter" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="all">Semua Jenis</option>
            <option value="vehicle">Kendaraan</option>
            <option value="property">Properti</option>
          </select>
        </div>
      </div>
    </div>
    <div id="asset-list"></div>
    <div id="asset-modal" class="hidden"></div>
  `;

  const searchInput = wrap.querySelector('#asset-search');
  const filterSelect = wrap.querySelector('#asset-filter');
  const listContainer = wrap.querySelector('#asset-list');
  const modalContainer = wrap.querySelector('#asset-modal');
  wrap.querySelector('#asset-add').addEventListener('click', () => openAssetForm());

  function renderList() {
    const searchTerm = (searchInput.value || '').toLowerCase();
    const filter = filterSelect.value;
    const assets = userAssets()
      .filter((a) => {
        if (filter === 'vehicle' && a.nonCurrentAssetType !== 'KENDARAAN') return false;
        if (filter === 'property' && !(a.nonCurrentAssetType === 'BANGUNAN' || a.nonCurrentAssetType === 'TANAH')) return false;
        if (
          searchTerm &&
          !a.assetName.toLowerCase().includes(searchTerm) &&
          !(a.registrationNumber || '').toLowerCase().includes(searchTerm)
        )
          return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    if (assets.length === 0) {
      listContainer.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          ${iconCar('w-12 h-12 text-gray-300 mx-auto mb-4')}
          <p class="text-gray-500">${searchTerm || filter !== 'all' ? 'Tidak ada aset yang sesuai dengan filter' : 'Belum ada aset yang terdaftar'}</p>
          <button class="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" id="asset-empty-add">Tambah Aset Pertama</button>
        </div>
      `;
      const emptyBtn = listContainer.querySelector('#asset-empty-add');
      if (emptyBtn) emptyBtn.addEventListener('click', () => openAssetForm());
      return;
    }

    try {
      const html = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${assets
            .map((asset) => {
              const typeBadge = asset.assetType
                ? `<span class="px-3 py-1 rounded-full text-white text-sm ${
                    asset.assetType === 'LANCAR'
                      ? 'bg-green-500'
                      : asset.assetType === 'SEMI_LANCAR'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                  }">${h((asset.assetType || '').replace(/_/g, ' '))}</span>`
                : '';
              const taxInfo =
                asset.taxAmount > 0
                  ? `<div class="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm flex justify-between"><span class="text-gray-700">Pajak (${(asset.taxRate || 0).toFixed(2)}%):</span><span class="text-blue-600">${window.utils.formatCurrency(asset.taxAmount)}/tahun</span></div>`
                  : '';
              const coords =
                (asset.latitude || asset.longitude) && (asset.nonCurrentAssetType === 'TANAH' || asset.nonCurrentAssetType === 'BANGUNAN')
                  ? `<div class="flex items-center gap-1 text-gray-600 text-sm mb-2">${iconMapPin('w-4 h-4')}<span>${Number(asset.latitude).toFixed(6)}, ${Number(asset.longitude).toFixed(6)}</span></div>`
                  : '';
              return `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div class="flex items-start justify-between mb-4">
                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      ${iconForAssetType(asset)}
                    </div>
                    ${typeBadge}
                  </div>
                  <div class="mb-2">
                    <span class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">${h(asset.nonCurrentAssetType || asset.assetType || 'Aset')}</span>
                  </div>
                  <h3 class="text-gray-900 font-semibold mb-1">${h(asset.assetName || asset.name)}</h3>
                  <p class="text-gray-600 mb-1">${h(asset.registrationNumber || '')}</p>
                  <p class="text-gray-900 font-semibold mb-2">${window.utils.formatCurrency(asset.acquisitionValue || 0)}</p>
                  ${taxInfo}
                  ${coords}
                  <p class="text-gray-500 text-sm mb-2">Diperoleh: ${window.utils.formatDate(asset.acquisitionDate)}</p>
                  ${
                    asset.photos && asset.photos.length > 0
                      ? `<div class="relative mb-3">
                          <img data-slider-main src="${h(asset.photos[0].data)}" class="w-full h-32 object-cover rounded-lg border border-gray-200" />
                          ${
                            asset.photos.length > 1
                              ? `<button data-slider-prev class="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow">${iconBack('w-4 h-4')}</button>
                                 <button data-slider-next class="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-700 rounded-full p-1 shadow rotate-180">${iconBack('w-4 h-4')}</button>`
                              : ''
                          }
                        </div>`
                      : ''
                  }
                  <div class="mt-4 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2">
                    <button data-edit="${asset.id}" class="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">${iconEdit('w-4 h-4')}Edit</button>
                    <button data-transfer="${asset.id}" class="flex-1 px-3 py-2 border border-blue-600 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">Transfer</button>
                    <button data-delete="${asset.id}" class="flex items-center justify-center gap-2 px-3 py-2 border border-red-600 hover:bg-red-50 text-red-600 rounded-lg transition-colors">${iconTrash('w-4 h-4')}Hapus</button>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      `;
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      listContainer.innerHTML = '';
      listContainer.append(...Array.from(parsed.body.childNodes));
    } catch (err) {
      console.error('Render asset list error', err);
      listContainer.textContent = 'Gagal merender daftar aset.';
      return;
    }

    listContainer.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const asset = assets.find((a) => a.id === btn.getAttribute('data-edit'));
        if (asset) openAssetForm(asset);
      });
    });
    listContainer.querySelectorAll('[data-transfer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const asset = assets.find((a) => a.id === btn.getAttribute('data-transfer'));
        if (asset) openTransferModal(asset);
      });
    });
    listContainer.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const assetId = btn.getAttribute('data-delete');
        const asset = assets.find((a) => a.id === assetId);
        if (asset) openDeleteModal(asset);
      });
    });

    // Attach simple slider controls
    listContainer.querySelectorAll('[data-slider-main]').forEach((imgEl) => {
      const card = imgEl.closest('.bg-white');
      if (!card) return;
      const assetId = (card.querySelector('[data-edit]') || {}).getAttribute('data-edit');
      const asset = assets.find((a) => a.id === assetId);
      if (!asset || !asset.photos || asset.photos.length <= 1) return;
      let idx = 0;
      const updateImg = () => {
        imgEl.src = asset.photos[idx].data;
      };
      const prev = card.querySelector('[data-slider-prev]');
      const next = card.querySelector('[data-slider-next]');
      if (prev) prev.addEventListener('click', () => { idx = (idx - 1 + asset.photos.length) % asset.photos.length; updateImg(); });
      if (next) next.addEventListener('click', () => { idx = (idx + 1) % asset.photos.length; updateImg(); });
    });
  }

  function openAssetForm(asset) {
    const formData = {
      assetType: asset ? asset.assetType : '',
      assetName: asset ? asset.assetName : '',
      registrationNumber: asset ? asset.registrationNumber : '',
      acquisitionValue: asset ? asset.acquisitionValue : '',
      acquisitionDate: asset ? asset.acquisitionDate : '',
      description: asset ? asset.description : '',
      currentAssetType: asset ? asset.currentAssetType : '',
      semiCurrentAssetType: asset ? asset.semiCurrentAssetType : '',
      nonCurrentAssetType: asset ? asset.nonCurrentAssetType : '',
      certificateType: asset ? asset.certificateType : '',
      landType: asset ? asset.landType : '',
      buildingType: asset ? asset.buildingType : '',
      structureMaterial: asset ? asset.structureMaterial : '',
      vehicleType: asset ? asset.vehicleType : '',
      fuelType: asset ? asset.fuelType : '',
      engineType: asset ? asset.engineType : '',
      investmentType: asset ? asset.investmentType : '',
      intangibleAssetType: asset ? asset.intangibleAssetType : '',
      ownershipStatus: asset ? asset.ownershipStatus : '',
      latitude: asset ? asset.latitude : '',
      longitude: asset ? asset.longitude : '',
      photos: asset ? asset.photos || [] : [],
      attachments: asset ? asset.attachments || [] : [],
    };

    try {
      setHTML(modalContainer, `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6 border-b border-gray-200 flex items-center gap-3">
            <button id="asset-back" class="p-2 hover:bg-gray-100 rounded-lg">${iconBack('w-6 h-6')}</button>
            <div>
              <h1 class="text-gray-900 text-lg font-semibold">${asset ? 'Edit Aset' : 'Tambah Aset Baru'}</h1>
              <p class="text-gray-600 text-sm">${asset ? 'Perbarui informasi aset' : 'Daftarkan aset baru Anda'}</p>
            </div>
          </div>
          <div class="p-6 space-y-6">
            <div>
              <label class="block text-gray-700 mb-3 font-semibold">1. Tipe Aset *</label>
              <div class="grid grid-cols-1 gap-3">
                ${assetTypeRadio(formData, 'LANCAR', 'Aset Lancar', 'Aset yang dapat dengan cepat diubah menjadi uang tunai')}
                ${assetTypeRadio(formData, 'SEMI_LANCAR', 'Aset Semi Lancar', 'Likuiditas di antara aset lancar dan tidak')}
                ${assetTypeRadio(formData, 'TIDAK_LANCAR', 'Aset Tidak Lancar', 'Membutuhkan waktu lama untuk dicairkan')}
              </div>
            </div>
            <div id="type-fields"></div>
            <div class="space-y-4 pt-4 border-t border-gray-200">
              <h3 class="text-gray-900 font-semibold">Informasi Dasar Aset</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${inputField('Nama Aset *', 'assetName', 'Contoh: Toyota Avanza 2020', formData.assetName)}
                ${inputField('Nomor Registrasi/Sertifikat', 'registrationNumber', 'B 1234 XYZ / SHM No. 123/2023', formData.registrationNumber)}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${numberField('Nilai Aset (Rp) *', 'acquisitionValue', formData.acquisitionValue)}
                ${dateField('Tanggal Perolehan *', 'acquisitionDate', formData.acquisitionDate)}
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${inputField('Latitude', 'latitude', 'opsional', formData.latitude)}
                ${inputField('Longitude', 'longitude', 'opsional', formData.longitude)}
              </div>
              <button id="asset-get-location" class="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2">${iconMapPin('w-4 h-4')}Ambil Lokasi</button>
              ${selectField('Status Kepemilikan', 'ownershipStatus', [
                ['', 'Pilih'],
                ['MILIK_SENDIRI', 'Milik Sendiri'],
                ['SEWA', 'Sewa'],
                ['HIBAH', 'Hibah'],
                ['WARISAN', 'Waris'],
                ['KREDIT', 'Kredit'],
              ], formData.ownershipStatus)}
              <div>
                <label class="block text-gray-700 mb-2">Deskripsi / Catatan</label>
                <textarea id="description" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="3" placeholder="Catatan tambahan">${h(formData.description || '')}</textarea>
              </div>
              <div>
                <label class="block text-gray-700 mb-2">Lampiran (PDF)</label>
                <label class="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                  ${iconUpload('w-5 h-5 text-gray-400 mr-2')}
                  <span class="text-gray-600">Upload Lampiran PDF</span>
                  <input type="file" id="att-upload" accept="application/pdf" multiple class="hidden" />
                </label>
                <div id="att-list" class="space-y-2 mt-2"></div>
              </div>
              <div>
                <label class="block text-gray-700 mb-2">Foto (PNG/JPG/JPEG)</label>
                <label class="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                  ${iconUpload('w-5 h-5 text-gray-400 mr-2')}
                  <span class="text-gray-600">Upload Foto</span>
                  <input type="file" id="photo-upload-asset" accept="image/png,image/jpeg,image/jpg" multiple class="hidden" />
                </label>
                <div id="photo-list" class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3"></div>
              </div>
              <div id="tax-preview"></div>
              <div class="flex gap-3 pt-4 border-t border-gray-200">
                <button id="asset-save" class="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">${iconSave('w-4 h-4')}${asset ? 'Perbarui Aset' : 'Simpan Aset'}</button>
                <button id="asset-cancel" class="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">Batal</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    } catch (err) {
      console.error('Render asset form error', err);
      alert('Gagal membuka form aset. Mohon cek data input.');
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
      return;
    }
    modalContainer.classList.remove('hidden');

    const close = () => {
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
    };

    modalContainer.querySelector('#asset-back').addEventListener('click', close);
    modalContainer.querySelector('#asset-cancel').addEventListener('click', close);
    modalContainer.querySelectorAll('input[name="assetType"]').forEach((input) => {
      input.addEventListener('change', () => {
        formData.assetType = input.value;
        renderTypeFields();
        updateTaxPreview();
      });
      if (formData.assetType === input.value) input.checked = true;
    });

    function renderTypeFields() {
      const target = modalContainer.querySelector('#type-fields');
      const type = formData.assetType;
      if (!type) {
        target.innerHTML = `<p class="text-gray-500">Pilih tipe aset untuk melanjutkan.</p>`;
        return;
      }
      if (type === 'LANCAR') {
        target.innerHTML = selectField(
          'Jenis Aset Lancar',
          'currentAssetType',
          [
            ['KAS_BANK', 'Kas & Bank'],
            ['PIUTANG_USAHA', 'Piutang Usaha'],
            ['PIUTANG_LAINNYA', 'Piutang Lainnya'],
            ['PERSEDIAAN', 'Persediaan'],
            ['DEPOSITO_JANGKA_PENDEK', 'Deposito Jangka Pendek'],
            ['INVESTASI_LANCAR', 'Investasi Lancar'],
          ],
          formData.currentAssetType
        );
      } else if (type === 'SEMI_LANCAR') {
        target.innerHTML = selectField(
          'Jenis Aset Semi Lancar',
          'semiCurrentAssetType',
          [
            ['INVESTASI_JANGKA_MENENGAH', 'Investasi Jangka Menengah'],
            ['SERTIFIKAT_DEPOSITO', 'Sertifikat Deposito'],
            ['PIUTANG_JANGKA_MENENGAH', 'Piutang Jangka Menengah'],
          ],
          formData.semiCurrentAssetType
        );
      } else {
        const nonCurrentSelect = selectField(
          'Jenis Aset Tidak Lancar',
          'nonCurrentAssetType',
          [
            ['TANAH', 'Tanah'],
            ['BANGUNAN', 'Bangunan'],
            ['KENDARAAN', 'Kendaraan'],
            ['MESIN_PERALATAN', 'Mesin/Peralatan'],
            ['PERABOT_KANTOR', 'Perabot Kantor'],
            ['ASET_TAK_BERWUJUD', 'Aset Tak Berwujud'],
            ['INVESTASI_JANGKA_PANJANG', 'Investasi Jangka Panjang'],
          ],
          formData.nonCurrentAssetType
        );

        let detailFields = '';

        if (formData.nonCurrentAssetType === 'TANAH') {
          detailFields = `
            ${selectField(
              'Jenis Sertifikat (Tanah)',
              'certificateType',
              [
                ['', 'Pilih'],
                ['SHM', 'SHM'],
                ['SHGB', 'SHGB'],
                ['SHGU', 'SHGU'],
                ['SHP', 'SHP'],
                ['GIRIK', 'Girik'],
                ['AKTA_JUAL_BELI', 'Akta Jual Beli'],
              ],
              formData.certificateType
            )}
            ${selectField(
              'Tipe Tanah',
              'landType',
              [
                ['', 'Pilih'],
                ['PERUMAHAN', 'Perumahan'],
                ['KOMERSIAL', 'Komersial'],
                ['INDUSTRI', 'Industri'],
                ['PERTANIAN', 'Pertanian'],
                ['PERKEBUNAN', 'Perkebunan'],
                ['KOSONG', 'Kosong'],
              ],
              formData.landType
            )}
          `;
        } else if (formData.nonCurrentAssetType === 'BANGUNAN') {
          detailFields = `
            ${selectField(
              'Tipe Bangunan',
              'buildingType',
              [
                ['', 'Pilih'],
                ['RUMAH_TINGGAL', 'Rumah Tinggal'],
                ['RUKO', 'Ruko'],
                ['KANTOR', 'Kantor'],
                ['PABRIK', 'Pabrik'],
                ['GUDANG', 'Gudang'],
                ['APARTEMEN', 'Apartemen'],
              ],
              formData.buildingType
            )}
            ${selectField(
              'Material Struktur',
              'structureMaterial',
              [
                ['', 'Pilih'],
                ['BETON_BERTULANG', 'Beton Bertulang'],
                ['BATA_RINGAN', 'Bata Ringan'],
                ['KAYU', 'Kayu'],
                ['SEMI_PERMANEN', 'Semi Permanen'],
              ],
              formData.structureMaterial
            )}
          `;
        } else if (formData.nonCurrentAssetType === 'KENDARAAN') {
          detailFields = `
            ${selectField(
              'Jenis Kendaraan',
              'vehicleType',
              [
                ['', 'Pilih'],
                ['MOBIL_PRIBADI', 'Mobil Pribadi'],
                ['MOBIL_PENUMPANG', 'Mobil Penumpang'],
                ['MOBIL_NIAGA', 'Mobil Niaga'],
                ['SEPEDA_MOTOR', 'Sepeda Motor'],
                ['TRUCK', 'Truk'],
                ['BUS', 'Bus'],
              ],
              formData.vehicleType
            )}
            ${selectField(
              'Jenis BBM',
              'fuelType',
              [
                ['', 'Pilih'],
                ['BENSIN', 'Bensin'],
                ['DIESEL', 'Diesel'],
                ['LISTRIK', 'Listrik'],
                ['HYBRID', 'Hybrid'],
              ],
              formData.fuelType
            )}
            ${selectField(
              'Kapasitas Mesin',
              'engineType',
              [
                ['', 'Pilih'],
                ['DIBAWAH_1500CC', '< 1500cc'],
                ['1500_2000CC', '1500-2000cc'],
                ['2000_3000CC', '2000-3000cc'],
                ['DIATAS_3000CC', '> 3000cc'],
              ],
              formData.engineType
            )}
          `;
        } else if (formData.nonCurrentAssetType === 'INVESTASI_JANGKA_PANJANG') {
          detailFields = `
            ${selectField(
              'Jenis Investasi',
              'investmentType',
              [
                ['', 'Pilih'],
                ['SAHAM', 'Saham'],
                ['OBLIGASI', 'Obligasi'],
                ['REKSA_DANA', 'Reksa Dana'],
                ['DEPOSITO', 'Deposito'],
                ['PROPERTI', 'Properti'],
                ['LOGAM_MULIA', 'Logam Mulia'],
              ],
              formData.investmentType
            )}
          `;
        } else if (formData.nonCurrentAssetType === 'ASET_TAK_BERWUJUD') {
          detailFields = `
            ${selectField(
              'Jenis Aset Tak Berwujud',
              'intangibleAssetType',
              [
                ['', 'Pilih'],
                ['HAK_PATEN', 'Hak Paten'],
                ['HAK_CIPTA', 'Hak Cipta'],
                ['MEREK_DAGANG', 'Merek Dagang'],
                ['FRANCHISE', 'Franchise'],
                ['GOODWILL', 'Goodwill'],
                ['SOFTWARE', 'Software'],
              ],
              formData.intangibleAssetType
            )}
          `;
        }

        target.innerHTML = `
          ${nonCurrentSelect}
          ${detailFields ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">${detailFields}</div>` : ''}
        `;
      }
      target.querySelectorAll('[data-select]').forEach((sel) => {
        sel.addEventListener('change', (e) => {
          const field = sel.getAttribute('data-select');
          formData[field] = e.target.value;
          if (field === 'nonCurrentAssetType') {
            formData.certificateType = '';
            formData.landType = '';
            formData.buildingType = '';
            formData.structureMaterial = '';
            formData.vehicleType = '';
            formData.fuelType = '';
            formData.engineType = '';
            formData.investmentType = '';
            formData.intangibleAssetType = '';
            renderTypeFields();
            updateTaxPreview();
            return;
          }
          updateTaxPreview();
        });
      });
    }

    function bindBasicInputs() {
      ['assetName', 'registrationNumber', 'acquisitionValue', 'acquisitionDate', 'latitude', 'longitude'].forEach((field) => {
        const el = modalContainer.querySelector(`#${field}`);
        if (el) {
          el.value = formData[field] || '';
          el.addEventListener('input', (e) => {
            formData[field] = e.target.value;
            if (['acquisitionValue'].includes(field)) updateTaxPreview();
          });
        }
      });
      const desc = modalContainer.querySelector('#description');
      desc.value = formData.description || '';
      desc.addEventListener('input', (e) => (formData.description = e.target.value));
    }

    function bindUploads() {
      const attUpload = modalContainer.querySelector('#att-upload');
      const attList = modalContainer.querySelector('#att-list');
      const photoUpload = modalContainer.querySelector('#photo-upload-asset');
      const photoList = modalContainer.querySelector('#photo-list');

      function renderAtt() {
      attList.innerHTML = formData.attachments
          .map(
            (att, idx) => `
          <div class="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-100 rounded flex items-center justify-center">${iconFile('w-5 h-5 text-red-600')}</div>
              <div>
                <p class="text-gray-900">${h(att.name)}</p>
                <p class="text-gray-500 text-xs">PDF Document</p>
              </div>
            </div>
            <button data-remove-att="${idx}" class="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">${iconClose('w-4 h-4')}</button>
          </div>
        `
          )
          .join('');
        attList.querySelectorAll('[data-remove-att]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-remove-att'));
            formData.attachments.splice(idx, 1);
            renderAtt();
          });
        });
      }

      function renderPhotos() {
        photoList.innerHTML = formData.photos
          .map(
            (photo, idx) => `
          <div class="relative group">
            <img src="${h(photo.data)}" alt="${h(photo.name)}" class="w-full h-24 object-cover rounded-lg border border-gray-200" />
            <button data-remove-photo="${idx}" class="absolute top-1 right-1 p-1 bg-red-600 hover:bg-red-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">${iconClose('w-3 h-3')}</button>
            <p class="mt-1 text-xs text-gray-600 truncate">${h(photo.name)}</p>
          </div>
        `
          )
          .join('');
        photoList.querySelectorAll('[data-remove-photo]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const idx = Number(btn.getAttribute('data-remove-photo'));
            formData.photos.splice(idx, 1);
            renderPhotos();
          });
        });
      }

      attUpload.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach((file) => {
          if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onloadend = () => {
              formData.attachments.push({
                id: 'att-' + Date.now(),
                name: file.name,
                data: reader.result,
                type: 'pdf',
              });
              renderAtt();
            };
            reader.readAsDataURL(file);
          }
        });
      });

      photoUpload.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach((file) => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
              formData.photos.push({
                id: 'photo-' + Date.now(),
                name: file.name,
                data: reader.result,
                type: 'image',
              });
              renderPhotos();
            };
            reader.readAsDataURL(file);
          }
        });
      });

      renderAtt();
      renderPhotos();
    }

    function bindLocationButton() {
      const btn = modalContainer.querySelector('#asset-get-location');
      btn.addEventListener('click', () => {
        btn.disabled = true;
        btn.textContent = 'Mengambil lokasi...';
        window.geo
          .getCurrentLocation()
          .then((loc) => {
            formData.latitude = loc.latitude;
            formData.longitude = loc.longitude;
            modalContainer.querySelector('#latitude').value = loc.latitude;
            modalContainer.querySelector('#longitude').value = loc.longitude;
          })
          .catch((err) => alert(err.message))
          .finally(() => {
            btn.disabled = false;
            btn.textContent = 'Ambil Lokasi';
          });
      });
    }

    function updateTaxPreview() {
      if (!formData.assetType || !formData.acquisitionValue) {
        modalContainer.querySelector('#tax-preview').innerHTML = '';
        return;
      }
      const calc = window.taxCalc.calculateAssetTax(formData);
      modalContainer.querySelector('#tax-preview').innerHTML = `
        <div class="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-3">
          <div class="flex items-center gap-2">${iconCalc('w-5 h-5 text-blue-600')}<h3 class="text-blue-900 font-semibold">Perhitungan Pajak Terutang</h3></div>
          <div class="bg-white rounded-lg p-4 space-y-2">
            <div class="flex justify-between items-center pb-2 border-b border-gray-200"><span class="text-gray-700">Tarif Pajak Dasar:</span><span class="text-gray-900">${calc.baseRate.toFixed(2)}%</span></div>
            ${
              calc.modifiers.length > 0
                ? `<div class="space-y-1">${calc.modifiers
                    .map((m) => `<div class="flex justify-between items-center text-sm"><span class="text-gray-600">${m.name}:</span><span class="${m.rate >= 0 ? 'text-gray-700' : 'text-green-600'}">${m.rate >= 0 ? '+' : ''}${m.rate.toFixed(2)}%</span></div>`)
                    .join('')}</div>`
                : ''
            }
            <div class="flex justify-between items-center pt-2 border-t-2 border-blue-200"><span class="text-gray-900">Total Tarif Pajak:</span><span class="text-blue-600">${calc.totalRate.toFixed(2)}%</span></div>
            <div class="flex justify-between items-center pt-2 mt-2 border-t-2 border-blue-300"><span class="text-gray-900">Pajak Terutang:</span><span class="text-blue-600">${window.utils.formatCurrency(calc.taxAmount)}</span></div>
          </div>
        </div>
      `;
      return calc;
    }

    const saveBtn = modalContainer.querySelector('#asset-save');
    saveBtn.addEventListener('click', () => {
      if (!formData.assetType || !formData.assetName || !formData.acquisitionValue || !formData.acquisitionDate) {
        alert('Lengkapi data wajib.');
        return;
      }
      const taxCalc = updateTaxPreview() || { totalRate: 0, taxAmount: 0 };
      const allAssets = window.storage.getAssets();
      if (asset) {
        const idx = allAssets.findIndex((a) => a.id === asset.id);
        if (idx !== -1) {
          allAssets[idx] = {
            ...allAssets[idx],
            ...formData,
            acquisitionValue: Number(formData.acquisitionValue),
            taxRate: taxCalc.totalRate || 0,
            taxAmount: taxCalc.taxAmount || 0,
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        const newAsset = {
          id: 'asset-' + Date.now(),
          userId: state.currentUser.id,
          ...formData,
          acquisitionValue: Number(formData.acquisitionValue),
          taxRate: taxCalc.totalRate || 0,
          taxAmount: taxCalc.taxAmount || 0,
          createdAt: new Date().toISOString(),
        };
        allAssets.push(newAsset);

        if (taxCalc.taxAmount > 0) {
          const taxes = window.storage.getTaxes();
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          taxes.push({
            id: 'tax-' + Date.now(),
            userId: state.currentUser.id,
            assetId: newAsset.id,
            assetName: formData.assetName,
            taxNumber: 'PJ-' + Date.now(),
            amount: Math.round(taxCalc.taxAmount),
            taxRate: taxCalc.totalRate,
            dueDate: dueDate.toISOString().split('T')[0],
            status: 'unpaid',
            taxType: deriveTaxType(formData),
            createdAt: new Date().toISOString(),
          });
          window.storage.setTaxes(taxes);
        }
      }

      window.storage.setAssets(allAssets);
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
      renderList();
    });

    function deriveTaxType(fd) {
      if (fd.nonCurrentAssetType === 'TANAH' || fd.nonCurrentAssetType === 'BANGUNAN') return 'PBB (Pajak Bumi dan Bangunan)';
      if (fd.nonCurrentAssetType === 'KENDARAAN') return 'PKB (Pajak Kendaraan Bermotor)';
      if (fd.currentAssetType || fd.semiCurrentAssetType) return 'Pajak Aset Bergerak';
      return 'Pajak Aset';
    }

    renderTypeFields();
    bindBasicInputs();
    bindUploads();
    bindLocationButton();
    updateTaxPreview();
  }

  function openTransferModal(asset) {
    const refreshAssets = renderList;
    const users = window.storage.getUsers().filter((u) => u.role === 'user' && u.id !== state.currentUser.id && u.isActive);
    const modalHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 class="text-gray-900 font-semibold">Transfer Kepemilikan</h2>
              <p class="text-gray-600">${h(asset.assetName || asset.name)}</p>
            </div>
            <button id="transfer-close" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">${iconClose('w-5 h-5')}</button>
          </div>
          <div class="p-6 border-b border-gray-200">
            <div class="relative">
              ${iconSearch('w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2')}
              <input type="text" id="transfer-search" placeholder="Cari berdasarkan nama, email, atau NIK..." class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-6" id="transfer-list"></div>
          <div class="p-6 border-t border-gray-200 flex gap-3">
            <button id="transfer-submit" disabled class="flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Transfer Kepemilikan</button>
            <button id="transfer-cancel" class="px-6 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors">Batal</button>
          </div>
        </div>
      </div>
    `;
    const parsedModal = new DOMParser().parseFromString(modalHTML, 'text/html');
    modalContainer.innerHTML = '';
    modalContainer.append(...Array.from(parsedModal.body.childNodes));
    modalContainer.classList.remove('hidden');
    const close = () => {
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
    };
    modalContainer.querySelector('#transfer-close').addEventListener('click', close);
    modalContainer.querySelector('#transfer-cancel').addEventListener('click', close);

    const listEl = modalContainer.querySelector('#transfer-list');
    const searchEl = modalContainer.querySelector('#transfer-search');
    const submitBtn = modalContainer.querySelector('#transfer-submit');
    let selected = null;

    function renderTransferList() {
      const term = (searchEl.value || '').toLowerCase();
      const filtered = users.filter(
        (u) =>
          !term ||
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.nik || '').includes(term)
      );
      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="text-center py-8 text-gray-500">Tidak ada pengguna yang sesuai</div>`;
        return;
      }
      listEl.innerHTML = filtered
        .map(
          (u) => `
        <label class="block p-4 border-2 rounded-lg cursor-pointer transition-all ${selected === u.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}">
          <input type="radio" name="transfer-user" value="${u.id}" class="sr-only"${selected === u.id ? ' checked=\"checked\"' : ''}/>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-900 font-semibold">${h(u.name)}</p>
              <p class="text-gray-600">${h(u.email)}</p>
              <p class="text-gray-500 text-sm">NIK: ${h(u.nik)}</p>
            </div>
            ${selected === u.id ? iconCheck('w-6 h-6 text-blue-600') : ''}
          </div>
        </label>
      `
        )
        .join('');
      listEl.querySelectorAll('input[name="transfer-user"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          selected = radio.value;
          renderTransferList();
          submitBtn.disabled = !selected;
        });
      });
    }

    submitBtn.addEventListener('click', () => {
      if (!selected) return;
      const allAssets = window.storage.getAssets();
      const idx = allAssets.findIndex((a) => a.id === asset.id);
      if (idx !== -1) {
        allAssets[idx].userId = selected;
        allAssets[idx].transferHistory = allAssets[idx].transferHistory || [];
        allAssets[idx].transferHistory.push({ fromUserId: asset.userId, toUserId: selected, date: new Date().toISOString() });
        window.storage.setAssets(allAssets);
        const taxes = window.storage.getTaxes().map((t) => (t.assetId === asset.id ? { ...t, userId: selected } : t));
        window.storage.setTaxes(taxes);
      }
      close();
      refreshAssets();
    });

    searchEl.addEventListener('input', renderTransferList);
    renderTransferList();
  }

  function openDeleteModal(asset) {
    const modalHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-2xl max-w-md w-full shadow-xl border border-gray-200 overflow-hidden">
          <div class="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 class="text-gray-900 font-semibold">Hapus Aset</h2>
              <p class="text-gray-600 text-sm">Aksi ini tidak dapat dibatalkan.</p>
            </div>
            <button data-delete-close class="p-2 hover:bg-gray-100 rounded-lg transition-colors">${iconClose('w-5 h-5')}</button>
          </div>
          <div class="p-6 space-y-3">
            <p class="text-gray-800">Anda yakin ingin menghapus aset <span class="font-semibold">${h(asset.assetName || asset.name || 'tanpa nama')}</span>?</p>
            <p class="text-gray-600 text-sm">Data pajak terkait aset ini juga akan dihapus.</p>
          </div>
          <div class="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
            <button data-delete-cancel class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">Batal</button>
            <button data-delete-confirm class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Hapus</button>
          </div>
        </div>
      </div>
    `;
    const parsedModal = new DOMParser().parseFromString(modalHTML, 'text/html');
    modalContainer.innerHTML = '';
    modalContainer.append(...Array.from(parsedModal.body.childNodes));
    modalContainer.classList.remove('hidden');

    const close = () => {
      modalContainer.classList.add('hidden');
      modalContainer.innerHTML = '';
    };

    modalContainer.querySelector('[data-delete-close]')?.addEventListener('click', close);
    modalContainer.querySelector('[data-delete-cancel]')?.addEventListener('click', close);
    modalContainer.querySelector('[data-delete-confirm]')?.addEventListener('click', () => {
      const allAssets = window.storage.getAssets().filter((a) => a.id !== asset.id);
      window.storage.setAssets(allAssets);
      const taxes = window.storage.getTaxes().filter((t) => t.assetId !== asset.id);
      window.storage.setTaxes(taxes);
      close();
      renderList();
    });
  }

  function assetTypeRadio(formDataRef, value, title, desc) {
    return `
      <label class="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
        formDataRef.assetType === value ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
      }">
        <input type="radio" name="assetType" value="${value}" class="mt-1"${formDataRef.assetType === value ? ' checked=\"checked\"' : ''}/>
        <div class="flex-1">
          <p class="text-gray-900 font-semibold">${title}</p>
          <p class="text-gray-600 text-sm">${desc}</p>
        </div>
      </label>
    `;
  }

  searchInput.addEventListener('input', renderList);
  filterSelect.addEventListener('change', renderList);
  renderList();

  return wrap;
}
/* AUTH */
function renderAuth(container) {
  if (state.needs2FA && state.pendingUser) {
    renderTwoFactor(container);
    return;
  }

  if (state.authPage === 'register') {
    renderRegister(container);
    return;
  }

  if (state.authPage === 'forgot-password') {
    renderForgot(container);
    return;
  }

  renderLogin(container);
}

function renderLogin(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-blue-50';
  wrapper.innerHTML = `
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 class="text-gray-900 text-xl font-semibold mb-2">CORETAX</h1>
          <p class="text-gray-600">Masuk ke akun Anda</p>
        </div>

        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.5 20h11l2.5-4-2.5-4-2.5 4h-11l-2.5-4 2.5-4 2.5 4h11" />
          </svg>
          <div class="text-sm text-blue-800">
            <p class="font-medium mb-1">Lokasi Diperlukan</p>
            <p class="text-blue-700">Sistem akan meminta akses lokasi Anda untuk keamanan dan tracking aktivitas.</p>
          </div>
        </div>

        <div id="login-warning" class="hidden mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M5.07 20h13.86A2.07 2.07 0 0021 17.93L12 3 3 17.93A2.07 2.07 0 005.07 20z" />
          </svg>
          <span class="text-yellow-700" id="login-warning-text"></span>
        </div>

        <div id="login-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 20h13.86A2.07 2.07 0 0021 17.93L12 3 3 17.93A2.07 2.07 0 005.07 20z" />
          </svg>
          <span class="text-red-700" id="login-error-text"></span>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label class="block text-gray-700 mb-2">Email atau Username</label>
            <div class="relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 12H8m8-4H8m8 8H8m13-7a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <input type="text" name="identifier" class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@example.com" required="required" />
            </div>
          </div>

          <div>
            <label class="block text-gray-700 mb-2">Password</label>
            <div class="relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c1.657 0 3-1.343 3-3V7a3 3 0 10-6 0v1c0 1.657 1.343 3 3 3z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 11h14v9H5z" />
              </svg>
              <input type="password" name="password" class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" required="required" />
            </div>
          </div>

          <div class="flex items-center justify-end">
            <button type="button" id="forgot-link" class="text-blue-600 hover:text-blue-700">Lupa Password?</button>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" id="login-submit">Masuk</button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-600">Belum punya akun? </span>
          <button id="register-link" class="text-blue-600 hover:text-blue-700">Daftar Sekarang</button>
        </div>

        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-center text-gray-500">Demo: admin / admin123</p>
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  const form = wrapper.querySelector('#login-form');
  const submitBtn = wrapper.querySelector('#login-submit');
  const warningBox = wrapper.querySelector('#login-warning');
  const warningText = wrapper.querySelector('#login-warning-text');
  const errorBox = wrapper.querySelector('#login-error');
  const errorText = wrapper.querySelector('#login-error-text');
  const forgotLink = wrapper.querySelector('#forgot-link');
  const registerLink = wrapper.querySelector('#register-link');

  forgotLink.addEventListener('click', () => {
    state.authPage = 'forgot-password';
    render();
  });

  registerLink.addEventListener('click', () => {
    state.authPage = 'register';
    render();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    warningBox.classList.add('hidden');
    errorBox.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    const formData = new FormData(form);
    const identifier = (formData.get('identifier') || '').toString().trim();
    const password = (formData.get('password') || '').toString();

    let location = null;
    try {
      location = await window.geo.getCurrentLocation();
    } catch (err) {
      warningText.textContent =
        err && err.message
          ? err.message
          : 'Lokasi tidak dapat diakses. Login tetap dilanjutkan tanpa tracking lokasi.';
      warningBox.classList.remove('hidden');
    }

    await window.utils.delay(500);

    const users = window.storage.getUsers();
    const candidate = users.find((u) => u.email === identifier || u.username === identifier);
    let user = null;

    if (candidate) {
      const { matches, normalizedUser } = await window.security.verifyPassword(candidate, password);
      if (matches) {
        user = normalizedUser;
        // Persist migration to hashed password if needed
        if (candidate !== normalizedUser) {
          const updatedUsers = users.map((u) => (u.id === normalizedUser.id ? normalizedUser : u));
          window.storage.setUsers(updatedUsers);
        }
      }
    }

    if (!user) {
      errorText.textContent = 'Email/Username atau Password salah';
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
      return;
    }

    if (!user.isActive) {
      errorText.textContent = 'Akun Anda belum diaktivasi. Silakan cek email Anda.';
      errorBox.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Masuk';
      return;
    }

    if (location) {
      window.geo.saveUserLocation(user.id, location, 'login');
    }

    state.pendingUser = user;
    state.needs2FA = true;
    state.twoFactorCode = generate2faCode();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Masuk';
    render();
  });
}

function renderRegister(container) {
  const users = window.storage.getUsers();

  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-screen flex items-center justify-center p-4 py-12 bg-gradient-to-br from-blue-50 via-white to-blue-50';
  wrapper.innerHTML = `
    <div class="w-full max-w-2xl">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 21v-2a4 4 0 00-3-3.87M8 21v-2a4 4 0 013-3.87M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v4m0 4v10" />
            </svg>
          </div>
          <h1 class="text-gray-900 text-xl font-semibold mb-2">Daftar Akun Baru</h1>
          <p class="text-gray-600">Lengkapi data diri Anda untuk mendaftar</p>
        </div>

        <div id="register-success" class="hidden bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p class="text-green-800 font-medium">Registrasi Berhasil!</p>
              <p class="text-green-700 text-sm">Akan diarahkan ke login...</p>
            </div>
          </div>
        </div>

        <form id="register-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 mb-2">Nama Lengkap *</label>
              <div class="relative">
                <input type="text" name="name" class="w-full pl-3 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Nama lengkap" />
              </div>
              <p class="mt-1 text-xs text-gray-500">3-100 karakter</p>
              <p class="mt-1 text-red-600 text-sm hidden" data-error="name"></p>
            </div>
            <div>
              <label class="block text-gray-700 mb-2">Username *</label>
              <div class="relative">
                <input type="text" name="username" class="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="username" />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm" data-availability="username"></span>
              </div>
              <p class="mt-1 text-red-600 text-sm hidden" data-error="username"></p>
            </div>
          </div>

          <div>
            <label class="block text-gray-700 mb-2">Email *</label>
            <div class="relative">
              <input type="email" name="email" class="w-full pl-3 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@example.com" />
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm" data-availability="email"></span>
            </div>
            <p class="mt-1 text-red-600 text-sm hidden" data-error="email"></p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 mb-2">Password *</label>
              <input type="password" name="password" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" />
              <p class="mt-1 text-red-600 text-sm hidden" data-error="password"></p>
            </div>
            <div>
              <label class="block text-gray-700 mb-2">Konfirmasi Password *</label>
              <input type="password" name="confirmPassword" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" />
              <p class="mt-1 text-red-600 text-sm hidden" data-error="confirmPassword"></p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 mb-2">NIK *</label>
              <input type="text" name="nik" maxlength="16" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="16 digit NIK" />
              <p class="mt-1 text-red-600 text-sm hidden" data-error="nik"></p>
            </div>
            <div>
              <label class="block text-gray-700 mb-2">Tanggal Lahir *</label>
              <input type="date" name="dateOfBirth" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <p class="mt-1 text-red-600 text-sm hidden" data-error="dateOfBirth"></p>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" id="register-submit">Daftar</button>
        </form>

        <div class="mt-6 text-center">
          <span class="text-gray-600">Sudah punya akun? </span>
          <button id="back-login" class="text-blue-600 hover:text-blue-700">Masuk</button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  const form = wrapper.querySelector('#register-form');
  const submit = wrapper.querySelector('#register-submit');
  const successBox = wrapper.querySelector('#register-success');
  const backLogin = wrapper.querySelector('#back-login');
  const availabilityEls = {
    email: wrapper.querySelector('[data-availability="email"]'),
    username: wrapper.querySelector('[data-availability="username"]'),
  };

  const errorEls = {};
  form.querySelectorAll('[data-error]').forEach((el) => {
    errorEls[el.getAttribute('data-error')] = el;
  });

  const debounceTimers = {};

  function setAvailability(field, available) {
    const el = availabilityEls[field];
    if (!el) return;
    if (available === null) {
      el.textContent = '';
      return;
    }
    el.textContent = available ? '✓' : '✕';
    el.className = available ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
  }

  function checkAvailability(field, value) {
    clearTimeout(debounceTimers[field]);
    debounceTimers[field] = setTimeout(() => {
      if (!value) {
        setAvailability(field, null);
        return;
      }
      const exists = window.storage.getUsers().some((u) => u[field] === value);
      setAvailability(field, !exists);
    }, 300);
  }

  form.querySelector('[name="email"]').addEventListener('input', (e) => {
    checkAvailability('email', e.target.value.trim());
  });
  form.querySelector('[name="username"]').addEventListener('input', (e) => {
    checkAvailability('username', e.target.value.trim());
  });

  backLogin.addEventListener('click', () => {
    state.authPage = 'login';
    render();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    Object.values(errorEls).forEach((el) => {
      el.classList.add('hidden');
      el.textContent = '';
    });

    const fd = new FormData(form);
    const data = {
      name: (fd.get('name') || '').toString().trim(),
      email: (fd.get('email') || '').toString().trim(),
      username: (fd.get('username') || '').toString().trim(),
      password: (fd.get('password') || '').toString(),
      confirmPassword: (fd.get('confirmPassword') || '').toString(),
      nik: (fd.get('nik') || '').toString().replace(/\D/g, '').slice(0, 16),
      dateOfBirth: (fd.get('dateOfBirth') || '').toString(),
    };

    const errors = {};
    if (!data.name) errors.name = 'Nama harus diisi';
    if (!data.email) errors.email = 'Email harus diisi';
    else if (!/\S+@\S+\.\S+/.test(data.email)) errors.email = 'Format email tidak valid';
    if (!data.username) errors.username = 'Username harus diisi';
    if (!data.password) errors.password = 'Password harus diisi';
    else if (data.password.length < 6) errors.password = 'Password minimal 6 karakter';
    if (data.password !== data.confirmPassword) errors.confirmPassword = 'Password tidak cocok';
    if (!data.nik) errors.nik = 'NIK harus diisi';
    else if (data.nik.length !== 16) errors.nik = 'NIK harus 16 digit';
    if (!data.dateOfBirth) errors.dateOfBirth = 'Tanggal lahir harus diisi';

    const latestUsers = window.storage.getUsers();
    const emailExists = latestUsers.some((u) => u.email === data.email);
    const usernameExists = latestUsers.some((u) => u.username === data.username);
    if (emailExists) errors.email = 'Email sudah terdaftar';
    if (usernameExists) errors.username = 'Username sudah digunakan';

    if (Object.keys(errors).length > 0) {
      Object.keys(errors).forEach((key) => {
        if (errorEls[key]) {
          errorEls[key].textContent = errors[key];
          errorEls[key].classList.remove('hidden');
        }
      });
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Memproses...';

    await window.utils.delay(500);

    const newUser = {
      id: generateUserId(),
      name: data.name,
      fullName: data.name,
      email: data.email,
      username: data.username,
      password: await window.security.hashPassword(data.password),
      nik: data.nik,
      dateOfBirth: data.dateOfBirth,
      role: 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = window.storage.getUsers();
    updatedUsers.push(newUser);
    window.storage.setUsers(updatedUsers);

    successBox.classList.remove('hidden');
    submit.disabled = true;
    submit.textContent = 'Berhasil';

    setTimeout(() => {
      state.authPage = 'login';
      render();
    }, 2000);
  });
}

function renderForgot(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-blue-50';
  wrapper.innerHTML = `
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <button id="back-login" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Login
        </button>

        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 9V5a2 2 0 114 0v4m-6 4h8" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 9h14v10H5z" />
            </svg>
          </div>
          <h1 class="text-gray-900 text-xl font-semibold mb-2" id="forgot-title">Lupa Password?</h1>
          <p class="text-gray-600" id="forgot-subtitle">Masukkan email Anda untuk menerima link reset password</p>
        </div>

        <div id="forgot-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span class="text-red-700" id="forgot-error-text"></span>
        </div>

        <div id="token-box" class="hidden mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-blue-900">Token reset password Anda: <span class="font-mono" id="token-value"></span></p>
          <p class="text-blue-700 text-sm mt-1">(Dalam sistem sebenarnya, ini akan dikirim via email)</p>
        </div>

        <form id="forgot-form" class="space-y-4">
          <div id="email-step">
            <label class="block text-gray-700 mb-2">Email</label>
            <div class="relative">
              <input type="email" name="email" class="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="email@example.com" required="required" />
            </div>
          </div>

          <div id="reset-step" class="hidden space-y-4">
            <div>
              <label class="block text-gray-700 mb-2">Token Reset</label>
              <input type="text" name="token" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase" placeholder="XXXXXX" maxlength="6" />
            </div>
            <div>
              <label class="block text-gray-700 mb-2">Password Baru</label>
              <input type="password" name="newPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" />
            </div>
            <div>
              <label class="block text-gray-700 mb-2">Konfirmasi Password</label>
              <input type="password" name="confirmPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="••••••••" />
            </div>
          </div>

          <button type="submit" id="forgot-submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">Kirim Link Reset</button>
        </form>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  const backLogin = wrapper.querySelector('#back-login');
  const form = wrapper.querySelector('#forgot-form');
  const submitBtn = wrapper.querySelector('#forgot-submit');
  const emailStep = wrapper.querySelector('#email-step');
  const resetStep = wrapper.querySelector('#reset-step');
  const errorBox = wrapper.querySelector('#forgot-error');
  const errorText = wrapper.querySelector('#forgot-error-text');
  const tokenBox = wrapper.querySelector('#token-box');
  const tokenValue = wrapper.querySelector('#token-value');
  const title = wrapper.querySelector('#forgot-title');
  const subtitle = wrapper.querySelector('#forgot-subtitle');

  let step = 'email';
  let generatedToken = '';
  let targetEmail = '';

  backLogin.addEventListener('click', () => {
    state.authPage = 'login';
    render();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    errorText.textContent = '';

    if (step === 'email') {
      const fd = new FormData(form);
      const email = (fd.get('email') || '').toString().trim();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';

    await window.utils.delay(500);
      const users = window.storage.getUsers();
      const user = users.find((u) => u.email === email);
      if (!user) {
        errorText.textContent = 'Email tidak ditemukan';
        errorBox.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Link Reset';
        return;
      }

      generatedToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      targetEmail = email;
      tokenValue.textContent = generatedToken;
      tokenBox.classList.remove('hidden');
      emailStep.classList.add('hidden');
      resetStep.classList.remove('hidden');
      submitBtn.textContent = 'Reset Password';
      submitBtn.disabled = false;
      step = 'reset';
      title.textContent = 'Reset Password';
      subtitle.textContent = 'Masukkan token dan password baru Anda';
      return;
    }

    if (step === 'reset') {
      const fd = new FormData(form);
      const token = (fd.get('token') || '').toString().trim().toUpperCase();
      const newPass = (fd.get('newPassword') || '').toString();
      const confirmPass = (fd.get('confirmPassword') || '').toString();

      if (token !== generatedToken) {
        errorText.textContent = 'Token tidak valid';
        errorBox.classList.remove('hidden');
        return;
      }
      if (newPass.length < 6) {
        errorText.textContent = 'Password minimal 6 karakter';
        errorBox.classList.remove('hidden');
        return;
      }
      if (newPass !== confirmPass) {
        errorText.textContent = 'Password tidak cocok';
        errorBox.classList.remove('hidden');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Memproses...';
      await window.utils.delay(500);

      const users = window.storage.getUsers();
      const idx = users.findIndex((u) => u.email === targetEmail);
      if (idx !== -1) {
        users[idx].password = await window.security.hashPassword(newPass);
        window.storage.setUsers(users);
      }

      // Success screen
      wrapper.innerHTML = `
        <div class="w-full max-w-md mx-auto">
          <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-gray-900 mb-2">Password Berhasil Direset!</h2>
            <p class="text-gray-600 mb-6">Password Anda telah berhasil diubah. Silakan login dengan password baru.</p>
            <button id="back-login" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">Kembali ke Login</button>
          </div>
        </div>
      `;

      wrapper.querySelector('#back-login').addEventListener('click', () => {
        state.authPage = 'login';
        render();
      });
    }
  });
}

function renderTwoFactor(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4';
  wrapper.innerHTML = `
    <div class="w-full max-w-md">
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <button id="back-btn" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Kembali
        </button>

        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m1-3h2a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h2" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 8v1m6-1v1M9 17h6" />
            </svg>
          </div>
          <h1 class="text-gray-900 text-xl font-semibold mb-2">Verifikasi 2FA</h1>
          <p class="text-gray-600">Kode verifikasi telah dikirim ke <br /><span>${state.pendingUser ? state.pendingUser.email : ''}</span></p>
        </div>

        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-blue-900">Kode verifikasi Anda: <span class="font-mono">${state.twoFactorCode}</span></p>
          <p class="text-blue-700 mt-1 text-sm">(Dalam sistem sebenarnya, ini akan dikirim via email)</p>
        </div>

        <div id="twofa-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 20h13.86A2.07 2.07 0 0021 17.93L12 3 3 17.93A2.07 2.07 0 005.07 20z" />
          </svg>
          <span class="text-red-700" id="twofa-error-text"></span>
        </div>

        <form id="twofa-form">
          <div class="flex gap-2 justify-center mb-6">
            ${Array(6)
              .fill(0)
              .map(
                (_, idx) => `
              <input type="text" inputmode="numeric" maxlength="1" data-idx="${idx}" class="w-12 h-14 text-center border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none" ${idx === 0 ? 'autofocus="autofocus"' : ''} />
            `
              )
              .join('')}
          </div>
          <button type="submit" id="twofa-submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors">Verifikasi</button>
        </form>

        <div class="mt-6 text-center">
          <button id="resend" class="text-blue-600 hover:text-blue-700">Kirim Ulang Kode</button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(wrapper);

  const form = wrapper.querySelector('#twofa-form');
  const submitBtn = wrapper.querySelector('#twofa-submit');
  const inputs = wrapper.querySelectorAll('input[data-idx]');
  const errorBox = wrapper.querySelector('#twofa-error');
  const errorText = wrapper.querySelector('#twofa-error-text');
  const resend = wrapper.querySelector('#resend');
  const backBtn = wrapper.querySelector('#back-btn');

  backBtn.addEventListener('click', () => {
    state.needs2FA = false;
    state.pendingUser = null;
    render();
  });

  resend.addEventListener('click', () => {
    state.twoFactorCode = generate2faCode();
    render();
  });

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 1);
      e.target.value = value;
      if (value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
      errorBox.classList.add('hidden');
      errorText.textContent = '';
      if (inputsFilled(inputs)) {
        form.requestSubmit();
      }
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const codeEntered = Array.from(inputs)
      .map((i) => i.value)
      .join('');
    if (codeEntered.length < 6) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Memverifikasi...';

    setTimeout(() => {
      if (codeEntered === state.twoFactorCode) {
        window.storage.setSession(state.pendingUser.id);
        state.currentUser = state.pendingUser;
        state.pendingUser = null;
        state.needs2FA = false;
        (async () => {
          if (window.sync && window.sync.pullSnapshot && state.currentUser) {
            await window.sync.pullSnapshot(state.currentUser.id);
            // Refresh in-memory user with any server-updated data
            const refreshed = window.storage.getUsers().find((u) => u.id === state.currentUser.id);
            if (refreshed) state.currentUser = refreshed;
          }
          render();
        })();
      } else {
        errorText.textContent = 'Kode verifikasi salah';
        errorBox.classList.remove('hidden');
        inputs.forEach((i) => (i.value = ''));
        inputs[0].focus();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verifikasi';
      }
    }, 500);
  });
}

function inputsFilled(inputs) {
  return Array.from(inputs).every((i) => i.value.trim() !== '');
}

function generate2faCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateUserId() {
  return 'user-' + Date.now();
}

/* MAIN APP PLACEHOLDER */
// USER LAYOUT
function renderUserLayout(container) {
  const wrap = document.createElement('div');
  wrap.className = 'min-h-screen bg-gray-50 flex flex-col';

  wrap.innerHTML = `
    <div class="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      <h1 class="text-gray-900 font-semibold">CORETAX</h1>
      <button id="user-menu-toggle" class="p-2 hover:bg-gray-100 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
    <div class="flex flex-1">
      <aside id="user-sidebar" class="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ease-in-out -translate-x-full lg:translate-x-0">
        ${renderUserSidebarContent()}
      </aside>
      <div id="user-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-30 hidden lg:hidden"></div>
      <main class="flex-1 lg:ml-64">
        <div class="p-4 lg:p-8" id="user-page-container"></div>
      </main>
    </div>
  `;

  container.appendChild(wrap);

  const toggle = wrap.querySelector('#user-menu-toggle');
  const sidebar = wrap.querySelector('#user-sidebar');
  const overlay = wrap.querySelector('#user-overlay');
  const links = sidebar.querySelectorAll('[data-page]');
  const logoutBtn = sidebar.querySelector('#user-logout');
  const closeBtn = sidebar.querySelector('#user-close');
  const pageContainer = wrap.querySelector('#user-page-container');

  function updateSidebarActive() {
    links.forEach((link) => {
      if (link.getAttribute('data-page') === state.userPage) {
        link.classList.add('bg-blue-50', 'text-blue-600');
      } else {
        link.classList.remove('bg-blue-50', 'text-blue-600');
      }
    });
  }

  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('hidden');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
  });

  overlay.addEventListener('click', closeSidebar);
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSidebar);
  }

  links.forEach((link) => {
    link.addEventListener('click', () => {
      state.userPage = link.getAttribute('data-page');
      updateSidebarActive();
      renderUserPage(pageContainer);
      closeSidebar();
    });
  });

  logoutBtn.addEventListener('click', () => {
    window.storage.clearSession();
    state.currentUser = null;
    state.authPage = 'login';
    render();
  });

  updateSidebarActive();
  renderUserPage(pageContainer);
}

function renderUserSidebarContent() {
  const user = state.currentUser || {};
  return `
    <div class="flex flex-col h-full">
      <div class="p-6 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h1 class="text-gray-900 font-semibold">CORETAX</h1>
          <button id="user-close" class="lg:hidden p-1 hover:bg-gray-100 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="mt-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p class="text-gray-900 font-semibold">${user.name || ''}</p>
              <p class="text-gray-500 text-sm">${user.role === 'admin' ? 'Admin' : 'User'}</p>
            </div>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-4 space-y-1">
        ${[
          { id: 'dashboard', label: 'Dashboard', icon: iconDashboard() },
          { id: 'profile', label: 'Data Diri', icon: iconUser() },
          { id: 'assets', label: 'Data Kepemilikan', icon: iconCar() },
          { id: 'taxes', label: 'Pajak', icon: iconReceipt() },
          { id: 'settings', label: 'Pengaturan', icon: iconSettings() },
        ]
          .map(
            (item) => `
          <button data-page="${item.id}" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left">
            ${item.icon}
            <span>${item.label}</span>
          </button>`
          )
          .join('')}
      </nav>
      <div class="p-4 border-t border-gray-200">
        <button id="user-logout" class="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          ${iconLogout()}
          <span>Logout</span>
        </button>
      </div>
    </div>
  `;
}

function renderUserPage(container) {
  if (!container) return;
  container.innerHTML = '';
  switch (state.userPage) {
    case 'dashboard':
      container.appendChild(renderUserDashboard());
      break;
    case 'profile':
      container.appendChild(renderUserProfile());
      break;
    case 'assets':
      container.appendChild(renderUserAssets());
      break;
    case 'taxes':
      container.appendChild(renderUserTaxes());
      break;
    case 'settings':
      container.appendChild(renderUserSettings());
      break;
    default:
      container.appendChild(renderUserDashboard());
  }
}

document.addEventListener('DOMContentLoaded', () => {
  boot();
});
