import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTransitionProgress } from 'react-native-screens';
import DragList, { type DragListRenderItemInfo } from 'react-native-draglist';

import { NativeSymbol, type NativeSymbolName } from '../components/NativeControls';
import { Divider, Row, Screen, Section, ToggleRow } from '../components/Primitives';
import { SlidingSegmentedControl } from '../components/SlidingSegmentedControl';
import { t } from '../i18n';
import { tempoNative } from '../native/TempoNative';
import type { TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Page = 'sync' | 'ai' | 'focus' | 'appearance' | 'calendar' | 'modules' | 'about';
type SettingsStackParamList = {
  home: undefined;
  detail: { page: Page };
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsScreen({ theme, snapshot, perform }: { theme: TempoTheme; snapshot: TempoSnapshot; perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T> }) {
  const [message, setMessage] = useState('');
  const navigationThemeBase = theme.dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...navigationThemeBase,
    colors: {
      ...navigationThemeBase.colors,
      primary: theme.accent,
      background: theme.background,
      card: theme.background,
      text: theme.text,
      border: theme.separator,
      notification: theme.accent,
    },
  };

  return <NavigationContainer theme={navigationTheme}>
    <Stack.Navigator screenOptions={{
      contentStyle: { backgroundColor: theme.background },
      headerStyle: { backgroundColor: theme.background },
      headerTintColor: theme.accent,
      headerTitleAlign: 'center',
      headerTitleStyle: { color: theme.text, fontSize: 17, fontWeight: '700' },
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animationMatchesGesture: true,
      animation: 'slide_from_right',
    }}>
      <Stack.Screen name="home" options={{ title: t('settings.title') }}>
        {({ navigation }) => <SettingsHome theme={theme} snapshot={snapshot} openPage={(page) => { setMessage(''); navigation.navigate('detail', { page }); }} />}
      </Stack.Screen>
      <Stack.Screen name="detail" options={({ route }) => ({ title: pageTitle(route.params.page) })}>
        {({ route, navigation }) => <DetailPage navigation={navigation} page={route.params.page} theme={theme} snapshot={snapshot} perform={perform} message={message} setMessage={setMessage} />}
      </Stack.Screen>
    </Stack.Navigator>
  </NavigationContainer>;
}

function SettingsHome({ theme, snapshot, openPage }: { theme: TempoTheme; snapshot: TempoSnapshot; openPage: (page: Page) => void }) {
  return <Screen theme={theme} backgroundColor={theme.background}>
    <ScrollView style={styles.scroll} alwaysBounceVertical contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Section theme={theme}>
        <SettingRow theme={theme} icon="arrow.triangle.2.circlepath" title={t('settings.sync')} onPress={() => openPage('sync')} /><Divider theme={theme} inset={68} />
        <SettingRow theme={theme} icon="sparkles" title={t('settings.ai')} onPress={() => openPage('ai')} /><Divider theme={theme} inset={68} />
        <SettingRow theme={theme} icon="timer" title={t('settings.pomodoro')} onPress={() => openPage('focus')} />
      </Section>
      <Section theme={theme}>
        <SettingRow theme={theme} icon="circle.lefthalf.filled" title={t('settings.appearance')} detail={appearanceLabel(snapshot.preferences?.appearance)} onPress={() => openPage('appearance')} /><Divider theme={theme} inset={68} />
        <SettingRow theme={theme} icon="calendar" title={t('settings.calendar')} onPress={() => openPage('calendar')} /><Divider theme={theme} inset={68} />
        <SettingRow theme={theme} icon="square.grid.2x2" title={t('settings.modules')} onPress={() => openPage('modules')} />
      </Section>
      <Section theme={theme}>
        <SettingRow theme={theme} icon="info.circle" title={t('settings.about')} detail={`${t('settings.tagline')} · v${snapshot.app?.version ?? t('common.notAvailable')}`} onPress={() => openPage('about')} />
      </Section>
    </ScrollView>
  </Screen>;
}

function DetailPage({ navigation, page, theme, snapshot, perform, message, setMessage }: { navigation: any; page: Page; theme: TempoTheme; snapshot: TempoSnapshot; perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>; message: string; setMessage: (value: string) => void }) {
  const transition = useTransitionProgress();

  useEffect(() => {
    let progressValue = 0;
    let closingValue = 0;
    let lastVisibility = -1;
    const publishVisibility = () => {
      const visibility = Math.max(0, Math.min(1, closingValue >= .5 ? progressValue : 1 - progressValue));
      if (Math.abs(visibility - lastVisibility) < .004) return;
      lastVisibility = visibility;
      tempoNative.setNavigationProgress(visibility);
    };
    const progressListener = transition.progress.addListener(({ value }) => {
      progressValue = value;
      publishVisibility();
    });
    const closingListener = transition.closing.addListener(({ value }) => {
      closingValue = value;
      publishVisibility();
    });

    tempoNative.setNavigationDepth(1);
    const stopTransitionStart = navigation.addListener('transitionStart', (event: { data: { closing: boolean } }) => {
      tempoNative.setNavigationDepth(event.data.closing ? 0 : 1);
    });
    const stopGestureCancel = navigation.addListener('gestureCancel', () => tempoNative.setNavigationDepth(1));
    const stopTransitionEnd = navigation.addListener('transitionEnd', (event: { data: { closing: boolean } }) => {
      if (!event.data.closing) tempoNative.setNavigationDepth(1);
    });
    return () => {
      transition.progress.removeListener(progressListener);
      transition.closing.removeListener(closingListener);
      stopTransitionStart();
      stopGestureCancel();
      stopTransitionEnd();
      tempoNative.setNavigationProgress(1);
      tempoNative.setNavigationDepth(0);
    };
  }, [navigation, transition.closing, transition.progress]);
  const content = page === 'sync' ? <SyncSettings theme={theme} value={snapshot.sync} perform={perform} setMessage={setMessage} /> : page === 'ai' ? <AISettings theme={theme} value={snapshot.ai} perform={perform} setMessage={setMessage} /> : page === 'focus' ? <FocusSettings theme={theme} value={snapshot.pomodoro} perform={perform} /> : page === 'appearance' ? <AppearanceSettings theme={theme} value={snapshot.preferences?.appearance} perform={perform} /> : page === 'calendar' ? <CalendarSettings theme={theme} value={snapshot.preferences} perform={perform} /> : page === 'modules' ? <ModuleSettings theme={theme} value={snapshot.preferences?.moduleOrder} supportsSelectionFeedback={snapshot.capabilities?.includes('feedback.selection') ?? false} perform={perform} /> : <AboutSettings theme={theme} value={snapshot.app} perform={perform} setMessage={setMessage} />;

  return <Screen theme={theme} backgroundColor={theme.background}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{page === 'modules' ? <View style={styles.modulePage}>{content}</View> : <ScrollView style={styles.scroll} alwaysBounceVertical contentInsetAdjustmentBehavior="automatic" keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.detailContent}>{content}{message ? <Text style={[styles.message, { color: theme.secondary }]}>{message}</Text> : null}</ScrollView>}</KeyboardAvoidingView></Screen>;
}
function SyncSettings({ theme, value, perform, setMessage }: any) { const [serverURL, setServerURL] = useState(value?.serverURL ?? ''); const [deviceName, setDeviceName] = useState(value?.deviceName ?? 'iPhone'); const [token, setToken] = useState(''); const [autoSync, setAutoSync] = useState(value?.autoSync ?? true); async function save(test = false) { setMessage(test ? t('settings.testingConnection') : t('settings.saving')); try { const payload = { serverURL, deviceName, token, autoSync }; await perform(test ? 'sync.test' : 'sync.save', payload); setMessage(test ? t('settings.connectionSuccess') : t('settings.savedAutoSync')); } catch { setMessage(t('settings.connectionFailed')); } } return <><Section theme={theme} title={t('settings.server')}><Field theme={theme} label={t('settings.serverURL')} value={serverURL} onChange={setServerURL} placeholder="https://sync.example.com" /><Divider theme={theme} /><Field theme={theme} label={t('settings.deviceName')} value={deviceName} onChange={setDeviceName} /><Divider theme={theme} /><Field theme={theme} label={t('settings.token')} value={token} onChange={setToken} placeholder={value?.hasToken ? t('settings.tokenSavedPlaceholder') : t('settings.tokenPlaceholder')} secure /></Section><Section theme={theme}><ToggleRow theme={theme} title={t('settings.autoSync')} detail={t('settings.autoSyncDetail')} value={autoSync} onValueChange={setAutoSync} /><Divider theme={theme} /><Row theme={theme} title={t('settings.currentStatus')} detail={`${syncLabel(value?.phase, value?.pendingChangeCount ?? 0)} · revision ${value?.revision ?? 0}`} /></Section><Section theme={theme}><ActionRow theme={theme} title={t('settings.saveConfiguration')} onPress={() => save(false)} /><Divider theme={theme} /><ActionRow theme={theme} title={t('settings.testConnection')} onPress={() => save(true)} /><Divider theme={theme} /><ActionRow theme={theme} title={t('settings.syncNow')} onPress={() => perform('sync.now')} /></Section></>; }
function AISettings({ theme, value, perform, setMessage }: any) {
  const [mode, setMode] = useState(value?.mode ?? 'openAI');
  const [baseURL, setBaseURL] = useState(value?.baseURL ?? 'https://api.openai.com/v1');
  const [model, setModel] = useState(value?.model ?? 'gpt-5-mini');
  const [apiKey, setAPIKey] = useState('');
  const [summaryPrompt, setPrompt] = useState(value?.summaryPrompt ?? '');
  const presets: Record<string, { url: string; model: string }> = {
    openAI: { url: 'https://api.openai.com/v1', model: 'gpt-5-mini' },
    deepSeek: { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    compatible: { url: baseURL, model },
  };
  async function save(test = false) {
    const payload = { mode, baseURL, model, apiKey, summaryPrompt };
    setMessage(t('settings.saving'));
    try {
      await perform('ai.save', payload);
      if (test) await perform('ai.test');
      setMessage(test ? t('settings.modelConnected') : t('settings.aiSaved'));
    } catch {
      setMessage(t('settings.modelConnectionFailed'));
    }
  }
  const providers = ['openAI', 'deepSeek', 'compatible'] as const;
  const selectProvider = (item: typeof providers[number]) => {
    setMode(item);
    const preset = presets[item];
    if (preset) {
      setBaseURL(preset.url);
      setModel(preset.model);
    }
  };
  return <>
    <Section theme={theme} title={t('settings.provider')}>
      <SlidingSegmentedControl theme={theme} values={providers} value={mode} label={(item) => item === 'openAI' ? 'OpenAI' : item === 'deepSeek' ? 'DeepSeek' : t('settings.compatibleAPI')} onChange={selectProvider} height={42} style={styles.providerControl} />
    </Section>
    <Section theme={theme} title={t('settings.model')}><Field theme={theme} label={t('settings.apiURL')} value={baseURL} onChange={setBaseURL} /><Divider theme={theme} /><Field theme={theme} label={t('settings.model')} value={model} onChange={setModel} /><Divider theme={theme} /><Field theme={theme} label={t('settings.apiKey')} value={apiKey} onChange={setAPIKey} secure placeholder={value?.hasAPIKey ? t('settings.apiKeySavedPlaceholder') : 'sk-…'} /><Divider theme={theme} /><Field theme={theme} label={t('settings.rssPrompt')} value={summaryPrompt} onChange={setPrompt} placeholder={t('settings.rssPromptPlaceholder')} multiline /></Section>
    <Section theme={theme}><ActionRow theme={theme} title={t('common.save')} onPress={() => save(false)} /><Divider theme={theme} /><ActionRow theme={theme} title={t('settings.saveAndTest')} onPress={() => save(true)} /></Section>
  </>;
}
function FocusSettings({ theme, value, perform }: any) {
  return <Section theme={theme} title={t('settings.focusSection')}>
    <ChoiceRow theme={theme} title={t('settings.focusDuration')} current={value?.focusMinutes ?? 25} choices={[25, 35, 45, 60]} unitKey="unit.minute" action={(focus: number) => perform('pomodoro.settings', { focus })} />
    <Divider theme={theme} />
    <ChoiceRow theme={theme} title={t('settings.dailyGoal')} current={value?.dailyFocusGoal ?? 4} choices={[2, 4, 6, 8]} unitKey="unit.item" action={(dailyFocusGoal: number) => perform('pomodoro.settings', { dailyFocusGoal })} />
    <Divider theme={theme} />
    <ChoiceRow theme={theme} title={t('settings.longBreakInterval')} current={value?.longBreakEvery ?? 4} choices={[2, 3, 4, 5]} unitKey="unit.time" action={(longBreakEvery: number) => perform('pomodoro.settings', { longBreakEvery })} />
  </Section>;
}
function AppearanceSettings({ theme, value = 'system', perform }: { theme: TempoTheme; value?: 'system' | 'light' | 'dark'; perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T> }) { const choices = ['system', 'light', 'dark'] as const; return <Section theme={theme}>{choices.map((choice, index) => <View key={choice}><Row theme={theme} title={appearanceLabel(choice)} onPress={() => perform('preferences.save', { appearance: choice })} right={value === choice ? <NativeSymbol name="checkmark" color={theme.accent} size={17} /> : <View style={styles.choiceMark} />} />{index < choices.length - 1 ? <Divider theme={theme} /> : null}</View>)}</Section>; }
function CalendarSettings({ theme, value, perform }: any) { const save = (payload: Record<string, boolean>) => perform('preferences.save', payload); return <Section theme={theme}><ToggleRow theme={theme} title={t('settings.weekStartsMonday')} value={value?.weekStartsMonday ?? true} onValueChange={(weekStartsMonday) => save({ weekStartsMonday })} /><Divider theme={theme} /><ToggleRow theme={theme} title={t('settings.showFestivals')} value={value?.showFestivals ?? true} onValueChange={(showFestivals) => save({ showFestivals })} /><Divider theme={theme} /><ToggleRow theme={theme} title={t('settings.showTaskIndicators')} value={value?.showTaskIndicators ?? true} onValueChange={(showTaskIndicators) => save({ showTaskIndicators })} /></Section>; }
function ModuleSettings({ theme, value, supportsSelectionFeedback, perform }: any) {
  const initial = String(value ?? 'inbox,today,focus,rss,settings').split(',').filter(Boolean);
  const [items, setItems] = useState<string[]>(initial);

  async function reorder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= items.length) return;
    const previous = [...items];
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    const destination = Math.max(0, Math.min(toIndex, next.length));
    next.splice(destination, 0, moved);
    setItems(next);
    AccessibilityInfo.announceForAccessibility(t('settings.moduleMoved', {
      title: moduleTitle(moved),
      position: destination + 1,
    }));
    try {
      await perform('preferences.save', { moduleOrder: next.join(',') });
    } catch {
      setItems(previous);
    }
  }

  function renderItem({ item, index, onDragStart, onDragEnd, isActive }: DragListRenderItemInfo<string>) {
    const actions = [
      ...(index > 0 ? [{ name: 'decrement' as const, label: t('settings.moveUp') }] : []),
      ...(index < items.length - 1 ? [{ name: 'increment' as const, label: t('settings.moveDown') }] : []),
    ];
    return <ModuleDragRow
      theme={theme}
      title={moduleTitle(item)}
      index={index}
      isActive={isActive}
      onDragStart={() => {
        if (supportsSelectionFeedback) void perform('feedback.selection').catch(() => undefined);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      showDivider={index < items.length - 1}
      accessibilityRole="adjustable"
      accessibilityLabel={moduleTitle(item)}
      accessibilityHint={t('settings.modulesDragHint')}
      accessibilityValue={{ text: t('settings.modulePosition', { position: index + 1, count: items.length }) }}
      accessibilityActions={actions}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === 'decrement') void reorder(index, index - 1);
        if (nativeEvent.actionName === 'increment') void reorder(index, index + 1);
      }}
    />;
  }

  return <Section theme={theme} title={t('settings.modulesLimit')}>
    <DragList
      data={items}
      keyExtractor={(item) => item}
      renderItem={renderItem}
      onReordered={reorder}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      style={{ height: items.length * 56 }}
    />
    <View style={[styles.moduleHint, { borderTopColor: theme.separator }]}>
      <NativeSymbol name="hand.draw" color={theme.secondary} size={16} />
      <Text style={[styles.moduleHintText, { color: theme.secondary }]}>{t('settings.modulesDragHint')}</Text>
    </View>
  </Section>;
}
function ModuleDragRow({ theme, title, index, isActive, onDragStart, onDragEnd, showDivider, ...accessibilityProps }: {
  theme: TempoTheme;
  title: string;
  index: number;
  isActive: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  showDivider: boolean;
  accessibilityRole: 'adjustable';
  accessibilityLabel: string;
  accessibilityHint: string;
  accessibilityValue: { text: string };
  accessibilityActions: { name: 'decrement' | 'increment'; label: string }[];
  onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const highlight = useRef(new Animated.Value(0)).current;
  const dragging = useRef(false);

  const animateScale = (toValue: number, pressed = false) => {
    scale.stopAnimation();
    if (pressed) {
      Animated.timing(scale, { toValue, duration: 85, useNativeDriver: true }).start();
    } else {
      Animated.spring(scale, { toValue, stiffness: 390, damping: 27, mass: .62, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    Animated.spring(highlight, { toValue: isActive ? 1 : 0, stiffness: 330, damping: 29, mass: .7, useNativeDriver: true }).start();
    animateScale(isActive ? 1.018 : 1);
  }, [isActive]);

  const beginDrag = () => {
    dragging.current = true;
    animateScale(1.018);
    onDragStart();
  };
  const finishPress = () => {
    if (dragging.current) {
      dragging.current = false;
      onDragEnd();
    }
    animateScale(isActive ? 1.018 : 1);
  };

  return <Animated.View style={[styles.moduleItem, { transform: [{ scale }] }, isActive && styles.moduleItemActive]}>
    <Animated.View pointerEvents="none" style={[styles.moduleHighlight, { backgroundColor: theme.accentSoft, opacity: highlight }]} />
    <Pressable
      {...accessibilityProps}
      delayLongPress={230}
      onPressIn={() => { if (!isActive) animateScale(.985, true); }}
      onLongPress={beginDrag}
      onPressOut={finishPress}
      style={styles.modulePressable}
    >
      <View style={styles.moduleRow}>
        <View style={[styles.moduleOrder, { backgroundColor: isActive ? theme.accent : theme.surfaceMuted }]}>
          <Text style={[styles.moduleOrderText, { color: isActive ? '#FFFFFF' : theme.secondary }]}>{index + 1}</Text>
        </View>
        <Text style={[styles.moduleTitle, { color: theme.text }]}>{title}</Text>
        <NativeSymbol name="line.3.horizontal" color={isActive ? theme.accent : theme.tertiary} size={18} />
      </View>
      {showDivider ? <View style={[styles.moduleDivider, { backgroundColor: theme.separator }]} /> : null}
    </Pressable>
  </Animated.View>;
}
function AboutSettings({ theme, value, perform, setMessage }: any) { const update = value?.update; const updateAction = async () => { if (update?.state === 'available') { await perform('update.download'); return; } setMessage(t('settings.checking')); await perform('update.check'); setMessage(t('settings.checkComplete')); }; return <><Section theme={theme}><Row theme={theme} title="Tempo" detail={t('settings.tagline')} /><Divider theme={theme} /><Row theme={theme} title={t('settings.currentVersion')} detail={`v${value?.version ?? t('common.notAvailable')} (${value?.build ?? t('common.notAvailable')})`} /><Divider theme={theme} /><Row theme={theme} title={t('settings.updateStatus')} detail={update?.state === 'available' ? t('settings.updateAvailable', { version: update.version }) : update?.state === 'current' ? t('settings.upToDate') : update?.message ?? t('settings.notChecked')} /></Section><Section theme={theme}><ActionRow theme={theme} title={update?.state === 'available' ? t('settings.downloadUpdate') : t('settings.checkUpdate')} onPress={updateAction} /></Section></>; }
function SettingRow({ theme, icon, title, detail, onPress }: { theme: TempoTheme; icon: NativeSymbolName; title: string; detail?: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.settingRow, { backgroundColor: pressed ? theme.surfaceMuted : 'transparent' }]}><View style={styles.iconBox}><NativeSymbol name={icon} color={theme.text} size={21} /></View><View style={styles.settingText}><Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>{detail ? <Text numberOfLines={1} style={[styles.settingDetail, { color: theme.secondary }]}>{detail}</Text> : null}</View><Text style={[styles.chevron, { color: theme.tertiary }]}>›</Text></Pressable>; }
function Field({ theme, label, value, onChange, placeholder, secure, multiline }: any) { return <View style={[styles.field, multiline && styles.fieldMultiline]}><Text style={[styles.fieldLabel, { color: theme.secondary }]}>{label}</Text><TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={theme.tertiary} secureTextEntry={secure} multiline={multiline} numberOfLines={multiline ? 3 : 1} autoCapitalize="none" style={[styles.fieldInput, multiline && styles.fieldInputMultiline, { color: theme.text }]} /></View>; }
function ChoiceRow({ theme, title, current, choices, unitKey, action }: any) { return <View style={styles.choice}><Text style={[styles.choiceTitle, { color: theme.text }]}>{title}</Text><SlidingSegmentedControl theme={theme} values={choices} value={current} label={String} accessibilityLabel={(value: number) => t(unitKey, { count: value })} onChange={action} height={38} style={styles.choiceControl} /></View>; }
function ActionRow({ theme, title, onPress }: { theme: TempoTheme; title: string; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && { backgroundColor: theme.surfaceMuted }]}><Text style={[styles.actionTitle, { color: theme.accent }]}>{title}</Text></Pressable>; }
function syncLabel(phase?: string, pending = 0) { if (pending) return t('sync.pending', { count: pending }); if (phase === 'syncing') return t('sync.syncing'); if (phase === 'error') return t('sync.error'); return t('sync.current'); }
function appearanceLabel(value: 'system' | 'light' | 'dark' | undefined) { return value === 'light' ? t('settings.appearanceLight') : value === 'dark' ? t('settings.appearanceDark') : t('settings.appearanceSystem'); }
function pageTitle(page: Page) { return ({ sync: t('settings.sync'), ai: t('settings.ai'), focus: t('settings.pomodoro'), appearance: t('settings.appearance'), calendar: t('settings.calendar'), modules: t('settings.modules'), about: t('settings.about') } as const)[page]; }
function moduleTitle(value: string) { return ({ inbox: t('settings.inbox'), today: t('settings.today'), focus: t('settings.pomodoro'), pomodoro: t('settings.pomodoro'), rss: t('settings.rss'), settings: t('settings.title') } as Record<string, string>)[value] ?? value; }
const styles = StyleSheet.create({ scroll: { flex: 1 }, content: { flexGrow: 1, paddingTop: 6, paddingBottom: 92 }, settingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, paddingRight: 15, paddingVertical: 6 }, iconBox: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 8 }, settingText: { flex: 1 }, settingTitle: { fontSize: 16.5, lineHeight: 22, fontWeight: '400', letterSpacing: -.18 }, settingDetail: { fontSize: 12.5, lineHeight: 17, marginTop: 1 }, chevron: { fontSize: 25, fontWeight: '300' }, choiceMark: { width: 40, height: 40 }, detailContent: { flexGrow: 1, paddingTop: 6, paddingBottom: 34 }, modulePage: { flex: 1, paddingTop: 6 }, field: { minHeight: 60, paddingHorizontal: 17, paddingVertical: 10 }, fieldMultiline: { minHeight: 94 }, fieldLabel: { fontSize: 12.5, lineHeight: 17, fontWeight: '400', marginBottom: 3 }, fieldInput: { fontSize: 16, lineHeight: 21, padding: 0 }, fieldInputMultiline: { minHeight: 54, textAlignVertical: 'top' }, message: { textAlign: 'center', fontSize: 13.5, lineHeight: 19, marginTop: 4, marginBottom: 12, paddingHorizontal: 24 }, providerControl: { marginHorizontal: 11, marginVertical: 10 }, choice: { minHeight: 64, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 12 }, choiceTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '400' }, choiceControl: { width: 194 }, actionRow: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }, actionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '500' }, moduleItem: { minHeight: 56, marginHorizontal: 6, borderRadius: 14 }, moduleItemActive: { zIndex: 2, shadowColor: '#000000', shadowOpacity: .12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, moduleHighlight: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 14 }, modulePressable: { minHeight: 56, borderRadius: 14, overflow: 'hidden' }, moduleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingLeft: 11, paddingRight: 3 }, moduleOrder: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, moduleOrderText: { fontSize: 13, lineHeight: 17, fontWeight: '600' }, moduleTitle: { flex: 1, fontSize: 16, lineHeight: 21, fontWeight: '400' }, moduleDivider: { position: 'absolute', left: 50, right: 11, bottom: 0, height: StyleSheet.hairlineWidth }, moduleHint: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 }, moduleHintText: { flex: 1, fontSize: 13, lineHeight: 18, marginLeft: 2 }, });
