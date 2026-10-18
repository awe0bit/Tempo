import type { PropsWithChildren, ReactNode } from 'react';
import BottomSheet, { BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { radius, spacing, type TempoTheme } from '../theme';

export function Screen({ children, theme, scroll = false, backgroundColor }: PropsWithChildren<{ theme: TempoTheme; scroll?: boolean; backgroundColor?: string }>) {
  const content = <View style={styles.screenContent}>{children}</View>;
  const color = backgroundColor ?? theme.background;
  return (
    <View style={[styles.screen, { backgroundColor: color }]}>
      {scroll ? <ScrollView contentContainerStyle={styles.scrollContent}>{content}</ScrollView> : content}
    </View>
  );
}

export function NativeChromeGap({ title, theme }: { title?: string; theme?: TempoTheme } = {}) {
  return (
    <View style={styles.chromeGap}>
      {title && theme ? <Text style={[styles.chromeTitle, { color: theme.text }]}>{title}</Text> : null}
    </View>
  );
}

export function Section({ children, theme, title }: PropsWithChildren<{ theme: TempoTheme; title?: string }>) {
  return (
    <View style={styles.sectionWrap}>
      {title ? <Text style={[styles.sectionLabel, { color: theme.secondary }]}>{title}</Text> : null}
      <View style={[styles.section, { backgroundColor: theme.groupedSurface, borderColor: theme.cardBorder }]}>{children}</View>
    </View>
  );
}

export function Divider({ theme, inset = 18 }: { theme: TempoTheme; inset?: number }) {
  return <View style={[styles.divider, { backgroundColor: theme.separator, marginLeft: inset }]} />;
}

export function Row({
  theme,
  title,
  detail,
  onPress,
  right,
  destructive,
}: {
  theme: TempoTheme;
  title: string;
  detail?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
}) {
  const body = (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: destructive ? theme.danger : theme.text }]}>{title}</Text>
        {detail ? <Text style={[styles.rowDetail, { color: theme.secondary }]}>{detail}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={[styles.chevron, { color: theme.tertiary }]}>›</Text> : null)}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>{body}</Pressable> : body;
}

export function ToggleRow({ theme, title, value, onValueChange, detail }: {
  theme: TempoTheme; title: string; value: boolean; onValueChange: (value: boolean) => void; detail?: string;
}) {
  return <Row theme={theme} title={title} detail={detail} right={<Switch value={value} onValueChange={onValueChange} trackColor={{ true: theme.accent }} />} />;
}

export function Pill({ theme, label, selected, onPress }: {
  theme: TempoTheme; label: string; selected?: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, { backgroundColor: selected ? theme.accent : theme.surfaceMuted }, pressed && styles.pressed]}>
      <Text style={[styles.pillText, { color: selected ? '#FFFFFF' : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ theme, label, onPress, loading, disabled }: {
  theme: TempoTheme; label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.primary, { backgroundColor: theme.surface, opacity: disabled ? .42 : pressed ? .62 : 1 }]}>
      {loading ? <ActivityIndicator color={theme.accent} /> : <Text style={[styles.primaryText, { color: theme.accent }]}>{label}</Text>}
    </Pressable>
  );
}

export function Sheet({ visible, onClose, children, theme, snapPoints = ['58%', '92%'], initialIndex = 0 }: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  theme: TempoTheme;
  snapPoints?: (string | number)[];
  initialIndex?: number;
}>) {
  return (
    <BottomSheet
      index={visible ? initialIndex : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: theme.groupedBackground }}
    >
      <BottomSheetView style={[styles.sheet, { backgroundColor: theme.groupedBackground }]}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenContent: { flex: 1 },
  scrollContent: { paddingBottom: 44 },
  chromeGap: { height: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 82 },
  chromeTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -.2, textAlign: 'center' },
  sectionWrap: { marginHorizontal: 18, marginBottom: 12 },
  sectionLabel: { fontSize: 13, lineHeight: 18, fontWeight: '500', marginBottom: 6, marginLeft: 8 },
  section: { borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, paddingVertical: 10 },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -.2 },
  rowDetail: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  chevron: { fontSize: 28, fontWeight: '300' },
  pill: { height: 38, paddingHorizontal: spacing.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontSize: 15, fontWeight: '600' },
  primary: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginHorizontal: 18 },
  primaryText: { fontSize: 17, fontWeight: '600' },
  sheet: { flex: 1 },
  pressed: { opacity: .62 },
});
