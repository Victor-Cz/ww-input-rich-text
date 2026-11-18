// Canaux du serveur de collaboration du template : instantané, messages, enregistrement
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyChannelMessage, lastMessage, SAVE_REQUEST, saveStatusOf } from '../src/utils/collabChannels.js';

test("l'instantané remplace tout, canaux absents compris, et n'est pas « en direct »", () => {
    const held = { save: [{ state: 'saved' }], old: [1] };
    const applied = applyChannelMessage(held, {
        type: 'collab:snapshot',
        channels: { article: [{ title: 'A' }], presence: [{ u1: 'member' }] },
    });
    assert.deepEqual(applied.channels, { article: [{ title: 'A' }], presence: [{ u1: 'member' }] });
    assert.equal(applied.live, false);
    assert.deepEqual(held, { save: [{ state: 'saved' }], old: [1] }, 'les canaux tenus ne sont pas modifiés');
});

test('un message s\'ajoute à la suite, reset vide d\'abord le canal', () => {
    let channels = { run: [1] };
    channels = applyChannelMessage(channels, { type: 'collab:message', channel: 'run', message: 2 }).channels;
    assert.deepEqual(channels.run, [1, 2]);
    const applied = applyChannelMessage(channels, { type: 'collab:message', channel: 'run', message: 3, reset: true });
    assert.deepEqual(applied.channels.run, [3]);
    assert.equal(applied.live, true);
    assert.equal(applied.channel, 'run');
    assert.equal(lastMessage(applied.channels, 'run'), 3);
    assert.equal(lastMessage(applied.channels, 'absent'), null);
});

test('autres messages ignorés', () => {
    for (const data of [null, 'x', { action: 'save-state' }, { type: 'collab:message' }, { type: 'autre' }]) {
        assert.equal(applyChannelMessage({}, data), null);
    }
});

test("l'état d'enregistrement du canal save", () => {
    assert.deepEqual(saveStatusOf({ state: 'saving' }), { saving: true, saved: false });
    assert.deepEqual(saveStatusOf({ state: 'saved' }), { saving: false, saved: true });
    assert.deepEqual(saveStatusOf({ state: 'error' }), { saving: false, saved: false, error: 'save-error' });
    assert.equal(saveStatusOf(null), null);
    assert.deepEqual(JSON.parse(SAVE_REQUEST), { type: 'collab:save' });
});
