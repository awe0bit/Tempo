import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/screens/SettingsScreen.tsx', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('function SyncSettings('), source.indexOf('function AISettings('));

test('sync setup only offers scan pairing, not credential inputs', () => {
  assert.match(section, /perform\('sync\.scan'\)/);
  assert.doesNotMatch(section, /<Field|TextInput|sync\.save|sync\.test|setServerURL|setToken/);
  assert.match(section, /detail=\{value\?\.serverURL\}/);
});

test('older native builds show an upgrade hint instead of calling missing APIs', () => {
  assert.match(source, /capabilities\?\.includes\('sync\.qrPairing'\)/);
  assert.match(section, /onPress=\{supportsPairing \? scan :/);
  assert.match(section, /settings\.pairingNeedsUpdate/);
});

test('automatic-sync updates never replace the saved address or credential', () => {
  assert.match(section, /perform\('sync\.autoSync', \{ autoSync \}\)/);
  assert.doesNotMatch(section, /payload.*token|payload.*serverURL/);
});
