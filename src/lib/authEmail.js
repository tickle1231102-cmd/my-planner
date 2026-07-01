import { normalizeUserKey } from './userIdentity.js'

/** Current Auth email suffix (Supabase rejects `.local`). */
export const AUTH_EMAIL_SUFFIX = '@myplanner.test'

/** Earlier builds registered users with this suffix before the domain change. */
export const LEGACY_AUTH_EMAIL_SUFFIX = '@planner.local'

export function userKeyToAuthEmail(userKey) {
  return `${normalizeUserKey(userKey)}${AUTH_EMAIL_SUFFIX}`
}

export function userKeyToLegacyAuthEmail(userKey) {
  return `${normalizeUserKey(userKey)}${LEGACY_AUTH_EMAIL_SUFFIX}`
}

/** Try current suffix first, then legacy. */
export function userKeyToAuthEmailCandidates(userKey) {
  const key = normalizeUserKey(userKey)
  return [`${key}${AUTH_EMAIL_SUFFIX}`, `${key}${LEGACY_AUTH_EMAIL_SUFFIX}`]
}
