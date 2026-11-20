// Sections du document, telles que le serveur collab les lit (plan de
// l'article). Document plat, sans nœud enveloppe :
// - une section = un H2 et les blocs qui le suivent jusqu'au H2 suivant (ou la fin) ;
// - une sous-section = un H3 et les blocs qui le suivent jusqu'au H3 ou au H2 suivant ;
// - l'introduction = ce qui précède le premier H2 (frontmatter et H1 compris).
// Seuls les blocs de premier niveau comptent : un titre dans une citation,
// une liste ou un tableau n'ouvre pas de section. Un H1 ou un H4 ne ferme
// rien : ils font partie du corps de la section où ils sont.

/** Niveau de section d'un bloc de premier niveau : 2 (H2), 3 (H3), 0 sinon */
export function sectionLevel(node) {
    if (node.type.name !== 'heading') return 0;
    const level = node.attrs?.level;
    return level === 2 || level === 3 ? level : 0;
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
