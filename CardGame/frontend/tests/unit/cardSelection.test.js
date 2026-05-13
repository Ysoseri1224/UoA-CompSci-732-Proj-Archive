import test from 'node:test';
import assert from 'node:assert/strict';


const MAX_SELECT = 5;

function simulateToggle(prev, cardId) {
  if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
  if (prev.length >= MAX_SELECT) return prev;
  return [...prev, cardId];
}

test('toggleSelect: select new card adds it', () => {
  assert.deepEqual(simulateToggle([], 'c1'), ['c1']);
});

test('toggleSelect: deselect removes it', () => {
  assert.deepEqual(simulateToggle(['c1','c2'], 'c1'), ['c2']);
});

test('toggleSelect: cannot exceed MAX_SELECT=5', () => {
  const full = ['c1','c2','c3','c4','c5'];
  assert.deepEqual(simulateToggle(full, 'c6'), full);
});

test('toggleSelect: can deselect when at MAX_SELECT', () => {
  const full = ['c1','c2','c3','c4','c5'];
  const next = simulateToggle(full, 'c3');
  assert.equal(next.length, 4);
  assert.ok(!next.includes('c3'));
});

test('toggleSelect: select then deselect same card -> empty', () => {
  const after1 = simulateToggle([], 'c1');
  const after2 = simulateToggle(after1, 'c1');
  assert.deepEqual(after2, []);
});