// Sections du document, telles que le serveur collab les lit (plan de
// l'article, Search-Server collab/article/plan.ts). Document plat, sans nœud
// enveloppe :
// - une section = un H2 et les blocs qui le suivent jusqu'au H2 ou au H1 suivant (ou la fin) ;
// - une sous-section = un H3 et les blocs qui le suivent jusqu'au H3, au H2 ou au H1 suivant ;
// - l'introduction = ce qui précède le premier H2 (frontmatter et H1 compris).
// Seuls les blocs de premier niveau comptent : un titre dans une citation,
// une liste ou un tableau n'ouvre pas de section. Un H4 ne ferme rien : il
// fait partie du corps de la section où il est. Un H1 ouvre une nouvelle
// partie du document : un article du CMS en réécriture garde son ancien
// texte, avec son ancien H1, après le plan.
//
// Déplacer une section la retire et la remet ailleurs, en une transaction :
// une section H2 se pose entre les sections H2, une sous-section H3 entre
// les sous-sections, d'un H2 à l'autre aussi ; toujours dans sa partie (on
// ne passe pas un H1).
import { NodeSelection, TextSelection } from 'prosemirror-state';

/** Niveau de section d'un bloc de premier niveau : 2 (H2), 3 (H3), 0 sinon */
export function sectionLevel(node) {
    if (node.type.name !== 'heading') return 0;
    const level = node.attrs?.level;
    return level === 2 || level === 3 ? level : 0;
}

const isH1 = node => node.type.name === 'heading' && node.attrs?.level === 1;

/**
 * @name documentSections
 * @description Sections et sous-sections du document, dans l'ordre :
 * `{ level, from, to, parent, part }` — `from` est la position du titre, `to`
 * la fin de la section ; `parent` est la section H2 d'une sous-section H3,
 * null pour un H3 d'avant le premier H2 de sa partie (et pour les H2) ;
 * `part` compte les H1 qui la précèdent.
 */
export function documentSections(doc) {
    const end = doc.content.size;
    const sections = [];
    let h2 = null;
    let h3 = null;
    let part = 0;
    doc.forEach((node, pos) => {
        const level = sectionLevel(node);
        if (!level && !isH1(node)) return;
        if (h3) {
            h3.to = pos;
            h3 = null;
        }
        if (!level) {
            // H1 : ferme la section en cours, ouvre une partie
            if (h2) h2.to = pos;
            h2 = null;
            part++;
        } else if (level === 2) {
            if (h2) h2.to = pos;
            h2 = { level, from: pos, to: end, parent: null, part };
            sections.push(h2);
        } else {
            h3 = { level, from: pos, to: end, parent: h2, part };
            sections.push(h3);
        }
    });
    return sections;
}

/** La section dont le titre est le bloc de premier niveau à `pos`, null sinon */
export function sectionStartingAt(doc, pos) {
    return documentSections(doc).find(section => section.from === pos) || null;
}

/**
 * @name sectionAround
 * @description La section la plus profonde qui contient la position : la
 * sous-section H3 où est le curseur, sinon sa section H2. null dans
 * l'introduction.
 */
export function sectionAround(doc, pos) {
    let found = null;
    for (const section of documentSections(doc)) {
        if (section.from > pos) break;
        if (pos < section.to) found = section;
    }
    return found;
}

/**
 * @name dropTargets
 * @description Positions où la section peut être posée, dans l'ordre du
 * document, sans quitter sa partie (entre deux H1). H2 : au début de chaque
 * section H2, et à la fin de la dernière. H3 : dans chaque section H2, au
 * début de chacune de ses sous-sections et à sa fin ; de même entre les H3
 * qui précèdent le premier H2, s'il y en a (document sans H2…). Le début et
 * la fin de la section elle-même y figurent (la poser là ne la déplace pas).
 */
export function dropTargets(doc, section) {
    const sections = documentSections(doc).filter(item => item.part === section.part);
    const h2s = sections.filter(item => item.level === 2);
    if (section.level === 2) {
        return h2s.length ? [...h2s.map(item => item.from), h2s[h2s.length - 1].to] : [];
    }
    const targets = [];
    // null : les H3 d'avant le premier H2 de la partie
    for (const parent of [null, ...h2s]) {
        const children = sections.filter(item => item.level === 3 && item.parent === parent);
        if (!parent && !children.length) continue;
        targets.push(...children.map(item => item.from));
        targets.push(parent ? parent.to : children[children.length - 1].to);
    }
    return targets;
}

/**
 * @name stepTarget
 * @description Où poser la section pour la monter (`up`) ou la descendre
 * (`down`) d'un cran : la position avant la section qui la précède, ou après
 * celle qui la suit. null si elle est déjà en tête ou en fin.
 */
export function stepTarget(doc, section, direction) {
    const targets = dropTargets(doc, section);
    if (direction === 'up') {
        const before = targets.filter(pos => pos < section.from);
        return before.length ? before[before.length - 1] : null;
    }
    return targets.find(pos => pos > section.to) ?? null;
}

/**
 * @name moveSection
 * @description Déplace la section à `target` dans la transaction (une
 * suppression et une insertion de la même plage). Rend la nouvelle position
 * du titre, null si `target` est dans la section (rien ne bouge).
 */
export function moveSection(tr, section, target) {
    const { from, to } = section;
    if (target >= from && target <= to) return null;
    const content = tr.doc.slice(from, to).content;
    if (target > to) {
        // Insérer d'abord : les positions de la section, avant, restent valides
        tr.insert(target, content);
        tr.delete(from, to);
        return target - (to - from);
    }
    tr.delete(from, to);
    tr.insert(target, content);
    return target;
}

/**
 * @name selectionAfterMove
 * @description La sélection dans le document déplacé (`doc`, titre à
 * `start`) : elle suit la section si elle y était, sinon le curseur se pose
 * au début du titre de la section.
 */
export function selectionAfterMove(selection, section, start, doc) {
    const moved = pos => start + (pos - section.from);
    if (selection.from < section.from || selection.to > section.to) return TextSelection.create(doc, start + 1);
    if (selection instanceof NodeSelection) return NodeSelection.create(doc, moved(selection.from));
    return TextSelection.between(doc.resolve(moved(selection.anchor)), doc.resolve(moved(selection.head)));
}

/**
 * @name nearestTarget
 * @description La cible la plus proche d'une ordonnée : `points` = [{ pos, y }].
 * null sans cible.
 */
export function nearestTarget(points, y) {
    let best = null;
    for (const point of points) {
        if (!best || Math.abs(point.y - y) < Math.abs(best.y - y)) best = point;
    }
    return best ? best.pos : null;
}

/**
 * @name headingsWithoutId
 * @description Positions des H2 / H3 de premier niveau sans `sectionId`, ou
 * avec celui d'un titre qui les précède (doublon : le premier le garde). Un
 * titre vide attend d'avoir du texte : juste après `## `, un retour arrière
 * doit encore rendre le texte tapé (la règle de saisie ne s'annule plus
 * après une autre modification du document).
 */
export function headingsWithoutId(doc) {
    const seen = new Set();
    const missing = [];
    doc.forEach((node, pos) => {
        if (!sectionLevel(node)) return;
        const id = node.attrs.sectionId;
        if (id && !seen.has(id)) seen.add(id);
        else if (node.content.size) missing.push(pos);
    });
    return missing;
}
