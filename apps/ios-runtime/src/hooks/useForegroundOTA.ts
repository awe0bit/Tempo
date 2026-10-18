import * as Updates from 'expo-updates';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export type ForegroundOTAState = {
  stage: 'idle' | 'checking' | 'available' | 'downloading' | 'pending' | 'current' | 'error';
  progress: number;
  error?: string;
};

export type ForegroundOTAController = ForegroundOTAState & {
  checkNow: () => Promise<void>;
};

const INITIAL_STATE: ForegroundOTAState = { stage: 'idle', progress: 0 };
const MINIMUM_STAGE_TIME = 320;

export function useForegroundOTA(): ForegroundOTAController {
  const nativeUpdate = Updates.useUpdates();
  const [state, setState] = useState<ForegroundOTAState>(INITIAL_STATE);
  const updateTask = useRef<Promise<void> | undefined>(undefined);

  useEffect(() => {
    if (!nativeUpdate.isDownloading) return;
    const download = Math.max(0, Math.min(1, nativeUpdate.downloadProgress ?? 0));
    setState(previous => previous.stage === 'downloading'
      ? { ...previous, progress: Math.max(previous.progress, .22 + download * .68) }
      : previous);
  }, [nativeUpdate.downloadProgress, nativeUpdate.isDownloading]);

  const checkNow = useCallback(() => {
    if (__DEV__ || !Updates.isEnabled) return Promise.resolve();
    if (updateTask.current) return updateTask.current;

    updateTask.current = (async () => {
      if (nativeUpdate.isUpdatePending) {
        setState({ stage: 'pending', progress: .95 });
        return;
      }

      setState({ stage: 'checking', progress: .1 });
      const startedAt = Date.now();
      const result = await Updates.checkForUpdateAsync();
      const remaining = MINIMUM_STAGE_TIME - (Date.now() - startedAt);
      if (remaining > 0) await wait(remaining);

      if (!result.isAvailable) {
        setState({ stage: 'current', progress: 1 });
        return;
      }

      setState({ stage: 'available', progress: .2 });
      await wait(MINIMUM_STAGE_TIME);
      setState({ stage: 'downloading', progress: .22 });
      await Updates.fetchUpdateAsync();
      setState({ stage: 'pending', progress: .95 });
    })().catch(error => {
      setState({
        stage: 'error',
        progress: .08,
        error: error instanceof Error ? error.message : String(error),
      });
    }).finally(() => {
      updateTask.current = undefined;
    });

    return updateTask.current;
  }, [nativeUpdate.isUpdatePending]);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let previous = AppState.currentState;
    void checkNow();
    const subscription = AppState.addEventListener('change', next => {
      if (previous !== 'active' && next === 'active') void checkNow();
      previous = next;
    });
    return () => subscription.remove();
  }, [checkNow]);

  return { ...state, checkNow };
}

function wait(milliseconds: number) {
  return new Promise<void>(resolve => setTimeout(resolve, milliseconds));
}
