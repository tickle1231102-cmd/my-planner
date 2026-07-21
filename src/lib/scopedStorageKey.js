import { normalizeUserKey } from './userIdentity.js'

export const LOCAL_SCOPE_FLAG = 'my-planner-local-scoped-v1'

export function scopedStorageKey(baseKey, userKey) {
  const key = normalizeUserKey(userKey)
  if (!key) return baseKey
  return `${baseKey}:${key}`
}

export function isLocalScopedMode() {
  return localStorage.getItem(LOCAL_SCOPE_FLAG) === '1'
}

export function enableLocalScopedMode() {
  localStorage.setItem(LOCAL_SCOPE_FLAG, '1')
}
