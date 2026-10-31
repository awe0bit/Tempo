import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeSymbol, type NativeSymbolName } from '../components/NativeControls';
import { NativeChromeGap, Screen } from '../components/Primitives';
import { t } from '../i18n';
import { radius, spacing, type TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Tool = 'pomodoro' | 'rss';

export function ToolsScreen({ theme, snapshot, perform }: {
  theme: TempoTheme;
  snapshot: TempoSnapshot;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const insets = useSafeAreaInsets();
  const [opening, setOpening] = useState<Tool>();
  const timer = snapshot.pomodoro;
  const tools: { id: Tool; icon: NativeSymbolName; title: string; detail: string; status?: string; active?: boolean }[] = [
    {
      id: 'pomodoro',
      icon: 'timer',
      title: t('settings.pomodoro'),
      detail: t('tools.focusDetail'),
      status: timer?.status === 'running' ? t('focus.running') : timer?.status === 'paused' ? t('focus.paused') : undefined,
      active: timer?.status === 'running',
    },
    {
      id: 'rss',
      icon: 'dot.radiowaves.left.and.right',
      title: 'RSS',
      detail: t('tools.rssDetail'),
      status: snapshot.rss?.unreadCount ? t('rss.unread', { count: snapshot.rss.unreadCount }) : undefined,
    },
  ];

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
    <ScrollView alwaysBounceVertical showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: 49 + insets.bottom + spacing.xl }]}>
      <View style={styles.directory}>
        {tools.map((tool, index) => <View key={tool.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={[tool.title, tool.detail, tool.status].filter(Boolean).join(', ')}
            accessibilityState={{ disabled: Boolean(opening), busy: opening === tool.id }}
            disabled={Boolean(opening)}
            onPress={() => void openTool(tool.id)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surfaceMuted, opacity: .72 }]}
          >
            <View style={styles.icon}>
              <NativeSymbol name={tool.icon} color={theme.text} size={26} containerSize={36} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>{tool.title}</Text>
              <Text style={[styles.detail, { color: theme.secondary }]}>{tool.detail}</Text>
              {tool.status ? <Text style={[styles.status, { color: tool.active ? theme.accent : theme.secondary }]}>{tool.status}</Text> : null}
            </View>
            <View style={styles.disclosure}>
              {opening === tool.id ? <ActivityIndicator size="small" color={theme.accent} /> : <NativeSymbol name="chevron.right" color={theme.tertiary} size={12} containerSize={24} />}
            </View>
          </Pressable>
          {index < tools.length - 1 ? <View style={[styles.separator, { backgroundColor: theme.separator }]} /> : null}
        </View>)}
      </View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  directory: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  row: { minHeight: 104, flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.lg, borderRadius: radius.medium, borderCurve: 'continuous' },
  icon: { width: 44, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { fontSize: 17, lineHeight: 23, fontWeight: '500', letterSpacing: -.2 },
  detail: { fontSize: 13, lineHeight: 20 },
  status: { fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  disclosure: { width: 24, marginRight: spacing.xs, alignItems: 'center', justifyContent: 'center' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 44 + spacing.lg },
});
