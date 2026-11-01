import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NativeSymbol, type NativeSymbolName } from './NativeControls';
import type { TempoTheme } from '../theme';

// Settings and tool navigation share the same inset, typography and hit area.
export function GroupedNavigationRow({ theme, icon, title, detail, onPress, disabled = false, busy = false, right }: {
  theme: TempoTheme;
  icon: NativeSymbolName;
  title: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  right?: ReactNode;
}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={[title, detail].filter(Boolean).join(', ')}
    accessibilityState={{ disabled, busy }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surfaceMuted : 'transparent' }]}
  >
    <View style={styles.icon}><NativeSymbol name={icon} color={theme.text} size={21} /></View>
    <View style={styles.copy}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {detail ? <Text style={[styles.detail, { color: theme.secondary }]}>{detail}</Text> : null}
    </View>
    {right ?? <Text style={[styles.chevron, { color: theme.tertiary }]}>›</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 15, paddingVertical: 6 },
  icon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16.5, lineHeight: 22, fontWeight: '400', letterSpacing: -.18 },
  detail: { fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  chevron: { fontSize: 25, fontWeight: '300', marginLeft: 8 },
});
