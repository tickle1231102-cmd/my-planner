import { loadAppData, saveAppData } from './cloudDataClient.js'
import { isSupabaseConfigured } from './supabaseBrowser.js'

export { isSupabaseConfigured }

export async function fetchAppData() {
  return loadAppData()
}

export async function persistAppData(payload) {
  return saveAppData(payload)
}
