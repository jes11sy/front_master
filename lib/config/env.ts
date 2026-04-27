export const DEFAULT_API_BASE_URL = 'https://api.lead-schem.ru/api/v1'

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
}
