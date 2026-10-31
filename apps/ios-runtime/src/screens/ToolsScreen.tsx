import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeSymbol } from '../components/NativeControls';
import { NativeChromeGap, Screen } from '../components/Primitives';
import { relativeTime, t } from '../i18n';
import { radius, type TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Tool = 'pomodoro' | 'rss';

export function ToolsScreen({ theme, snapshot, perform }: {
  theme: TempoTheme;
  snapshot: TempoSnapshot;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [opening, setOpening] = useState<Tool>();
  const wide = width >= 760 && fontScale < 1.4;
  const largeText = fontScale >= 1.4;
  const timer = snapshot.pomodoro;
  const seconds = Math.max(0, snapshot.displayedRemainingSeconds);
  const time = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
  const completed = timer?.completedFocusSessions ?? 0;
  const goal = Math.max(1, timer?.dailyFocusGoal ?? 4);
  const goalWidth = `${Math.min(100, Math.max(0, completed / goal * 100))}%` as `${number}%`;
  const mode = timer?.mode === 'shortBreak' ? t('focus.shortBreak') : timer?.mode === 'longBreak' ? t('focus.longBreak') : timer?.timerDirection === 'countUp' ? t('focus.stopwatch') : t('focus.pomodoroTimer');
  const status = timer?.status === 'running' ? t('focus.running') : timer?.status === 'paused' ? t('focus.paused') : t('tools.readyFocus');
  const articles = snapshot.rss?.articles;
  const recent = useMemo(() => [...(articles ?? [])]
    .sort((a, b) => Number(a.isRead) - Number(b.isRead) || (b.publishedAt ?? b.fetchedAt).localeCompare(a.publishedAt ?? a.fetchedAt))
    .slice(0, 2), [articles]);

  async function openTool(tool: Tool) {
    if (opening) return;
    setOpening(tool);
    try {
      await perform('tools.open', { tool });
    } catch {
      // The shared error banner reports bridge failures.
    } finally {
      setOpening(undefined);
    }
  }

  return <Screen theme={theme}>
    <NativeChromeGap title={t('tools.title')} theme={theme} />
    <ScrollView alwaysBounceVertical showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 49 + insets.bottom + 24 }]}>
      <View style={[styles.layout, wide && styles.wideLayout]}>
        <View style={[styles.panel, wide && styles.focusColumn, { backgroundColor: theme.groupedSurface, borderColor: theme.cardBorder }]}>
          <View style={styles.heading}>
            <NativeSymbol name="timer" color={theme.accent} size={22} containerSize={28} />
            <Text style={[styles.title, { color: theme.text }]}>{t('settings.pomodoro')}</Text>
          </View>

          <View style={[styles.focusBody, largeText && styles.vertical]}>
            <View style={[styles.timerCopy, largeText && styles.stackedTimerCopy]}>
              <Text style={[styles.eyebrow, { color: theme.secondary }]}>{mode}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.time, { color: theme.text }]}>{time}</Text>
              <Text style={[styles.status, { color: timer?.status === 'running' ? theme.accent : theme.secondary }]}>{status}</Text>
            </View>
            <View style={[styles.goal, largeText && styles.goalLeading]}>
              <Text style={[styles.eyebrow, { color: theme.secondary }]}>{t('tools.completedToday')}</Text>
              <Text style={[styles.goalNumber, { color: theme.text }]}>{completed}<Text style={[styles.goalTotal, { color: theme.tertiary }]}> / {goal}</Text></Text>
            </View>
          </View>

          <View accessibilityRole="progressbar" accessibilityLabel={t('tools.completedToday')} accessibilityValue={{ min: 0, max: goal, now: Math.min(completed, goal) }} style={[styles.track, { backgroundColor: theme.surfaceMuted }]}>
            <View style={[styles.fill, { width: goalWidth, backgroundColor: theme.accent }]} />
          </View>
          <Pressable accessibilityRole="button" disabled={Boolean(opening)} onPress={() => void openTool('pomodoro')} style={({ pressed }) => [styles.focusAction, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
            <Text style={styles.focusActionLabel}>{t('tools.openFocus')}</Text>
            {opening === 'pomodoro' ? <ActivityIndicator size="small" color="#FFFFFF" /> : <NativeSymbol name="arrow.up.right" color="#FFFFFF" size={15} containerSize={22} />}
          </Pressable>
        </View>

        <View style={[styles.panel, wide && styles.readingColumn, { backgroundColor: theme.groupedSurface, borderColor: theme.cardBorder }]}>
          <View style={styles.heading}>
            <NativeSymbol name="dot.radiowaves.left.and.right" color={theme.accent} size={22} containerSize={28} />
            <Text style={[styles.title, { color: theme.text }]}>RSS</Text>
            <Text style={[styles.unread, { color: theme.secondary }]}>{t('rss.unread', { count: snapshot.rss?.unreadCount ?? 0 })}</Text>
          </View>
          <Text style={[styles.sources, { color: theme.secondary }]}>{t('rss.sources', { count: snapshot.rss?.subscriptions.length ?? 0 })}</Text>

          {recent.length ? <View style={styles.articles}>
            {recent.map((article, index) => <View key={article.id} style={[styles.article, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
              <View style={styles.articleMeta}>
                <Text numberOfLines={1} style={[styles.feed, { color: theme.secondary }]}>{article.feedTitle}</Text>
                <Text style={[styles.articleDate, { color: theme.tertiary }]}>{relativeTime(article.publishedAt ?? article.fetchedAt)}</Text>
              </View>
              <Text numberOfLines={2} style={[styles.articleTitle, { color: theme.text }]}>{article.title}</Text>
            </View>)}
          </View> : <View style={styles.emptyReading}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('tools.readingEmptyTitle')}</Text>
            <Text style={[styles.emptyDetail, { color: theme.secondary }]}>{t('tools.readingEmptyDetail')}</Text>
          </View>}

          <Pressable accessibilityRole="button" disabled={Boolean(opening)} onPress={() => void openTool('rss')} style={({ pressed }) => [styles.readingAction, { borderTopColor: theme.separator }, pressed && styles.pressed]}>
            <Text style={[styles.readingActionLabel, { color: theme.accent }]}>{t('tools.openReader')}</Text>
            {opening === 'rss' ? <ActivityIndicator size="small" color={theme.accent} /> : <NativeSymbol name="arrow.up.right" color={theme.accent} size={15} containerSize={22} />}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 20, paddingHorizontal: 20 },
  layout: { width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 20 },
  wideLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  panel: { paddingHorizontal: 22, paddingTop: 22, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth },
  focusColumn: { flex: 1 },
  readingColumn: { flex: 1.2 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -.25 },
  focusBody: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 28, marginBottom: 22 },
  vertical: { flexDirection: 'column', alignItems: 'flex-start' },
  timerCopy: { flex: 1, minWidth: 0, alignSelf: 'stretch' },
  stackedTimerCopy: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  eyebrow: { fontSize: 12, lineHeight: 18 },
  time: { fontSize: 49, lineHeight: 59, fontWeight: '500', letterSpacing: -1.8, fontVariant: ['tabular-nums'], marginTop: 2 },
  status: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  goal: { alignItems: 'flex-end', gap: 6 },
  goalLeading: { alignItems: 'flex-start' },
  goalNumber: { fontSize: 24, lineHeight: 30, fontWeight: '500', fontVariant: ['tabular-nums'] },
  goalTotal: { fontSize: 16, fontWeight: '400' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  fill: { height: 3, borderRadius: 2 },
  focusAction: { minHeight: 46, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 },
  focusActionLabel: { color: '#FFFFFF', fontSize: 15, lineHeight: 21, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: .7, transform: [{ scale: .985 }] },
  unread: { fontSize: 12, lineHeight: 18, flexShrink: 1, textAlign: 'right' },
  sources: { fontSize: 12, lineHeight: 18, marginLeft: 37, marginTop: 1 },
  articles: { marginTop: 12 },
  article: { paddingVertical: 17, gap: 6 },
  articleMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  feed: { flex: 1, fontSize: 11.5, lineHeight: 17 },
  articleDate: { fontSize: 11, lineHeight: 17 },
  articleTitle: { fontSize: 16, lineHeight: 23, fontWeight: '500', letterSpacing: -.15 },
  emptyReading: { paddingVertical: 30, gap: 8 },
  emptyTitle: { fontSize: 17, lineHeight: 23, fontWeight: '500' },
  emptyDetail: { fontSize: 13, lineHeight: 20 },
  readingAction: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  readingActionLabel: { fontSize: 14, lineHeight: 21, fontWeight: '500', flexShrink: 1 },
});
