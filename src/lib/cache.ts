export const CACHE_POLICIES = {
  noStore: 'no-store',
  privateShort: 'private, max-age=15, stale-while-revalidate=30',
  privateMedium: 'private, max-age=300',
  publicStatic: 'public, max-age=31536000, immutable',
} as const

export type CachePolicy = keyof typeof CACHE_POLICIES

export function cacheControlValue(policy: CachePolicy = 'noStore') {
  return CACHE_POLICIES[policy]
}

export function cacheHeaders(policy: CachePolicy = 'noStore') {
  return { 'Cache-Control': cacheControlValue(policy) }
}
