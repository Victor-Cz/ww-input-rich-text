// Suivi du caret de l'agent : dans la bande, pas de défilement (cf. utils/agentFollow)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { insideBand } from '../src/utils/agentFollow.js';

const band = { top: 0.3, bottom: 0.6 };
const viewport = { top: 100, height: 1000 }; // bande : 400 → 700

test('dans la bande, au-dessus, en dessous', () => {
    assert.equal(insideBand({ top: 400, bottom: 420 }, viewport, band), true);
    assert.equal(insideBand({ top: 680, bottom: 700 }, viewport, band), true);
    assert.equal(insideBand({ top: 390, bottom: 410 }, viewport, band), false);
    assert.equal(insideBand({ top: 690, bottom: 710 }, viewport, band), false);
    assert.equal(insideBand({ top: -50, bottom: -30 }, viewport, band), false);
});
