import { useEffect, useMemo, useRef, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, StackActions, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { useTempo } from '../hooks/useTempo';
import { ToolChromeTransition } from '../components/ToolChromeTransition';
import { initialToolState, toolRouteTransition, type ToolRoute } from '../toolNavigation';
import { FocusScreen } from './FocusScreen';
import { RSSScreen } from './RSSScreen';
import { ToolsScreen } from './ToolsScreen';

type ToolRoutes = { tools: undefined; focus: undefined; rss: undefined };
type Tempo = ReturnType<typeof useTempo>;
const Stack = createNativeStackNavigator<ToolRoutes>();

export function ToolsNavigator({ tempo, route }: { tempo: Tempo; route: ToolRoute }) {
  const { snapshot, theme, command, consumeCommand, perform } = tempo;
  const navigation = useNavigationContainerRef<ToolRoutes>();
  const [ready, setReady] = useState(false);
  const requestedRoute = useRef(route);
  requestedRoute.current = route;
  // Direct links still have a tools home beneath the destination to return to.
  const [initialState] = useState(() => initialToolState(route));
  const supportsChromeProgress = snapshot?.capabilities?.includes('navigation.toolChromeProgress') ?? false;
  const navigationTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, primary: theme.accent, background: theme.background, card: theme.background, text: theme.text, border: theme.separator } };
  }, [theme]);

  useEffect(() => {
    if (!ready) return;
    const transition = toolRouteTransition(navigation.getCurrentRoute()?.name, route);
    if (transition === 'pop') navigation.dispatch(StackActions.popToTop());
    else if (transition === 'push') navigation.navigate(route);
    else if (transition === 'replace') navigation.dispatch(StackActions.replace(route));
  }, [navigation, ready, route]);

  // Start the native push on touch, without waiting for the bridge round trip.
  const openTool: Tempo['perform'] = async (action, payload) => {
    const destination = payload?.tool === 'pomodoro' ? 'focus' : payload?.tool === 'rss' ? 'rss' : undefined;
    if (action !== 'tools.open' || !destination) return perform(action, payload);
    navigation.navigate(destination);
    try {
      return await perform(action, payload);
    } catch (error) {
      navigation.dispatch(StackActions.popToTop());
      throw error;
    }
  };

  if (!snapshot) return null;
  return <NavigationContainer
    ref={navigation}
    theme={navigationTheme}
    initialState={initialState}
    onReady={() => setReady(true)}
    onStateChange={() => {
      // A completed native back gesture must also update SwiftUI's chrome.
      // Native back-button commands already changed requestedRoute, so don't echo them.
      if (navigation.getCurrentRoute()?.name === 'tools' && requestedRoute.current !== 'tools') {
        void perform('tools.open', { tool: 'home' }).catch(() => undefined);
      }
    }}
  >
    <Stack.Navigator screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: theme.background },
      animation: 'slide_from_right',
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animationMatchesGesture: true,
    }}>
      <Stack.Screen name="tools">
        {() => <ToolsScreen theme={theme} snapshot={snapshot} perform={openTool} />}
      </Stack.Screen>
      <Stack.Screen name="focus">
        {({ navigation: screenNavigation, route: screenRoute }) => <ToolChromeTransition tool="focus" navigation={screenNavigation} enabled={supportsChromeProgress} initiallyVisible={screenRoute.key === initialState.routes[1]?.key}><FocusScreen theme={theme} pomodoro={snapshot.pomodoro} remaining={snapshot.displayedRemainingSeconds} command={route === 'focus' ? command : undefined} consumeCommand={consumeCommand} perform={perform} /></ToolChromeTransition>}
      </Stack.Screen>
      <Stack.Screen name="rss">
        {({ navigation: screenNavigation, route: screenRoute }) => <ToolChromeTransition tool="rss" navigation={screenNavigation} enabled={supportsChromeProgress} initiallyVisible={screenRoute.key === initialState.routes[1]?.key}><RSSScreen theme={theme} articles={snapshot.rss?.articles ?? []} subscriptions={snapshot.rss?.subscriptions ?? []} folders={snapshot.rss?.folders ?? []} phase={snapshot.rss?.phase ?? 'idle'} command={route === 'rss' ? command : undefined} consumeCommand={consumeCommand} perform={perform} /></ToolChromeTransition>}
      </Stack.Screen>
    </Stack.Navigator>
  </NavigationContainer>;
}
