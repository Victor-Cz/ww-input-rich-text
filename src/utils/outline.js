/**
 * Sommaire (outline) du document : les titres retenus (h2/h3 par défaut), leur
 * position doc, leur hiérarchie et un identifiant stable dérivé du texte.
 *
 * Le sommaire est **calculé**, jamais écrit dans le document : aucun attribut
 * `id` n'est ajouté aux titres, la valeur HTML produite par l'éditeur reste
 * identique (important en collaboration, où toute écriture serait diffusée).
 */

const LEVEL_PRESETS = {
    h2: [2],
    h2h3: [2, 3],
    h1h2h3: [1, 2, 3],
    all: [1, 2, 3, 4, 5, 6],
};

/**
 * Niveaux de titre retenus pour un mode de configuration.
 *
 * @param {string} mode
 * @returns {number[]}
 */
export function resolveOutlineLevels(mode) {
    return LEVEL_PRESETS[mode] || LEVEL_PRESETS.h2h3;
}

/**
 * Identifiant lisible dérivé du texte du titre (accents retirés, minuscules,
 * séparateurs en tirets). L'unicité est assurée par buildOutline.
 *
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
    return (
        String(text || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'section'
    );
}

/**
 * Construit le sommaire depuis le document ProseMirror.
 *
 * @param {object} doc document ProseMirror
 * @param {number[]} levels niveaux retenus (ex. [2, 3])
 * @returns {Array<{id, index, level, text, from, to, parentId, path}>}
 *   `from`/`to` sont des positions doc (usage interne : DOM, scroll) ;
 *   `path` contient les ancêtres retenus **et** le titre lui-même.
 */
export function buildOutline(doc, levels) {
    const wanted = new Set(levels);
    const items = [];
    const usedIds = new Map();
    const stack = [];

    doc.descendants((node, pos) => {
        // Les titres ne s'imbriquent pas : inutile de descendre dans un bloc texte
        if (node.type.name !== 'heading') return !node.isTextblock;

        const level = node.attrs?.level || 1;
        const text = node.textContent.trim();
        // Un titre vide n'a rien à afficher ni à cibler : ce n'est pas une section
        if (!text || !wanted.has(level)) return false;

        const base = slugify(text);
        const seen = (usedIds.get(base) || 0) + 1;
        usedIds.set(base, seen);
        const id = seen === 1 ? base : `${base}-${seen}`;

        while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
        const parent = stack[stack.length - 1] || null;

        const item = {
            id,
            index: items.length,
            level,
            text,
            from: pos,
            to: pos + node.nodeSize,
            parentId: parent ? parent.id : null,
            path: [...(parent ? parent.path : []), { id, level, text }],
        };

        items.push(item);
        stack.push(item);
        return false;
    });

    return items;
}

/**
 * Version exposée du sommaire (sans positions doc, avec l'entrée courante
 * marquée) — pour construire la table des matières côté WeWeb.
 *
 * @param {Array} items sortie de buildOutline
 * @param {number} activeIndex index du titre visible (-1 si aucun)
 * @returns {Array<{id, index, level, text, parentId, active}>}
 */
export function toPublicOutline(items, activeIndex) {
    return items.map(item => ({
        id: item.id,
        index: item.index,
        level: item.level,
        text: item.text,
        parentId: item.parentId,
        active: item.index === activeIndex,
    }));
}

/**
 * Version exposée d'un titre courant (objets neufs : aucune fuite de proxy
 * réactif dans les variables WeWeb).
 *
 * @param {object|null} item
 * @returns {object|null}
 */
export function toPublicHeading(item) {
    if (!item) return null;
    return {
        id: item.id,
        index: item.index,
        level: item.level,
        text: item.text,
        path: item.path.map(entry => ({ id: entry.id, level: entry.level, text: entry.text })),
    };
}
