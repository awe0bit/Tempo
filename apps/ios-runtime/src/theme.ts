import type { ColorSchemeName } from 'react-native';

export type TempoTheme = ReturnType<typeof makeTheme>;

export function makeTheme(scheme: ColorSchemeName | 'light' | 'dark') {
  const dark = scheme === 'dark';
  return {
    dark,
    background: dark ? '#0B0B0B' : '#F3F4F5',
    groupedBackground: dark ? '#111111' : '#F3F4F5',
    groupedSurface: dark ? 'rgba(32,32,32,0.78)' : '#FFFFFF',
    surface: dark ? '#171717' : '#FFFFFF',
    surfaceElevated: dark ? '#222222' : '#FFFFFF',
    surfaceMuted: dark ? '#2A2A2A' : '#EAEBED',
    text: dark ? '#F5F5F5' : '#1A1C1F',
    secondary: dark ? '#A3A3A3' : '#74777C',
    tertiary: dark ? '#737373' : '#96999E',
    separator: dark ? '#303030' : '#E4E5E7',
    cardBorder: dark ? 'rgba(255,255,255,0.08)' : 'rgba(26,28,31,0.04)',
    accent: '#339CFF',
    accentSoft: dark ? '#1B2A38' : '#EAF5FF',
    success: dark ? '#56C596' : '#34C759',
    danger: dark ? '#FF6B65' : '#FF3B30',
    warning: dark ? '#E8AF57' : '#FF9500',
    shadow: '#000000',
  };
}

export const radius = { small: 10, medium: 16, large: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
