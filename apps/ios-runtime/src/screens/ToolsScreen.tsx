import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NativeSymbolName } from '../components/NativeControls';
import { GroupedNavigationRow } from '../components/GroupedNavigationRow';
import { Divider, NativeChromeGap, Screen, Section } from '../components/Primitives';
import { t } from '../i18n';
import { spacing, type TempoTheme } from '../theme';
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
  const tools: { id: Tool; icon: NativeSymbolName; title: string; detail: string; status?: string }[] = [
    {
      id: 'pomodoro',
      icon: 'timer',
      title: t('settings.pomodoro'),
      detail: t('tools.focusDetail'),
      status: timer?.status === 'running' ? t('focus.running') : timer?.status === 'paused' ? t('focus.paused') : undefined,
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
      <View style={styles.directory}><Section theme={theme}>
        {tools.map((tool, index) => <View key={tool.id}>
          <GroupedNavigationRow
            theme={theme}
            icon={tool.icon}
            title={tool.title}
            detail={tool.status ?? tool.detail}
            disabled={Boolean(opening)}
            busy={opening === tool.id}
            onPress={() => void openTool(tool.id)}
            right={opening === tool.id ? <ActivityIndicator size="small" color={theme.accent} /> : undefined}
          />
          {index < tools.length - 1 ? <Divider theme={theme} inset={68} /> : null}
        </View>)}
      </Section></View>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 6 },
  directory: { width: '100%', maxWidth: 680, alignSelf: 'center' },
});
