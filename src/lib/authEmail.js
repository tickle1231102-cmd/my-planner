import { normalizeUserKey } from './userIdentity.js'

/** Supabase Auth rejects `.local` addresses — use a reserved test TLD instead. */
export const AUTH_EMAIL_SUFFIX = '@myplanner.test'

export function userKeyToAuthEmail(userKey) {
  return `${normalizeUserKey(userKey)}${AUTH_EMAIL_SUFFIX}`
}
