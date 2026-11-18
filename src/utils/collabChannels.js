// Canaux du serveur de collaboration du template (protocole « template ») :
// ce que le serveur fait descendre hors du Y.Doc, en messages stateless JSON.
// - { type: 'collab:snapshot', channels: { <canal>: [messages] } } : à chaque
//   (re)connexion, REMPLACE tout ce qui était tenu, canaux absents compris ;
// - { type: 'collab:message', channel, message, reset } : ajoute le message
//   à la suite du canal, après l'avoir vidé si reset.
// Canaux connus : save ({ state: saving | saved | error, at }), presence
// ({ <user_id>: member | editor | viewer }), guests (membres seulement), et
// ceux du type de document (article : la ligne de l'article).

/** Demande au serveur d'enregistrer tout de suite (bouton « Enregistrer ») */
export const SAVE_REQUEST = JSON.stringify({ type: 'collab:save' });

/**
 * Applique un message du serveur aux canaux tenus. Rend null si le message
 * n'est pas un message de canal ; sinon les canaux à jour (un nouvel objet)
 * et ce qui a changé : `live` est faux pour l'instantané d'une connexion, qui
 * rejoue l'état et ne doit pas déclencher les workflows d'un événement
 */
export function applyChannelMessage(channels, data) {
    if (!data || typeof data !== 'object') return null;
    if (data.type === 'collab:snapshot') {
        const next = {};
        for (const [name, messages] of Object.entries(data.channels || {})) {
            next[name] = Array.isArray(messages) ? [...messages] : [];
        }
        return { channels: next, channel: null, message: null, live: false };
    }
    if (data.type === 'collab:message' && typeof data.channel === 'string') {
        const previous = data.reset ? [] : channels[data.channel] || [];
        return {
            channels: { ...channels, [data.channel]: [...previous, data.message] },
            channel: data.channel,
            message: data.message,
            live: true,
        };
    }
    return null;
}

/** Le dernier message d'un canal, ou null */
export const lastMessage = (channels, name) => {
    const messages = channels?.[name];
    return messages?.length ? messages[messages.length - 1] : null;
};

/** L'état d'enregistrement que dit le canal save : les champs du statut de collaboration */
export function saveStatusOf(message) {
    switch (message?.state) {
        case 'saving':
            return { saving: true, saved: false };
        case 'saved':
            return { saving: false, saved: true };
        case 'error':
            return { saving: false, saved: false, error: 'save-error' };
        default:
            return null;
    }
}
