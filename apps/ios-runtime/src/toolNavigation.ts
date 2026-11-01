export type ToolRoute = 'tools' | 'focus' | 'rss';

export function initialToolState(route: ToolRoute) {
  return {
    index: route === 'tools' ? 0 : 1,
    routes: route === 'tools' ? [{ name: 'tools' }] : [{ name: 'tools' }, { name: route, key: `tool-initial-${route}` }],
  };
}

export function toolRouteTransition(current: string | undefined, requested: ToolRoute) {
  if (current === requested) return 'none';
  if (requested === 'tools') return 'pop';
  return current === 'tools' ? 'push' : 'replace';
}

export function toolChromeVisibility(progress: number, closing: boolean) {
  const value = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return closing ? 1 - value : value;
}
