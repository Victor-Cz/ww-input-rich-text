// Travail repoussé au moment libre (cf. utils/idle)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { whenIdle } from '../src/utils/idle.js';

test('requestIdleCallback quand il existe, avec un délai maximal, et annulable', () => {
    const calls = [];
    const scope = {
        requestIdleCallback: (fn, options) => {
            calls.push(['request', options.timeout]);
            scope.pending = fn;
            return 7;
        },
        cancelIdleCallback: handle => calls.push(['cancel', handle]),
    };
    let ran = 0;
    const cancel = whenIdle(() => ran++, { timeoutMs: 1500, scope });
    scope.pending();
    assert.equal(ran, 1);
    cancel();
    assert.deepEqual(calls, [
        ['request', 1500],
        ['cancel', 7],
    ]);
});

test('sans requestIdleCallback : au tour suivant, annulable', async () => {
    let ran = 0;
    whenIdle(() => ran++, { scope: {} });
    const cancel = whenIdle(() => ran++, { scope: {} });
    cancel();
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(ran, 1);
});
