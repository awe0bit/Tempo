import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Sheet } from './components/Primitives';
import { useForegroundOTA } from './hooks/useForegroundOTA';
import { useTempo } from './hooks/useTempo';
import { setAppLocale, t } from './i18n';
import { DeveloperToolsContent } from './screens/DeveloperToolsScreen';
import { FocusScreen } from './screens/FocusScreen';
import { RSSScreen } from './screens/RSSScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TasksScreen } from './screens/TasksScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import type { TempoRoute } from './types';

type RuntimeProps = {
  route?: TempoRoute;
  locale?: string;
};

export default function App(props: RuntimeProps) {
  setAppLocale(props.locale);
  const foregroundOTA = useForegroundOTA();
  const tempo = useTempo(props.route);
  const { snapshot, route, theme, error, clearError, command, consumeCommand } = tempo;
  const [developerToolsVisible, setDeveloperToolsVisible] = useState(false);

  useEffect(() => {
    if (command?.type !== 'openDeveloperTools') return;
    setDeveloperToolsVisible(true);
    consumeCommand();
  }, [command, consumeCommand]);

  useEffect(() => {
    if (developerToolsVisible) void foregroundOTA.checkNow();
  }, [developerToolsVisible, foregroundOTA.checkNow]);

  return (
    <SafeAreaProvider style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {snapshot ? <RouteView tempo={tempo} /> : <View style={styles.loading}><ActivityIndicator color={theme.accent} /></View>}
      {error ? <Pressable accessibilityRole="button" accessibilityLabel={t('app.closeError')} onPress={clearError} style={({ pressed }) => [styles.toast, { backgroundColor: theme.dark ? theme.surfaceElevated : theme.text, borderColor: theme.dark ? theme.separator : 'transparent', opacity: pressed ? .82 : 1 }]}><Text numberOfLines={2} style={[styles.toastText, { color: theme.dark ? theme.text : theme.background }]}>{error}</Text><Text style={[styles.toastClose, { color: theme.dark ? theme.secondary : theme.background }]}>×</Text></Pressable> : null}
      {snapshot ? <Sheet visible={developerToolsVisible} onClose={() => setDeveloperToolsVisible(false)} theme={theme} snapPoints={['82%', '96%']}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{t('app.developerTools')}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t('app.closeDeveloperTools')} onPress={() => setDeveloperToolsVisible(false)} style={({ pressed }) => [styles.sheetClose, { backgroundColor: theme.surfaceMuted, opacity: pressed ? .62 : 1 }]}>
            <Text style={[styles.sheetCloseText, { color: theme.secondary }]}>×</Text>
          </Pressable>
        </View>
        <DeveloperToolsContent theme={theme} snapshot={snapshot} foregroundOTA={foregroundOTA} />
      </Sheet> : null}
    </SafeAreaProvider>
  );
}

function RouteView({ tempo }: { tempo: ReturnType<typeof useTempo> }) {
  const { snapshot, route, theme, command, consumeCommand, perform } = tempo;
  if (!snapshot) return null;
  if (route === 'tools') return <ToolsScreen theme={theme} snapshot={snapshot} perform={perform} />;
  if (route === 'inbox' || route === 'today') return <TasksScreen route={route} theme={theme} tasks={snapshot.tasks} supportsSelectionFeedback={snapshot.capabilities?.includes('feedback.selection') ?? false} command={command} consumeCommand={consumeCommand} perform={perform} />;
  if (route === 'focus') return <FocusScreen theme={theme} pomodoro={snapshot.pomodoro} remaining={snapshot.displayedRemainingSeconds} command={command} consumeCommand={consumeCommand} perform={perform} />;
  if (route === 'rss') return <RSSScreen theme={theme} articles={snapshot.rss?.articles ?? []} subscriptions={snapshot.rss?.subscriptions ?? []} folders={snapshot.rss?.folders ?? []} phase={snapshot.rss?.phase ?? 'idle'} command={command} consumeCommand={consumeCommand} perform={perform} />;
  return <SettingsScreen theme={theme} snapshot={snapshot} perform={perform} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 84, zIndex: 100, minHeight: 50, borderRadius: 25, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 18, paddingRight: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: .28, shadowRadius: 18, shadowOffset: { width: 0, height: 9 } },
  toastText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  toastClose: { width: 30, textAlign: 'center', fontSize: 22, fontWeight: '500', opacity: .72 },
  sheetHeader: { height: 58, paddingLeft: 24, paddingRight: 16, flexDirection: 'row', alignItems: 'center' },
  sheetTitle: { flex: 1, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -.35 },
  sheetClose: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { fontSize: 24, lineHeight: 27, fontWeight: '400', marginTop: -2 },
});
