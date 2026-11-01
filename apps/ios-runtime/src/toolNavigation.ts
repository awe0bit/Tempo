export type ToolRoute = 'tools' | 'focus' | 'rss';

export function initialToolState(route: ToolRoute) {
  return {
    index: route === 'tools' ? 0 : 1,
    routes: route === 'tools' ? [{ name: 'tools' }] : [{ name: 'tools' }, { name: route }],
  };
}

export function toolRouteTransition(current: string | undefined, requested: ToolRoute) {
  if (current === requested) return 'none';
  if (requested === 'tools') return 'pop';
  return current === 'tools' ? 'push' : 'replace';
}
