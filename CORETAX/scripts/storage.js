// Basic localStorage helpers and seed data (mirrors CORETAX_STANDALONE defaults)

const STORAGE_KEYS = {
  USERS: 'users',
  ASSETS: 'assets',
  TAXES: 'taxes',
  TRANSACTIONS: 'transactions',
  USER_LOCATIONS: 'userLocations',
  SESSION: 'sessionToken',
};

async function ensureDefaults() {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const demoUsers = await window.security.ensureHashedUsers([
      {
        id: 'admin-1',
        name: 'Admin System',
        fullName: 'Admin System',
        email: 'admin@pwd.go.id',
        username: 'admin',
        password: 'admin123',
        nik: '0000000000000000',
        dateOfBirth: '1990-01-01',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(demoUsers));
  } else {
    // Migrate any existing plaintext passwords to hashed format
    const users = read(STORAGE_KEYS.USERS, []);
    const hashedUsers = await window.security.ensureHashedUsers(users);
    write(STORAGE_KEYS.USERS, hashedUsers);
  }

  if (!localStorage.getItem(STORAGE_KEYS.ASSETS)) {
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TAXES)) {
    localStorage.setItem(STORAGE_KEYS.TAXES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_LOCATIONS)) {
    localStorage.setItem(STORAGE_KEYS.USER_LOCATIONS, JSON.stringify({}));
  }
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Storage read error', key, err);
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (window.sync && window.sync.recordChange) {
      window.sync.recordChange(key, value);
    }
  } catch (err) {
    console.error('Storage write error', key, err);
  }
}

window.storage = {
  keys: STORAGE_KEYS,
  ensureDefaults,
  read,
  write,
  getUsers: () => read(STORAGE_KEYS.USERS, []),
  setUsers: (users) => write(STORAGE_KEYS.USERS, users),
  getAssets: () => read(STORAGE_KEYS.ASSETS, []),
  setAssets: (assets) => write(STORAGE_KEYS.ASSETS, assets),
  getTaxes: () => read(STORAGE_KEYS.TAXES, []),
  setTaxes: (taxes) => write(STORAGE_KEYS.TAXES, taxes),
  getTransactions: () => read(STORAGE_KEYS.TRANSACTIONS, []),
  setTransactions: (transactions) => write(STORAGE_KEYS.TRANSACTIONS, transactions),
  getUserLocations: () => read(STORAGE_KEYS.USER_LOCATIONS, {}),
  setUserLocations: (locations) => write(STORAGE_KEYS.USER_LOCATIONS, locations),
  getSession: () => localStorage.getItem(STORAGE_KEYS.SESSION),
  setSession: (userId) => localStorage.setItem(STORAGE_KEYS.SESSION, userId),
  clearSession: () => localStorage.removeItem(STORAGE_KEYS.SESSION),
};
