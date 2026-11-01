import { useEffect, type PropsWithChildren } from 'react';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTransitionProgress } from 'react-native-screens';

import { tempoNative } from '../native/TempoNative';
import { toolChromeVisibility } from '../toolNavigation';

type Navigation = NativeStackNavigationProp<{ tools: undefined; focus: undefined; rss: undefined }>;

export function ToolChromeTransition({ children, tool, navigation, enabled, initiallyVisible }: PropsWithChildren<{
  tool: 'focus' | 'rss'; navigation: Navigation; enabled: boolean; initiallyVisible: boolean;
}>) {
  const transition = useTransitionProgress();
  useEffect(() => {
    if (!enabled) return;
    let progress = initiallyVisible ? 1 : 0;
    let closing = false;
    let frame: number | undefined;
    let lastVisibility = -1;
    const publish = () => {
      frame = undefined;
      const visibility = toolChromeVisibility(progress, closing);
      if (Math.abs(lastVisibility - visibility) < .004) return;
      lastVisibility = visibility;
      tempoNative.setToolChromeProgress(tool, visibility);
    };
    // The Animated event updates progress and closing separately; coalesce them
    // in one frame to avoid a one-frame flash when the transition reverses.
    const schedule = () => { if (frame === undefined) frame = requestAnimationFrame(publish); };
    const progressListener = transition.progress.addListener(({ value }) => { progress = value; schedule(); });
    const closingListener = transition.closing.addListener(({ value }) => { closing = value >= .5; schedule(); });
    const stopStart = navigation.addListener('transitionStart', ({ data }) => {
      closing = data.closing;
      progress = 0;
      schedule();
    });
    const stopEnd = navigation.addListener('transitionEnd', ({ data }) => {
      closing = data.closing;
      progress = 1;
      schedule();
    });
    const stopCancel = navigation.addListener('gestureCancel', () => {
      closing = false;
      progress = 1;
      schedule();
    });
    schedule();
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      transition.progress.removeListener(progressListener);
      transition.closing.removeListener(closingListener);
      stopStart(); stopEnd(); stopCancel();
      tempoNative.setToolChromeProgress(tool, 0);
    };
  }, [enabled, initiallyVisible, navigation, tool, transition.closing, transition.progress]);
  return children;
}
