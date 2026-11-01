import assert from 'node:assert/strict';
import test from 'node:test';
import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';
import { initialToolState, toolRouteTransition, toolChromeVisibility } from '../src/toolNavigation.ts';

const router = StackRouter({ initialRouteName: 'tools' });
const config = {
  routeNames: ['tools', 'focus', 'rss'],
  routeParamList: {},
  routeGetIdList: {},
};
const names = (state) => state.routes.map((route) => route.name);
const restore = (route) => router.getRehydratedState(initialToolState(route), config);
function request(state, route) {
  const transition = toolRouteTransition(state.routes[state.index].name, route);
  const action = transition === 'pop' ? StackActions.popToTop()
    : transition === 'push' ? CommonActions.navigate(route)
    : transition === 'replace' ? StackActions.replace(route) : undefined;
  return action ? router.getStateForAction(state, action, config) : state;
}

for (const route of ['focus', 'rss']) {
  test(`tools -> ${route} is a push with a reversible home`, () => {
    const home = restore('tools');
    assert.equal(toolRouteTransition('tools', route), 'push');
    const child = request(home, route);
    assert.deepEqual(names(child), ['tools', route]);
    assert.equal(child.routes[0].key, home.routes[0].key);
    const returned = request(child, 'tools');
    assert.deepEqual(names(returned), ['tools']);
    assert.equal(returned.routes[0].key, home.routes[0].key);
  });

  test(`a ${route} direct link supports native gesture back`, () => {
    const child = restore(route);
    assert.equal(child.index, 1);
    const returned = router.getStateForAction(child, CommonActions.goBack(), config);
    assert.deepEqual(names(returned), ['tools']);
  });
}

test('bridge echoes and timer snapshots do not push duplicate screens', () => {
  const state = restore('focus');
  assert.equal(toolRouteTransition('focus', 'focus'), 'none');
  assert.equal(request(state, 'focus'), state);
});

test('switching tools replaces the detail without stacking multiple tools', () => {
  const next = request(restore('focus'), 'rss');
  assert.deepEqual(names(next), ['tools', 'rss']);
  assert.equal(next.index, 1);
});

test('failed optimistic entry can pop back to the existing home', () => {
  const home = restore('tools');
  const pushed = request(home, 'rss');
  const returned = router.getStateForAction(pushed, StackActions.popToTop(), config);
  assert.equal(returned.routes[0].key, home.routes[0].key);
  assert.deepEqual(names(returned), ['tools']);
});

test('chrome fades in with push and out with pop', () => {
  const progress = [0, .1, .25, .5, .75, 1];
  assert.deepEqual(progress.map((p) => toolChromeVisibility(p, false)), progress);
  assert.deepEqual(progress.map((p) => toolChromeVisibility(p, true)), [1, .9, .75, .5, .25, 0]);
});

test('a cancelled back swipe restores chrome continuously', () => {
  const gesture = [0, .25, .6, .35, .1, 0];
  assert.deepEqual(gesture.map((p) => toolChromeVisibility(p, true)), [1, .75, .4, .65, .9, 1]);
});

test('chrome opacity stays valid on overshoot and invalid values', () => {
  assert.equal(toolChromeVisibility(-1, false), 0);
  assert.equal(toolChromeVisibility(2, false), 1);
  assert.equal(toolChromeVisibility(NaN, false), 0);
  assert.equal(toolChromeVisibility(Infinity, true), 1);
});

test('reopening a tool after a cold direct link starts a fresh fade', () => {
  const initial = restore('focus');
  const firstKey = initial.routes[1].key;
  const home = request(initial, 'tools');
  const reopened = request(home, 'focus');
  assert.notEqual(reopened.routes[1].key, firstKey);
});
