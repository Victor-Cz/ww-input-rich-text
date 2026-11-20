// Awareness filtrée des curseurs (cf. utils/cursorAwareness)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as Y from 'yjs';
import {
    Awareness,
    applyAwarenessUpdate,
    encodeAwarenessUpdate,
    removeAwarenessStates,
} from 'y-protocols/awareness';
import { createCursorAwareness } from '../src/utils/cursorAwareness.js';

const anchor = { type: null, tname: 'default', item: { client: 1, clock: 3 }, assoc: 0 };

// Une awareness réelle, ses événements relayés par la façade comptés par nom
function setup() {
    const awareness = new Awareness(new Y.Doc());
    const facade = createCursorAwareness(awareness);
    const events = [];
    const listener = name => () => events.push(name);
    const onChange = listener('change');
    const onUpdate = listener('update');
    facade.on('change', onChange);
    facade.on('update', onUpdate);
    return { awareness, facade, events, onChange, onUpdate };
}

test('la souris seule ne réveille pas les curseurs ; curseur et utilisateur, si', () => {
    const { awareness, facade, events } = setup();
    awareness.setLocalStateField('user', { name: 'Léa', color: '#DC2626' });
    assert.deepEqual(events, ['change', 'update']);

    events.length = 0;
    awareness.setLocalStateField('pointer', { anchor, dx: 1, dy: 2 });
    awareness.setLocalStateField('pointer', { anchor, dx: 5, dy: 2 });
    awareness.setLocalStateField('pointer', null);
    assert.deepEqual(events, [], 'la souris ne passe pas');

    facade.setLocalStateField('cursor', { anchor, head: anchor });
    assert.deepEqual(events, ['change', 'update'], 'le curseur passe, écrit par la façade');

    events.length = 0;
    awareness.setLocalStateField('user', { name: 'Léa', color: '#DC2626' });
    assert.deepEqual(events, [], 'un utilisateur identique ne passe pas');
    awareness.setLocalStateField('user', { name: 'Léa B.', color: '#DC2626' });
    assert.deepEqual(events, ['change', 'update']);
    awareness.destroy();
});

test("un client distant : arrivée, souris ignorée, curseur, départ", () => {
    const { awareness, events } = setup();
    const remote = new Awareness(new Y.Doc());
    const send = () => applyAwarenessUpdate(awareness, encodeAwarenessUpdate(remote, [remote.clientID]), 'remote');

    remote.setLocalState({ user: { name: 'Max', color: '#0284C7' } });
    send();
    assert.deepEqual(events, ['change', 'update'], 'arrivée');

    events.length = 0;
    remote.setLocalStateField('pointer', { anchor, dx: 3, dy: 4 });
    send();
    remote.setLocalStateField('pointer', { anchor, dx: 9, dy: 4 });
    send();
    assert.deepEqual(events, [], 'souris');

    remote.setLocalStateField('cursor', { anchor, head: anchor });
    send();
    assert.deepEqual(events, ['change', 'update'], 'curseur');

    events.length = 0;
    removeAwarenessStates(awareness, [remote.clientID], 'timeout');
    assert.deepEqual(events, ['change', 'update'], 'départ');
    remote.destroy();
    awareness.destroy();
});

test('lectures relayées, off, et destroy qui retire tout sans couper les écritures', () => {
    const { awareness, facade, events, onUpdate } = setup();
    assert.equal(facade.clientID, awareness.clientID);
    assert.equal(facade.states, awareness.states);
    assert.equal(facade.getStates(), awareness.getStates());
    assert.equal(facade.getLocalState(), awareness.getLocalState());

    facade.off('update', onUpdate);
    awareness.setLocalStateField('cursor', { anchor, head: anchor });
    assert.deepEqual(events, ['change']);

    facade.destroy();
    events.length = 0;
    awareness.setLocalStateField('cursor', null);
    assert.deepEqual(events, [], 'plus aucun événement après destroy');
    assert.equal(awareness._observers.get('update')?.size ?? 0, 0, "plus d'écouteur sur l'awareness réelle");

    facade.off('change', () => {});
    facade.setLocalStateField('cursor', { anchor, head: anchor });
    assert.deepEqual(awareness.getLocalState().cursor, { anchor, head: anchor }, 'les écritures passent encore');
    awareness.destroy();
});
