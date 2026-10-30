import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NativeSymbol, type NativeSymbolName } from '../components/NativeControls';
import { Divider, NativeChromeGap, Screen, Section } from '../components/Primitives';
import { t } from '../i18n';
import type { TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

export function ToolsScreen({ theme, snapshot, perform }: {
  theme: TempoTheme;
  snapshot: TempoSnapshot;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const timer = snapshot.pomodoro;
  const tools: { id: string; symbol: NativeSymbolName; title: string; detail: string; status: string }[] = [
    {
      id: 'pomodoro', symbol: 'timer', title: t('settings.pomodoro'),
      detail: t('tools.focusDetail'),
      status: timer?.status === 'running' ? t('focus.running') : timer?.status === 'paused' ? t('focus.paused') : '',
    },
    {
      id: 'rss', symbol: 'dot.radiowaves.left.and.right', title: 'RSS',
      detail: t('tools.rssDetail'),
      status: snapshot.rss?.unreadCount ? t('rss.unread', { count: snapshot.rss.unreadCount }) : '',
    },
  ];

  return <Screen theme={theme}>
    <NativeChromeGap title={t('tools.title')} theme={theme} />
    <ScrollView alwaysBounceVertical contentContainerStyle={styles.content}>
      <Section theme={theme}>
        {tools.map((tool, index) => <View key={tool.id}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}${tool.status ? `, ${tool.status}` : ''}`}
            onPress={() => { void perform('tools.open', { tool: tool.id }).catch(() => undefined); }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surfaceMuted }]}
          >
            <View style={[styles.icon, { backgroundColor: theme.accentSoft }]}>
              <NativeSymbol name={tool.symbol} color={theme.accent} size={22} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: theme.text }]}>{tool.title}</Text>
              <Text style={[styles.detail, { color: theme.secondary }]}>{tool.detail}</Text>
              {tool.status ? <Text style={[styles.status, { color: theme.accent }]}>{tool.status}</Text> : null}
            </View>
            <NativeSymbol name="chevron.right" color={theme.tertiary} size={13} containerSize={24} />
          </Pressable>
          {index < tools.length - 1 ? <Divider theme={theme} inset={74} /> : null}
        </View>)}
      </Section>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 10, paddingBottom: 100 },
  row: { minHeight: 86, paddingHorizontal: 17, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 13 },
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -.2 },
  detail: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  status: { fontSize: 12, lineHeight: 17, marginTop: 5, fontWeight: '500' },
});
