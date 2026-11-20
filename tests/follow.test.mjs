// Suivre l'agent ou un collaborateur : bande, personne suivie, curseur qui bouge (cf. utils/follow)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    bandScrollDelta,
    FOLLOW_AGENT,
    followedPresent,
    insideBand,
    movedCursorClient,
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
    { name: 'Moi', id: 'u1' },
    { name: 'Léa', id: 'u2' },
    { name: 'Claude • Victor', id: null, agent: true, writing: true },
];

test("présent : un utilisateur par son id, l'agent par « agent »", () => {
    assert.equal(followedPresent(users, 'u2'), true);
    assert.equal(followedPresent(users, FOLLOW_AGENT), true);
    assert.equal(followedPresent(users, 'u3'), false);
    assert.equal(followedPresent(users.slice(0, 2), FOLLOW_AGENT), false);
    assert.equal(followedPresent(users, null), false);
    assert.equal(followedPresent(null, 'u2'), false);
});

test('suivre bascule : la même personne arrête', () => {
    assert.equal(nextFollowing(null, 'u2', { localId: 'u1', users }), 'u2');
    assert.equal(nextFollowing('u2', 'u2', { localId: 'u1', users }), null);
    assert.equal(nextFollowing('u2', FOLLOW_AGENT, { localId: 'u1', users }), FOLLOW_AGENT);
    assert.equal(nextFollowing(FOLLOW_AGENT, ' agent ', { localId: 'u1', users }), null);
});

test('soi-même, une clé vide ou un absent ne changent rien', () => {
    assert.equal(nextFollowing(null, 'u1', { localId: 'u1', users }), null);
    assert.equal(nextFollowing('u2', 'u1', { localId: 'u1', users }), 'u2');
    assert.equal(nextFollowing('u2', '', { localId: 'u1', users }), 'u2');
    assert.equal(nextFollowing(null, undefined, { localId: 'u1', users }), null);
    assert.equal(nextFollowing(null, 'u3', { localId: 'u1', users }), null);
    assert.equal(nextFollowing(undefined, 'u3', { users }), null);
});

test("un id numérique vaut sa forme texte", () => {
    const numeric = [{ name: 'N', id: 42 }];
    assert.equal(nextFollowing(null, 42, { users: numeric }), '42');
    assert.equal(followedPresent(numeric, '42'), true);
});

test("curseur qui bouge : seulement celui de l'utilisateur suivi, seulement s'il change", () => {
    const head = n => ({ anchor: { item: n }, head: { item: n } });
    const states = new Map([
        [1, { user: { id: 'u2' }, cursor: head(1), pointer: { x: 1 } }],
        [2, { user: { id: 'u3' }, cursor: head(5) }],
        [3, { user: { id: 'u2' }, cursor: null }],
    ]);
    const seen = new Map();
    assert.equal(movedCursorClient(states, [1, 2, 3], 'u2', seen), 1);
    // Rien n'a bougé : la souris seule ne compte pas
    states.set(1, { ...states.get(1), pointer: { x: 9 } });
    assert.equal(movedCursorClient(states, [1], 'u2', seen), null);
    // Le curseur bouge
    states.set(1, { ...states.get(1), cursor: head(2) });
    assert.equal(movedCursorClient(states, [1], 'u2', seen), 1);
    // Son autre onglet prend un curseur : c'est lui qu'on suit
    states.set(3, { user: { id: 'u2' }, cursor: head(7) });
    assert.equal(movedCursorClient(states, [1, 3], 'u2', seen), 3);
    // Le curseur disparaît (document quitté du regard) : rien à suivre
    states.set(3, { user: { id: 'u2' }, cursor: null });
    assert.equal(movedCursorClient(states, [3], 'u2', seen), null);
    // Un client parti n'est plus dans les états
    assert.equal(movedCursorClient(states, [99], 'u2', seen), null);
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
