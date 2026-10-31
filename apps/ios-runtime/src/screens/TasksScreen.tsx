import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Keyboard, LayoutAnimation, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeListView } from 'react-native-swipe-list-view';

import { NativeSymbol } from '../components/NativeControls';
import { NativeChromeGap, PrimaryButton, Screen, Sheet } from '../components/Primitives';
import { formatDate, t, weekdayLabels } from '../i18n';
import { radius, type TempoTheme } from '../theme';
import type { TempoCommand, TempoTask } from '../types';

type Props = {
  route: 'inbox' | 'today'; theme: TempoTheme; tasks: TempoTask[];
  supportsSelectionFeedback: boolean;
  command?: TempoCommand; consumeCommand: () => void;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
};

type AIPlanSuggestion = { title: string; dayOffset: number };
type AIPlan = { summary: string; suggestions: AIPlanSuggestion[] };

export function TasksScreen({ route, theme, tasks, supportsSelectionFeedback, command, consumeCommand, perform }: Props) {
  const safeAreaInsets = useSafeAreaInsets();
  const [composerVisible, setComposerVisible] = useState(false);
  const [aiVisible, setAIVisible] = useState(false);
  const [editing, setEditing] = useState<TempoTask>();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [query, setQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [undo, setUndo] = useState<TempoTask>();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarExpanded, setCalendarExpandedState] = useState(false);
  const calendar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (command?.type === 'search') {
      setQuery(command.query ?? '');
      setSearchActive(command.active ?? false);
    }
    if (command?.type === 'newTask') openComposer();
    if (command?.type === 'showCompleted') setShowCompleted(true);
    if (command?.type === 'hideCompleted') setShowCompleted(false);
    if (command?.type === 'returnToday') setSelectedDate(new Date());
    if (command?.type === 'aiAssistant') setAIVisible(true);
    if (command) consumeCommand();
  }, [command, consumeCommand]);

  const setCalendarExpanded = useCallback((next: boolean) => {
    calendar.stopAnimation();
    setCalendarExpandedState(next);
    Animated.spring(calendar, { toValue: next ? 1 : 0, useNativeDriver: false, stiffness: 210, damping: 28, mass: .78 }).start();
  }, [calendar]);

  const scoped = useMemo(() => tasks
    .filter((task) => task.status !== 'cancelled')
    .filter((task) => route === 'inbox' ? !task.startAt : sameDay(task.startAt, selectedDate)),
  [tasks, route, selectedDate]);

  const shown = useMemo(() => scoped
    .filter((task) => showCompleted || task.status !== 'completed')
    .filter((task) => `${task.title} ${task.notes}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.createdAt.localeCompare(b.createdAt)),
  [scoped, showCompleted, query]);
  const shownByID = useMemo(() => new Map(shown.map((task) => [task.id, task])), [shown]);

  function openComposer(task?: TempoTask) {
    setEditing(task);
    setDraftTitle(task?.title ?? '');
    setDraftNotes(task?.notes ?? '');
    setComposerVisible(true);
  }

  function closeComposer() {
    Keyboard.dismiss();
    setTimeout(() => setComposerVisible(false), 80);
  }

  async function saveTask() {
    const title = draftTitle.trim();
    if (!title) return;
    if (editing) {
      await perform('task.update', { id: editing.id, title, notes: draftNotes.trim() });
    } else {
      await perform('task.add', {
        title,
        notes: draftNotes.trim(),
        forToday: route === 'today',
        scheduledAt: route === 'today' ? selectedDate.toISOString() : undefined,
      });
    }
    setDraftTitle('');
    setDraftNotes('');
    setEditing(undefined);
    setComposerVisible(false);
  }

  async function remove(task: TempoTask) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setUndo(task);
    try {
      await perform('task.delete', { id: task.id });
    } catch (error) {
      setUndo(undefined);
      throw error;
    }
  }

  return (
    <Screen theme={theme}>
      <View style={styles.flex}>
        <NativeChromeGap title={searchActive ? undefined : route === 'today' ? t('tasks.today') : t('tasks.inbox')} theme={theme} />

        {route === 'today' ? <CalendarStrip theme={theme} selected={selectedDate} onSelect={setSelectedDate} progress={calendar} expanded={calendarExpanded} onExpandedChange={setCalendarExpanded} /> : null}

        <View style={styles.listPanel}>
          <SwipeListView<TempoTask>
            style={styles.flex}
            data={shown}
            directionalLockEnabled
            keyExtractor={(item) => item.id}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={shown.length ? (
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitle, { color: theme.text }]}>{route === 'today' ? fullDate(selectedDate) : query ? t('tasks.searchResults') : t('tasks.unorganized')}</Text>
                <Text style={[styles.groupCount, { color: theme.secondary }]}>{shown.length}</Text>
              </View>
            ) : null}
            ListEmptyComponent={<EmptyState theme={theme} route={route} searching={!!query} />}
            renderItem={({ item, index }) => (
              <TaskRow
                theme={theme}
                task={item}
                first={index === 0}
                last={index === shown.length - 1}
                showDate={route !== 'today'}
                onOpen={() => openComposer(item)}
                onToggle={() => perform('task.toggle', { id: item.id })}
              />
            )}
            renderHiddenItem={({ item, index }, rowMap) => (
              <DeleteBehindRow
                theme={theme}
                first={index === 0}
                last={index === shown.length - 1}
                onDelete={() => {
                  const row = rowMap[item.id];
                  if (row) {
                    row.manuallySwipeRow(-460, () => void remove(item));
                  } else {
                    void remove(item);
                  }
                }}
              />
            )}
            disableRightSwipe
            rightOpenValue={-76}
            rightActivationValue={-112}
            rightActionValue={-460}
            stopRightSwipe={-132}
            directionalDistanceChangeThreshold={6}
            swipeToOpenPercent={38}
            swipeToClosePercent={42}
            swipeToOpenVelocityContribution={6}
            friction={8}
            tension={78}
            restSpeedThreshold={0.5}
            restDisplacementThreshold={0.5}
            closeOnRowOpen
            closeOnScroll
            useNativeDriver
            onRightActionStatusChange={({ isActivated }) => {
              if (isActivated && supportsSelectionFeedback) void perform('feedback.selection').catch(() => undefined);
            }}
            onRightAction={(rowKey) => {
              const task = shownByID.get(rowKey);
              if (task) void remove(task);
            }}
            contentContainerStyle={[shown.length ? styles.listContent : styles.emptyContent, { paddingBottom: 49 + safeAreaInsets.bottom + 24 }]}
          />
        </View>

        {undo ? <UndoBanner key={undo.id} task={undo} theme={theme} bottomInset={safeAreaInsets.bottom} onUndo={() => perform('task.restore', { id: undo.id })} onDismiss={() => setUndo(undefined)} /> : null}
      </View>

      <Sheet visible={composerVisible} onClose={closeComposer} theme={theme} snapPoints={['68%', '94%']}>
        <View style={styles.sheetBody}>
          <Text style={[styles.sheetTitle, { color: theme.text }]}>{editing ? t('tasks.edit') : route === 'today' ? t('tasks.schedule') : t('tasks.capture')}</Text>
          <TextInput
            autoFocus
            value={draftTitle}
            onChangeText={setDraftTitle}
            onSubmitEditing={saveTask}
            returnKeyType="next"
            placeholder={t('tasks.titlePlaceholder')}
            placeholderTextColor={theme.tertiary}
            style={[styles.titleInput, { color: theme.text, backgroundColor: theme.surface }]}
          />
          <TextInput
            value={draftNotes}
            onChangeText={setDraftNotes}
            placeholder={t('tasks.notesPlaceholder')}
            placeholderTextColor={theme.tertiary}
            multiline
            textAlignVertical="top"
            style={[styles.notesInput, { color: theme.text, backgroundColor: theme.surface }]}
          />
          <Text style={[styles.destination, { color: theme.secondary }]}>{route === 'today' ? t('tasks.scheduleDestination', { date: fullDate(selectedDate) }) : t('tasks.inboxDestination')}</Text>
          <PrimaryButton theme={theme} label={editing ? t('tasks.saveChanges') : t('tasks.add')} onPress={saveTask} disabled={!draftTitle.trim()} />
        </View>
      </Sheet>
      <Sheet visible={aiVisible} onClose={() => setAIVisible(false)} theme={theme} snapPoints={['78%', '94%']}>
        <AIPlanner
          theme={theme}
          selectedDate={selectedDate}
          perform={perform}
          onClose={() => setAIVisible(false)}
        />
      </Sheet>
    </Screen>
  );
}

function AIPlanner({ theme, selectedDate, perform, onClose }: {
  theme: TempoTheme;
  selectedDate: Date;
  perform: <T>(action: string, payload?: Record<string, unknown>) => Promise<T>;
  onClose: () => void;
}) {
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<AIPlan>();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    if (!goal.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const next = await perform<AIPlan>('ai.plan', { goal: goal.trim() });
      setPlan(next);
      setSelected(new Set(next.suggestions.map((_, index) => index)));
    } catch {
      setError(t('tasks.aiUnavailable'));
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!plan || selected.size === 0 || applying) return;
    setApplying(true);
    try {
      for (const [index, suggestion] of plan.suggestions.entries()) {
        if (!selected.has(index)) continue;
        const date = addDays(selectedDate, Math.max(0, Math.min(14, suggestion.dayOffset)));
        await perform('task.add', { title: suggestion.title, notes: '', forToday: true, scheduledAt: date.toISOString() });
      }
      onClose();
    } catch {
      setError(t('tasks.aiApplyFailed'));
    } finally {
      setApplying(false);
    }
  }

  function toggle(index: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }

  return <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.aiBody}>
    <Text style={[styles.sheetTitle, styles.aiTitle, { color: theme.text }]}>{t('tasks.aiTitle')}</Text>
    <Text style={[styles.aiDescription, { color: theme.secondary }]}>{t('tasks.aiDescription')}</Text>
    <TextInput
      value={goal}
      onChangeText={setGoal}
      placeholder={t('tasks.aiPlaceholder')}
      placeholderTextColor={theme.tertiary}
      multiline
      style={[styles.aiInput, { color: theme.text, backgroundColor: theme.surface }]}
    />
    <PrimaryButton theme={theme} label={t('tasks.aiGenerate')} onPress={generate} loading={loading} disabled={!goal.trim()} />
    {error ? <Text accessibilityRole="alert" style={[styles.aiError, { color: theme.danger }]}>{error}</Text> : null}
    {plan ? <>
      <Text style={[styles.aiSummary, { color: theme.secondary }]}>{plan.summary}</Text>
      <View style={[styles.aiSuggestions, { backgroundColor: theme.surface }]}>
        {plan.suggestions.map((suggestion, index) => <Pressable
          key={`${suggestion.title}-${suggestion.dayOffset}-${index}`}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: selected.has(index) }}
          onPress={() => toggle(index)}
          style={({ pressed }) => [styles.aiSuggestion, index > 0 && { borderTopColor: theme.separator, borderTopWidth: StyleSheet.hairlineWidth }, pressed && styles.aiSuggestionPressed]}
        >
          <NativeSymbol name={selected.has(index) ? 'checkmark.circle.fill' : 'circle'} color={selected.has(index) ? theme.accent : theme.tertiary} size={21} containerSize={28} />
          <View style={styles.aiSuggestionText}>
            <Text style={[styles.aiSuggestionTitle, { color: theme.text }]}>{suggestion.title}</Text>
            <Text style={[styles.aiSuggestionDate, { color: theme.secondary }]}>{suggestion.dayOffset === 0 ? t('tasks.today') : t('tasks.aiDaysLater', { count: suggestion.dayOffset })}</Text>
          </View>
        </Pressable>)}
      </View>
      <PrimaryButton theme={theme} label={t('tasks.aiAddSelected', { count: selected.size })} onPress={apply} loading={applying} disabled={selected.size === 0} />
    </> : null}
  </ScrollView>;
}

function CalendarStrip({ theme, selected, onSelect, progress, expanded, onExpandedChange }: {
  theme: TempoTheme;
  selected: Date;
  onSelect: (date: Date) => void;
  progress: Animated.Value;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const gridStart = useMemo(() => startOfWeek(new Date(selected.getFullYear(), selected.getMonth(), 1)), [selected.getFullYear(), selected.getMonth()]);
  const { height: windowHeight } = useWindowDimensions();
  const rowHeight = Math.max(34, Math.min(46, Math.floor((windowHeight * .46 - 108) / 6)));
  const expansionDistance = rowHeight * 5;
  const days = useMemo(() => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)), [gridStart]);
  const selectedIndex = Math.max(0, days.findIndex((date) => sameDay(date, selected)));
  const selectedRow = Math.floor(selectedIndex / 7);
  const dragStart = useRef(expanded ? 1 : 0);
  const liveProgress = useRef(expanded ? 1 : 0);
  useEffect(() => {
    const listener = progress.addListener(({ value }) => { liveProgress.current = value; });
    return () => progress.removeListener(listener);
  }, [progress]);
  const wantsVerticalDrag = (_: unknown, gesture: { dx: number; dy: number }) => Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.08;
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: wantsVerticalDrag,
    onMoveShouldSetPanResponderCapture: wantsVerticalDrag,
    onPanResponderGrant: () => {
      progress.stopAnimation();
      dragStart.current = liveProgress.current;
    },
    onPanResponderMove: (_, gesture) => progress.setValue(Math.max(0, Math.min(1, dragStart.current + gesture.dy / expansionDistance))),
    onPanResponderRelease: (_, gesture) => {
      const position = Math.max(0, Math.min(1, dragStart.current + gesture.dy / expansionDistance));
      onExpandedChange(gesture.vy > .22 ? true : gesture.vy < -.22 ? false : position >= .5);
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: (_, gesture) => {
      const position = Math.max(0, Math.min(1, dragStart.current + gesture.dy / expansionDistance));
      onExpandedChange(position >= .5);
    },
  }), [onExpandedChange, progress, expansionDistance]);
  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [108 + rowHeight, 108 + rowHeight * 6] });
  const gridHeight = progress.interpolate({ inputRange: [0, 1], outputRange: [rowHeight, rowHeight * 6] });
  const gridOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [-selectedRow * rowHeight, 0] });
  return (
    <Animated.View {...pan.panHandlers} style={[styles.calendar, { height, backgroundColor: theme.groupedSurface, borderColor: theme.cardBorder }]}>
      <View style={styles.monthToolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.previousMonth')} onPress={() => onSelect(shiftMonth(selected, -1))} style={({ pressed }) => [styles.monthButton, pressed && { opacity: .5 }]}><NativeSymbol name="chevron.left" color={theme.secondary} size={14} containerSize={28} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? t('tasks.collapseCalendar') : t('tasks.expandCalendar')} accessibilityState={{ expanded }} onPress={() => onExpandedChange(!expanded)} style={styles.monthTitleButton}>
          <Text style={[styles.monthTitle, { color: theme.text }]}>{formatDate(selected, { year: 'numeric', month: 'long' })}</Text>
          <NativeSymbol name={expanded ? 'chevron.up' : 'chevron.down'} color={theme.tertiary} size={10} containerSize={18} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.nextMonth')} onPress={() => onSelect(shiftMonth(selected, 1))} style={({ pressed }) => [styles.monthButton, pressed && { opacity: .5 }]}><NativeSymbol name="chevron.right" color={theme.secondary} size={14} containerSize={28} /></Pressable>
      </View>
      <View style={styles.weekdayRow}>{weekdayLabels().map((day) => <Text key={day} style={[styles.weekday, { color: theme.secondary }]}>{day}</Text>)}</View>
      <Animated.View style={[styles.calendarGridViewport, { height: gridHeight }]}>
        <Animated.View style={{ transform: [{ translateY: gridOffset }] }}>
          {[0, 1, 2, 3, 4, 5].map((row) => <View key={row} style={[styles.weekRow, { height: rowHeight }]}>{days.slice(row * 7, row * 7 + 7).map((date) => <DateCell key={date.toISOString()} date={date} selected={sameDay(date, selected)} inCurrentMonth={date.getMonth() === selected.getMonth() && date.getFullYear() === selected.getFullYear()} theme={theme} onPress={() => onSelect(date)} />)}</View>)}
        </Animated.View>
      </Animated.View>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={expanded ? t('tasks.collapseCalendar') : t('tasks.expandCalendar')}
        onAccessibilityTap={() => onExpandedChange(!expanded)}
        style={styles.calendarHandleTouch}
      >
        <Pressable onPress={() => onExpandedChange(!expanded)} hitSlop={8} style={styles.calendarHandleButton}><View style={[styles.calendarHandle, { backgroundColor: theme.tertiary }]} /></Pressable>
      </View>
    </Animated.View>
  );
}

function DateCell({ date, selected, inCurrentMonth, theme, onPress }: { date: Date; selected: boolean; inCurrentMonth: boolean; theme: TempoTheme; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.dateCell, pressed && { opacity: .55 }]}><View style={[styles.dateDot, selected && { backgroundColor: theme.accent }]}><Text style={[styles.dateNumber, { color: selected ? '#fff' : inCurrentMonth ? theme.text : theme.tertiary, opacity: selected || inCurrentMonth ? 1 : .48 }]}>{date.getDate()}</Text></View></Pressable>;
}

function TaskRow({ task, theme, first, last, showDate = true, onOpen, onToggle, swipeAnimatedValue }: { task: TempoTask; theme: TempoTheme; first: boolean; last: boolean; showDate?: boolean; onOpen: () => void; onToggle: () => void; swipeAnimatedValue?: Animated.Value }) {
  const priorityColor = task.priority === 'high' ? theme.accent : theme.secondary;
  const contentOpacity = swipeAnimatedValue?.interpolate({ inputRange: [-132, -76, 0], outputRange: [.9, .96, 1], extrapolate: 'clamp' }) ?? 1;
  const contentScale = swipeAnimatedValue?.interpolate({ inputRange: [-132, -76, 0], outputRange: [.985, .993, 1], extrapolate: 'clamp' }) ?? 1;
  return (
    <Animated.View style={[styles.taskRow, first && styles.groupTop, last && styles.groupBottom, { backgroundColor: theme.surface, opacity: contentOpacity, transform: [{ scale: contentScale }] }]}>
      <Pressable onPress={onToggle} hitSlop={8} style={[styles.checkbox, { borderColor: task.status === 'completed' ? theme.success : theme.tertiary, backgroundColor: task.status === 'completed' ? theme.success : 'transparent' }]}>{task.status === 'completed' ? <Text style={styles.check}>✓</Text> : null}</Pressable>
      <Pressable onPress={onOpen} style={({ pressed }) => [styles.taskMain, pressed && { opacity: .58 }]}>
        <View style={styles.taskText}>
          <View style={styles.titleLine}>{task.priority ? <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} /> : null}<Text numberOfLines={1} style={[styles.taskTitle, { color: task.status === 'completed' ? theme.secondary : theme.text, textDecorationLine: task.status === 'completed' ? 'line-through' : 'none' }]}>{task.title}</Text></View>
          {task.notes ? <Text numberOfLines={1} style={[styles.taskNotes, { color: theme.secondary }]}>{task.notes}</Text> : null}
        </View>
        {showDate && task.startAt ? <Text style={[styles.taskDate, { color: theme.accent }]}>{sameDay(task.startAt, new Date()) ? t('tasks.today') : shortDate(task.startAt)}</Text> : null}
      </Pressable>
      {!last ? <View style={[styles.rowDivider, { backgroundColor: theme.separator }]} /> : null}
    </Animated.View>
  );
}

function DeleteBehindRow({ theme, first, last, rightActionActivated = false, swipeAnimatedValue, onDelete }: {
  theme: TempoTheme;
  first: boolean;
  last: boolean;
  rightActionActivated?: boolean;
  swipeAnimatedValue?: Animated.Value;
  onDelete: () => void;
}) {
  const dragScale = swipeAnimatedValue?.interpolate({ inputRange: [-132, -76, -14, 0], outputRange: [1.08, 1, .78, .68], extrapolate: 'clamp' }) ?? 1;
  const translateX = swipeAnimatedValue?.interpolate({ inputRange: [-132, -76, -10, 0], outputRange: [0, 0, 16, 22], extrapolate: 'clamp' }) ?? 0;
  const opacity = swipeAnimatedValue?.interpolate({ inputRange: [-76, -12, 0], outputRange: [1, .36, 0], extrapolate: 'clamp' }) ?? 1;
  return <View style={[styles.deleteBehind, first && styles.groupTop, last && styles.groupBottom]}>
    <Animated.View style={[styles.deleteBubble, { backgroundColor: rightActionActivated ? theme.danger : theme.surfaceMuted, borderColor: rightActionActivated ? theme.danger : theme.separator, opacity, transform: [{ translateX }, { scale: dragScale }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('tasks.delete')} onPress={onDelete} style={({ pressed }) => [styles.deletePressable, pressed && styles.deletePressed]}>
        <NativeSymbol name="trash.fill" color={rightActionActivated ? '#FFFFFF' : theme.danger} size={14} containerSize={18} />
        <Text style={[styles.deleteLabel, { color: rightActionActivated ? '#FFFFFF' : theme.danger }]}>{rightActionActivated ? t('tasks.releaseToDelete') : t('tasks.delete')}</Text>
      </Pressable>
    </Animated.View>
  </View>;
}

function UndoBanner({ task, theme, bottomInset, onUndo, onDismiss }: { task: TempoTask; theme: TempoTheme; bottomInset: number; onUndo: () => void; onDismiss: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function scheduleDismiss(delay = 3800) {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => close(), delay);
  }

  function close(completion?: () => void, dragged = false) {
    if (closing.current) return;
    closing.current = true;
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(progress, { toValue: 0, duration: dragged ? 150 : 180, useNativeDriver: true }),
      Animated.timing(dragY, { toValue: dragged ? 92 : 0, duration: dragged ? 150 : 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (!finished) return;
      completion?.();
      onDismiss();
    });
  }

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
    onPanResponderGrant: () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dragY.stopAnimation();
    },
    onPanResponderMove: (_, gesture) => dragY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 34 || gesture.vy > .5) {
        close(undefined, true);
        return;
      }
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, stiffness: 330, damping: 28, mass: .72 }).start();
      scheduleDismiss(2600);
    },
    onPanResponderTerminate: () => {
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, stiffness: 330, damping: 28, mass: .72 }).start();
      scheduleDismiss(2600);
    },
  }), [dragY]);

  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, stiffness: 250, damping: 24, mass: .72 }).start();
    scheduleDismiss();
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [progress]);

  return (
    <Animated.View {...pan.panHandlers} style={[styles.undoBanner, {
      bottom: 49 + bottomInset + 12,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.separator,
      opacity: progress,
      transform: [
        { translateY: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }), dragY) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [.97, 1] }) },
      ],
    }]}>
      <View style={styles.undoText}>
        <Text style={[styles.undoTitle, { color: theme.text }]}>{t('tasks.deleted')}</Text>
        <Text numberOfLines={1} style={[styles.undoTask, { color: theme.secondary }]}>{task.title}</Text>
      </View>
      <Pressable onPress={() => close(onUndo)} style={({ pressed }) => [styles.undoButton, pressed && { opacity: .52 }]}>
        <Text style={[styles.undoButtonText, { color: theme.accent }]}>{t('tasks.undo')}</Text>
      </Pressable>
    </Animated.View>
  );
}

function EmptyState({ theme, route, searching }: { theme: TempoTheme; route: string; searching: boolean }) {
  return <View style={styles.empty}><Text style={[styles.emptyIcon, { color: theme.tertiary }]}>{searching ? '⌕' : '✓'}</Text><Text style={[styles.emptyTitle, { color: theme.text }]}>{searching ? t('tasks.noMatches') : route === 'today' ? t('tasks.noToday') : t('tasks.inboxEmpty')}</Text><Text style={[styles.emptyBody, { color: theme.secondary }]}>{searching ? t('tasks.tryAnotherSearch') : route === 'today' ? t('tasks.timeForYourself') : t('tasks.captureAnything')}</Text></View>;
}

function sameDay(value: string | Date | null | undefined, compare: Date) { if (!value) return false; const date = typeof value === 'string' ? new Date(value) : value; return date.getFullYear() === compare.getFullYear() && date.getMonth() === compare.getMonth() && date.getDate() === compare.getDate(); }
function addDays(date: Date, count: number) { const result = new Date(date); result.setDate(result.getDate() + count); return result; }
function startOfWeek(date: Date) { return addDays(date, -((date.getDay() + 6) % 7)); }
function shiftMonth(date: Date, amount: number) { const next = new Date(date.getFullYear(), date.getMonth() + amount, 1); next.setDate(Math.min(date.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())); return next; }
function fullDate(date: Date) { return formatDate(date, { month: 'long', day: 'numeric', weekday: 'long' }); }
function shortDate(value: string) { return formatDate(value, { month: 'numeric', day: 'numeric' }); }

const styles = StyleSheet.create({
  flex: { flex: 1 },
  calendar: { overflow: 'hidden', marginTop: 20, marginHorizontal: 20, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.card, borderCurve: 'continuous', borderWidth: StyleSheet.hairlineWidth },
  monthToolbar: { height: 40, flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  monthButton: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthTitleButton: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  monthTitle: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  weekdayRow: { height: 28, flexDirection: 'row', alignItems: 'center' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500' },
  calendarGridViewport: { overflow: 'hidden' },
  weekRow: { height: 42, flexDirection: 'row' },
  dateCell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dateDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dateNumber: { fontSize: 15, fontWeight: '500' },
  calendarHandleTouch: { height: 22, alignItems: 'center', justifyContent: 'center' },
  calendarHandleButton: { width: 104, height: 22, alignItems: 'center', justifyContent: 'center' },
  calendarHandle: { width: 34, height: 4, borderRadius: 2, opacity: .38 },
  listPanel: { flex: 1, marginTop: 18 },
  listContent: { paddingHorizontal: 18, paddingBottom: 18 },
  emptyContent: { flexGrow: 1, paddingHorizontal: 18 },
  groupHeader: { minHeight: 46, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 12 },
  groupTitle: { flex: 1, fontSize: 15, fontWeight: '600', letterSpacing: -.12 },
  groupCount: { minWidth: 26, height: 24, borderRadius: 12, textAlign: 'center', textAlignVertical: 'center', fontSize: 12, fontWeight: '600' },
  groupTop: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  groupBottom: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  deleteBehind: { minHeight: 62, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingRight: 6, overflow: 'hidden' },
  deleteBubble: { width: 64, height: 44, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  deletePressable: { flex: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  deletePressed: { opacity: .64, transform: [{ scale: .95 }] },
  deleteLabel: { fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 1 },
  taskRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingLeft: 15 },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  check: { color: '#fff', fontWeight: '800' },
  taskMain: { minHeight: 62, flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 15, borderRadius: 12 },
  taskText: { flex: 1, paddingVertical: 9 },
  titleLine: { flexDirection: 'row', alignItems: 'center' },
  priorityDot: { width: 4, height: 4, borderRadius: 2, marginRight: 7 },
  taskTitle: { flexShrink: 1, fontSize: 16, fontWeight: '500', lineHeight: 20 },
  taskNotes: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  taskDate: { fontSize: 11.5, lineHeight: 16, fontWeight: '600', marginLeft: 12 },
  rowDivider: { position: 'absolute', height: StyleSheet.hairlineWidth, left: 47, right: 15, bottom: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 20 },
  emptyIcon: { fontSize: 38, lineHeight: 44, fontWeight: '200' },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 10 },
  emptyBody: { fontSize: 14, marginTop: 5 },
  undoBanner: { position: 'absolute', left: 18, right: 18, zIndex: 20, minHeight: 58, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000000', shadowOpacity: .1, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 5 },
  undoText: { flex: 1, minWidth: 0, paddingVertical: 9 },
  undoTitle: { fontSize: 14.5, lineHeight: 19, fontWeight: '600' },
  undoTask: { fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  undoButton: { minWidth: 56, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, marginLeft: 8 },
  undoButtonText: { fontSize: 14.5, lineHeight: 19, fontWeight: '700' },
  sheetBody: { flex: 1, paddingTop: 18 },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -.45, paddingHorizontal: 24, marginBottom: 20 },
  titleInput: { marginHorizontal: 20, height: 60, borderRadius: 24, paddingHorizontal: 20, fontSize: 17 },
  notesInput: { marginHorizontal: 20, minHeight: 116, borderRadius: 24, padding: 20, fontSize: 16, lineHeight: 22, marginTop: 12 },
  destination: { fontSize: 13, lineHeight: 18, marginHorizontal: 22, marginTop: 12, marginBottom: 20 },
  aiBody: { paddingTop: 18, paddingBottom: 44 },
  aiTitle: { paddingHorizontal: 0, marginHorizontal: 24, marginBottom: 5 },
  aiDescription: { fontSize: 14, lineHeight: 20, marginHorizontal: 24, marginBottom: 16 },
  aiInput: { minHeight: 96, borderRadius: 18, marginHorizontal: 18, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, lineHeight: 22, textAlignVertical: 'top', marginBottom: 12 },
  aiError: { fontSize: 13, lineHeight: 18, marginHorizontal: 24, marginTop: 10 },
  aiSummary: { fontSize: 14, lineHeight: 20, marginHorizontal: 24, marginTop: 20, marginBottom: 9 },
  aiSuggestions: { borderRadius: 18, overflow: 'hidden', marginHorizontal: 18, marginBottom: 14 },
  aiSuggestion: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9 },
  aiSuggestionPressed: { opacity: .62 },
  aiSuggestionText: { flex: 1, marginLeft: 8 },
  aiSuggestionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '500' },
  aiSuggestionDate: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
});
