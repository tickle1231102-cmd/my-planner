export const USER_KEY_STORAGE = 'my-planner-user-key'
export const GUEST_USER_KEY = 'guest'
export const LOCAL_USER_KEY = 'local-device'

const USER_KEY_RE = /^[a-zA-Z0-9가-힣_-]{3,32}$/

export function normalizeUserKey(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
}

export function isValidUserKey(userKey) {
  return USER_KEY_RE.test(userKey)
}

export function getSavedUserKey() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(USER_KEY_STORAGE)
}

export function saveUserKey(userKey) {
  localStorage.setItem(USER_KEY_STORAGE, normalizeUserKey(userKey))
}

export function clearUserKey() {
  localStorage.removeItem(USER_KEY_STORAGE)
}
