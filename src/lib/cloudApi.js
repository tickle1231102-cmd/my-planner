import { loadAppData, saveAppData } from './cloudDataClient.js'
import { isSupabaseConfigured } from './supabaseBrowser.js'

export { isSupabaseConfigured }

export async function fetchAppData(userKey) {
  return loadAppData(userKey)
}

export async function persistAppData(userKey, payload) {
  return saveAppData(userKey, payload)
}
