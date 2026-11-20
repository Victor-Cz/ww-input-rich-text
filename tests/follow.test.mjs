// Suivre l'agent ou un collaborateur : bande, personne suivie, curseur qui bouge (cf. utils/follow)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    bandScrollDelta,
    FOLLOW_AGENT,
    followedPresent,
    insideBand,
    followedCursorMoved,
    nextFollowing,
} from '../src/utils/follow.js';

const band = { top: 0.3, bottom: 0.6 };
const viewport = { top: 100, height: 1000 }; // bande : 400 → 700

test('dans la bande, au-dessus, en dessous', () => {
    assert.equal(insideBand({ top: 400, bottom: 420 }, viewport, band), true);
    assert.equal(insideBand({ top: 680, bottom: 700 }, viewport, band), true);
    assert.equal(insideBand({ top: 390, bottom: 410 }, viewport, band), false);
    assert.equal(insideBand({ top: 690, bottom: 710 }, viewport, band), false);
    assert.equal(insideBand({ top: -50, bottom: -30 }, viewport, band), false);
});

test('défilement vers la bande : par le bord le plus proche, rien dedans', () => {
    assert.equal(bandScrollDelta({ top: 500, bottom: 520 }, viewport, band), 0);
    assert.equal(bandScrollDelta({ top: 150, bottom: 170 }, viewport, band), -250);
    assert.equal(bandScrollDelta({ top: 1500, bottom: 1520 }, viewport, band), 820);
    assert.equal(bandScrollDelta({ top: -2000, bottom: -1980 }, viewport, band), -2400);
});

const users = [
    { name: 'Moi', id: 'u1', clientId: 10 },
    { name: 'Moi', id: 'u1', clientId: 11 },
    { name: 'Léa', id: 'u2', clientId: 20 },
    { name: 'Claude • Victor', id: null, agent: true, writing: true, clientId: 30 },
];

test("présent : un écran par son clientId, jamais le sien ; l'agent par « agent »", () => {
    assert.equal(followedPresent(users, '20', 10), true);
    assert.equal(followedPresent(users, '11', 10), true, 'son autre écran');
    assert.equal(followedPresent(users, '10', 10), false, 'son propre écran');
    assert.equal(followedPresent(users, 'u2', 10), false, 'un id de personne ne suffit pas');
    assert.equal(followedPresent(users, FOLLOW_AGENT, 10), true);
    assert.equal(followedPresent(users.slice(0, 3), FOLLOW_AGENT), false);
    assert.equal(followedPresent(users, '99', 10), false);
    assert.equal(followedPresent(users, null), false);
    assert.equal(followedPresent(null, '20'), false);
});

test('suivre bascule : le même écran arrête', () => {
    const at = { users, localClientId: 10 };
    assert.equal(nextFollowing(null, '20', at), '20');
    assert.equal(nextFollowing(null, 20, at), '20', 'un clientId numérique vaut sa forme texte');
    assert.equal(nextFollowing('20', '20', at), null);
    assert.equal(nextFollowing('20', FOLLOW_AGENT, at), FOLLOW_AGENT);
    assert.equal(nextFollowing(FOLLOW_AGENT, ' agent ', at), null);
    assert.equal(nextFollowing(null, '11', at), '11', 'son autre écran');
});

test('son propre écran, une clé vide ou un absent ne changent rien', () => {
    const at = { users, localClientId: 10 };
    assert.equal(nextFollowing(null, '10', at), null);
    assert.equal(nextFollowing('20', '10', at), '20');
    assert.equal(nextFollowing('20', '', at), '20');
    assert.equal(nextFollowing(null, undefined, at), null);
    assert.equal(nextFollowing(null, '99', at), null);
    assert.equal(nextFollowing(undefined, '99', { users }), null);
});

test("curseur de l'écran suivi : seulement s'il change", () => {
    const head = n => ({ anchor: { item: n }, head: { item: n } });
    const states = new Map([
        [1, { user: { id: 'u2' }, cursor: head(1), pointer: { x: 1 } }],
        [2, { user: { id: 'u2' }, cursor: head(5) }],
    ]);
    const seen = new Map();
    assert.equal(followedCursorMoved(states, [1, 2], 1, seen), true);
    // La souris seule ne compte pas
    states.set(1, { ...states.get(1), pointer: { x: 9 } });
    assert.equal(followedCursorMoved(states, [1], 1, seen), false);
    // Un autre écran de la même personne ne compte pas
    states.set(2, { ...states.get(2), cursor: head(6) });
    assert.equal(followedCursorMoved(states, [2], 1, seen), false);
    // Le curseur bouge
    states.set(1, { ...states.get(1), cursor: head(2) });
    assert.equal(followedCursorMoved(states, [1], 1, seen), true);
    // Plus de curseur, ou un écran parti : rien à suivre
    states.set(1, { user: { id: 'u2' }, cursor: null });
    assert.equal(followedCursorMoved(states, [1], 1, seen), false);
    assert.equal(followedCursorMoved(states, [99], 99, seen), false);
});

test('nextAgentFollow : l’agent suivi est attendu après son départ, s’il revient sous le même nom', async () => {
    const { nextAgentFollow, AGENT_FOLLOW_GRACE_MS } = await import('../src/utils/follow.js');
    const claude = [{ agent: true, name: 'Claude • Victor' }];
    let state = nextAgentFollow(null, claude, 0);
    assert.deepEqual(state, { name: 'Claude • Victor', awaySince: null });
    // Parti : attendu
    state = nextAgentFollow(state, [], 1000);
    assert.deepEqual(state, { name: 'Claude • Victor', awaySince: 1000 });
    state = nextAgentFollow(state, [{ id: 'u-1' }], 5000);
    assert.equal(state.awaySince, 1000, 'le départ compte depuis la première absence');
    // Revenu : suivi encore
    state = nextAgentFollow(state, claude, 60_000);
    assert.deepEqual(state, { name: 'Claude • Victor', awaySince: null });
    // Parti trop longtemps : lâché
    state = nextAgentFollow(state, [], 100_000);
    assert.equal(nextAgentFollow(state, [], 100_000 + AGENT_FOLLOW_GRACE_MS), null);
    // Un autre agent : lâché
    assert.equal(nextAgentFollow(state, [{ agent: true, name: 'Claude • Paul' }], 120_000), null);
});

test('followScrollDuration : court de près, plafonné de loin ; easeOutCubic de 0 à 1', async () => {
    const { followScrollDuration, easeOutCubic } = await import('../src/utils/follow.js');
    assert.equal(followScrollDuration(0), 160);
    assert.ok(followScrollDuration(-500) > 160 && followScrollDuration(-500) < 450);
    assert.equal(followScrollDuration(20000), 450);
    assert.equal(easeOutCubic(0), 0);
    assert.equal(easeOutCubic(1), 1);
    assert.ok(easeOutCubic(0.5) > 0.5, 'décélère');
});

