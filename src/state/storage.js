// storage.js
//
// Thin, generic localStorage wrapper. Every persisted key is namespaced
// under "recoup." so it's easy to see everything the app stores, and easy
// to nuke everything at once (see resetAll) without touching unrelated
// browser storage.

const PREFIX = "recoup.";

export function loadValue(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveValue(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded situations;
    // the app should keep working in-memory even if persistence fails.
  }
}

export function resetAll(keys) {
  for (const key of keys) {
    localStorage.removeItem(PREFIX + key);
  }
}
