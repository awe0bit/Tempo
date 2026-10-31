import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeSymbol, type NativeSymbolName } from '../components/NativeControls';
import { NativeChromeGap, Screen } from '../components/Primitives';
import { t } from '../i18n';
import { radius, type TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

export function ToolsScreen({ theme, snapshot, perform }: {
  theme: TempoTheme;
  snapshot: TempoSnapshot;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const timer = snapshot.pomodoro;
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const columns = width >= 680 && fontScale < 1.4;
  const seconds = Math.max(0, snapshot.displayedRemainingSeconds);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const tools: { id: string; symbol: NativeSymbolName; title: string; detail: string; value: string; status: string; metric: string; action: string }[] = [
    {
      id: 'pomodoro', symbol: 'timer', title: t('settings.pomodoro'),
      detail: t('tools.focusDetail'),
      value: time,
      metric: timer?.mode === 'shortBreak' ? t('focus.shortBreak') : timer?.mode === 'longBreak' ? t('focus.longBreak') : timer?.status === 'running' ? t('focus.running') : timer?.status === 'paused' ? t('focus.paused') : t('tools.readyFocus'),
      status: t('focus.todayProgress', { completed: timer?.completedFocusSessions ?? 0, goal: timer?.dailyFocusGoal ?? 4 }),
      action: t('tools.openFocus'),
    },
    {
      id: 'rss', symbol: 'dot.radiowaves.left.and.right', title: 'RSS',
      detail: t('tools.rssDetail'),
      value: String(snapshot.rss?.unreadCount ?? 0),
      metric: t('tools.unreadArticles'),
      status: t('rss.sources', { count: snapshot.rss?.subscriptions.length ?? 0 }),
      action: t('tools.openRSS'),
    },
  ];

  return <Screen theme={theme}>
    <NativeChromeGap title={t('tools.title')} theme={theme} />
    <ScrollView alwaysBounceVertical showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 49 + insets.bottom + 24 }]}>
      <View style={[styles.grid, columns && styles.columns]}>
        {tools.map((tool) =>
          <Pressable
            key={tool.id}
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}, ${tool.value}, ${tool.metric}, ${tool.status}`}
            accessibilityHint={tool.detail}
            onPress={() => { void perform('tools.open', { tool: tool.id }).catch(() => undefined); }}
            style={({ pressed }) => [styles.card, columns && styles.columnCard, { backgroundColor: theme.groupedSurface, borderColor: theme.cardBorder }, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <NativeSymbol name={tool.symbol} color={theme.accent} size={24} containerSize={30} />
              <Text style={[styles.title, { color: theme.text }]}>{tool.title}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.value, { color: theme.text }]}>{tool.value}</Text>
              <View style={styles.metricCopy}>
                <Text style={[styles.metric, { color: theme.secondary }]}>{tool.metric}</Text>
                <Text style={[styles.status, { color: theme.secondary }]}>{tool.status}</Text>
              </View>
            </View>
            <View style={styles.footer}>
              <Text style={[styles.detail, { color: theme.secondary }]}>{tool.detail}</Text>
              <View style={styles.actionRow}>
                <Text style={[styles.action, { color: theme.accent }]}>{tool.action}</Text>
                <NativeSymbol name="arrow.right" color={theme.accent} size={15} containerSize={22} />
              </View>
            </View>
          </Pressable>
        )}
      </View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 22, paddingHorizontal: 20 },
  grid: { gap: 18, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  columns: { flexDirection: 'row', alignItems: 'stretch' },
  card: { padding: 22, minHeight: 224, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth },
  columnCard: { flex: 1 },
  pressed: { opacity: .82, transform: [{ scale: .985 }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 19, lineHeight: 25, fontWeight: '600', letterSpacing: -.3, flexShrink: 1 },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 22, marginBottom: 20 },
  value: { fontSize: 40, lineHeight: 48, letterSpacing: -1.2, fontWeight: '500', fontVariant: ['tabular-nums'], flexShrink: 1 },
  metricCopy: { flex: 1, minWidth: 0, gap: 3 },
  metric: { fontSize: 13, lineHeight: 18 },
  status: { fontSize: 12, lineHeight: 17 },
  footer: { marginTop: 'auto', gap: 12 },
  detail: { fontSize: 13, lineHeight: 19 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
});
