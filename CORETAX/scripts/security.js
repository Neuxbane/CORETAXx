// Basic security helpers for hashing and password verification

const HASH_PREFIX = 'sha256:';

function isHashedPassword(value) {
  return typeof value === 'string' && value.startsWith(HASH_PREFIX);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password || '');
  if (window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return HASH_PREFIX + hex;
  }
  // Fallback (less secure) for environments without SubtleCrypto
  return HASH_PREFIX + btoa(password || '');
}

async function verifyPassword(user, plainPassword) {
  const stored = user.password || '';
  const hashedInput = await hashPassword(plainPassword || '');
  let normalizedUser = user;

  if (!isHashedPassword(stored)) {
    const migratedHash = await hashPassword(stored);
    normalizedUser = { ...user, password: migratedHash };
  }

  const matches = hashedInput === normalizedUser.password;
  return { matches, normalizedUser };
}

async function ensureHashedUsers(users = []) {
  const updated = await Promise.all(
    users.map(async (u) => {
      if (!isHashedPassword(u.password)) {
        return { ...u, password: await hashPassword(u.password || '') };
      }
      return u;
    })
  );
  return updated;
}

window.security = {
  hashPassword,
  verifyPassword,
  ensureHashedUsers,
  isHashedPassword,
};
