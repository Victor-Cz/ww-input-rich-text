// Brispr, la personne virtuelle qui écrit l'article pendant sa génération
// (sessions d'agent de brispr-collab). id et nom : mêmes valeurs que
// `settings.agent` du collab, à changer des deux côtés. La couleur est celle
// par défaut du paramètre agentColor, qui l'emporte sur celle du collab.
export const AGENT = {
    id: 'brispr-ai',
    name: 'Brispr',
    color: '#7611FA',
};

// Icône par défaut à côté de son nom (paramètre agentIcon vide) : une étincelle
export const AGENT_ICON_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 2.5l2.2 7.3 7.3 2.2-7.3 2.2-2.2 7.3-2.2-7.3L2.5 12l7.3-2.2z"/></svg>';
