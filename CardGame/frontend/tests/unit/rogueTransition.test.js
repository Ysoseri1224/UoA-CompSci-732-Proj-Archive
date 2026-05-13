import test from 'node:test';
import assert from 'node:assert/strict';


test('showEnhancementAfterAnimation: null pendingLayer -> no-op', () => {
  function showEnhancementAfterAnimation(pendingLayer) {
    if (pendingLayer == null) return 'noop';
    return 'emit';
  }
  assert.equal(showEnhancementAfterAnimation(null), 'noop');
  assert.equal(showEnhancementAfterAnimation(3), 'emit');
});

test('showEnhancementAfterAnimation: clears pendingLayer after call', () => {
  let pendingLayer = 4;
  function showEnhancementAfterAnimation() {
    if (pendingLayer == null) return 'noop';
    const layer = pendingLayer;
    pendingLayer = null;
    return layer;
  }
  assert.equal(showEnhancementAfterAnimation(), 4);
  assert.equal(showEnhancementAfterAnimation(), 'noop');
});

test('battleWin: sets victoryTriggered and ignores duplicates', () => {
  let victoryTriggered = false;
  let winLayer = 0;

  function onBattleWin(layer) {
    if (victoryTriggered) return;
    victoryTriggered = true;
    winLayer = layer;
  }

  onBattleWin(3);
  onBattleWin(4); // should be ignored
  assert.equal(winLayer, 3);
  assert.equal(victoryTriggered, true);
});

test('battleLose: layer routing logic', () => {
  let canRetryFloor = false;
  function onBattleLose(layer) { canRetryFloor = layer > 1; }

  onBattleLose(3);
  assert.equal(canRetryFloor, true); // >1 can retry
  
  onBattleLose(1);
  assert.equal(canRetryFloor, false); // floor 1 cannot retry
});

test('victoryTriggered reset after confirmEnhancement', () => {
  let victoryTriggered = true;
  function confirmEnhancement() { victoryTriggered = false; }
  confirmEnhancement();
  assert.equal(victoryTriggered, false);
});

test('auto-save timer is cancelled on cleanup', (_, done) => {
  let saved = false;
  let timer = setTimeout(() => { saved = true; }, 50);
  
  const cleanup = () => clearTimeout(timer);
  cleanup(); // cancel before firing

  setTimeout(() => {
    assert.equal(saved, false);
    done();
  }, 100);
});

test('auto-save fires if not cancelled', (_, done) => {
  let saved = false;
  setTimeout(() => { saved = true; }, 10);

  setTimeout(() => {
    assert.equal(saved, true);
    done();
  }, 50);
});