// Comment le texte de l'agent apparaît dans l'éditeur (AgentReveal, réglage
// agentRevealMode) : mot à mot, ou d'un bloc teinté.

/** Au-delà de ce nombre de mots, en mode auto, un changement apparaît d'un bloc */
export const REVEAL_BLOCK_WORDS = 25;

/**
 * @name revealAsBlock
 * @description Le changement de l'agent (ajout ou remplacement) apparaît-il
 * d'un bloc ? `mode` : 'block' toujours, 'words' jamais, 'auto' (défaut)
 * quand il est gros — plus de REVEAL_BLOCK_WORDS mots, ou plusieurs
 * paragraphes (`multiBlock`) : une section à la place de sa note, tout le
 * texte. Un petit changement (un mot remplacé, une phrase) se fait mot à mot,
 * pour montrer sa précision
 */
export function revealAsBlock(mode, { words = 0, multiBlock = false } = {}) {
    if (mode === 'block') return true;
    if (mode === 'words') return false;
    return multiBlock || words > REVEAL_BLOCK_WORDS;
}
