const clickIds = new Set(['gclid', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'fbclid'])

/** Keep landing attribution when the gallery replaces its own query parameters. */
export function preserveAttributionQuery(galleryQuery: string, currentSearch: string) {
  const params = new URLSearchParams(galleryQuery)
  for (const [key, value] of new URLSearchParams(currentSearch)) {
    if (key.startsWith('utm_') || clickIds.has(key)) params.set(key, value)
  }
  return params.size ? `?${params}` : ''
}
