/** Collapse legacy standalone tool tabs while retaining the user's tab order. */
export function normalizeModuleOrder(value?: string): string[] {
  const seen = new Set<string>();
  for (const id of (value ?? '').split(',').concat(['inbox', 'today', 'tools', 'settings'])) {
    const mapped = ['pomodoro', 'focus', 'rss'].includes(id) ? 'tools' : id;
    if (['inbox', 'today', 'tools', 'settings'].includes(mapped)) seen.add(mapped);
  }
  return [...seen];
}
