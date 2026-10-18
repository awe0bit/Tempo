import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Divider, Row, Section } from '../components/Primitives';
import type { ForegroundOTAState } from '../hooks/useForegroundOTA';
import { t } from '../i18n';
import type { TempoTheme } from '../theme';
import type { TempoSnapshot } from '../types';

type Props = { theme: TempoTheme; snapshot: TempoSnapshot; foregroundOTA: ForegroundOTAState };

export function DeveloperToolsContent({ theme, snapshot, foregroundOTA }: Props) {
  const update = Updates.useUpdates();
  const sync = snapshot.sync;
  const versionMeta = [
    `v${snapshot.app?.version ?? t('common.notAvailable')}`,
    snapshot.app?.build ? `(${snapshot.app.build})` : undefined,
    Updates.runtimeVersion ? `runtime ${Updates.runtimeVersion}` : undefined,
    Updates.channel ?? 'production',
  ].filter(Boolean).join(' · ');

  return (
    <ScrollView
      style={styles.scroll}
      alwaysBounceVertical
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.intro, { color: theme.secondary }]}>{t('dev.intro')}</Text>

      <OTAProgress theme={theme} update={update} foregroundOTA={foregroundOTA} />

      <Section theme={theme} title={t('dev.syncDiagnostics')}>
        <Row theme={theme} title={t('dev.status')} detail={syncLabel(sync?.phase, sync?.pendingChangeCount ?? 0)} />
        <Divider theme={theme} />
        <Row theme={theme} title="Revision" detail={`${sync?.revision ?? 0}`} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.pendingUploads')} detail={`${sync?.pendingChangeCount ?? 0}`} />
        <Divider theme={theme} />
        <Row theme={theme} title={t('dev.autoSync')} detail={sync?.autoSync ? t('common.enabled') : t('common.disabled')} />
      </Section>

      <Text style={[styles.note, { color: theme.tertiary }]}>{t('dev.note')}</Text>
      <Text style={[styles.versionMeta, { color: theme.tertiary }]}>{versionMeta}</Text>
    </ScrollView>
  );
}

function OTAProgress({ theme, update, foregroundOTA }: { theme: TempoTheme; update: ReturnType<typeof Updates.useUpdates>; foregroundOTA: ForegroundOTAState }) {
  const state = otaState(update, foregroundOTA);
  const progressPercent = snapProgress(state.progress);
  const progressTarget = Math.max(0, Math.min(100, state.progress * 100));
  const animatedProgress = useRef(new Animated.Value(progressTarget)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressTarget,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, progressTarget]);

  return (
    <Section theme={theme} title={t('dev.updateProgress')}>
      <View style={styles.progressBody}>
        <View style={styles.progressHeader}>
          <View style={styles.progressText}>
            <Text style={[styles.progressTitle, { color: theme.text }]}>{state.title}</Text>
            <Text style={[styles.progressDetail, { color: state.error ? theme.danger : theme.secondary }]}>{state.detail}</Text>
          </View>
          <Text style={[styles.progressPercent, { color: theme.secondary }]}>{progressPercent}%</Text>
        </View>

        <View style={styles.progressStages}>
          {OTA_STAGE_RANGES.map(([start, end]) => {
            const stageWidth = animatedProgress.interpolate({
              inputRange: [start, end],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            });
            return <View key={start} style={[styles.progressStage, { backgroundColor: theme.surfaceMuted }]}>
              <Animated.View style={[styles.progressStageFill, { width: stageWidth, backgroundColor: state.error ? theme.danger : theme.accent }]} />
            </View>;
          })}
        </View>
      </View>
    </Section>
  );
}

// Each capsule represents one real OTA stage: check, download, install, restart.
const OTA_STAGE_RANGES = [[0, 20], [20, 90], [90, 95], [95, 100]] as const;

function snapProgress(progress: number) {
  if (progress >= 1) return 100;
  return Math.max(0, Math.min(95, Math.floor(progress * 20) * 5));
}

function otaState(update: ReturnType<typeof Updates.useUpdates>, foregroundOTA: ForegroundOTAState) {
  if (!Updates.isEnabled) return { progress: 0, title: t('dev.otaUnavailable'), detail: t('dev.otaUnavailableDetail'), error: true };
  if (foregroundOTA.stage === 'error') return { progress: foregroundOTA.progress, title: t('dev.downloadFailed'), detail: foregroundOTA.error ?? t('error.operationFailed'), error: true };
  if (foregroundOTA.stage === 'pending' || update.isUpdatePending) return { progress: .95, title: t('dev.readyToRestart'), detail: t('dev.readyToRestartDetail'), error: false };
  if (foregroundOTA.stage === 'downloading' || update.isDownloading) {
    const progress = foregroundOTA.stage === 'downloading' ? foregroundOTA.progress : .22 + Math.max(0, Math.min(1, update.downloadProgress ?? 0)) * .68;
    return { progress, title: t('dev.downloading'), detail: t('dev.downloadingDetail'), error: false };
  }
  if (foregroundOTA.stage === 'available' || update.isUpdateAvailable) return { progress: .2, title: t('dev.updatePublished'), detail: t('dev.updatePublishedDetail'), error: false };
  if (foregroundOTA.stage === 'checking' || update.isChecking || update.isStartupProcedureRunning) return { progress: Math.max(.08, foregroundOTA.progress), title: t('dev.checkingUpdate'), detail: t('dev.checkingUpdateDetail'), error: false };
  if (foregroundOTA.stage === 'current') return { progress: 1, title: t('dev.updateComplete'), detail: t('dev.updateCompleteDetail'), error: false };
  if (update.checkError) return { progress: .08, title: t('dev.checkFailed'), detail: update.checkError.message, error: true };
  if (update.downloadError) return { progress: .18, title: t('dev.downloadFailed'), detail: update.downloadError.message, error: true };
  if (update.isRestarting) return { progress: .98, title: t('dev.restarting'), detail: t('dev.restartingDetail'), error: false };
  return { progress: 0, title: t('dev.readyToCheck'), detail: t('dev.readyToCheckDetail'), error: false };
}

function syncLabel(phase?: string, pending = 0) {
  if (pending) return t('sync.pending', { count: pending });
  if (phase === 'syncing' || phase === '正在同步') return t('sync.syncing');
  if (phase === 'error' || phase === '同步异常') return t('sync.error');
  if (!phase || phase === '已实时同步') return t('sync.current');
  return phase;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingTop: 4, paddingBottom: 112 },
  intro: { fontSize: 13.5, lineHeight: 19, marginHorizontal: 32, marginBottom: 14 },
  progressBody: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  progressHeader: { flexDirection: 'row', alignItems: 'center' },
  progressText: { flex: 1 },
  progressTitle: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  progressDetail: { fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  progressPercent: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], marginLeft: 10 },
  progressStages: { flexDirection: 'row', gap: 5, marginTop: 16 },
  progressStage: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  progressStageFill: { height: 7, borderRadius: 4 },
  note: { fontSize: 12.5, lineHeight: 18, marginHorizontal: 30, marginTop: 2 },
  versionMeta: { fontSize: 10.5, lineHeight: 15, textAlign: 'center', opacity: .62, marginHorizontal: 30, marginTop: 12 },
});
