export function resolveLiveTemplate(requested, configured) {
  if (requested === 'spotlight' || configured === 'spotlight') return 'spotlight';
  return 'classic';
}
