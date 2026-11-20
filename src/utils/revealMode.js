// Comment le texte de l'agent apparaît dans l'éditeur (AgentReveal, réglage
// agentRevealMode) : mot à mot, ou d'un bloc teinté.

/** Au-delà de ce nombre de mots, en mode auto, un changement apparaît d'un bloc */
export const REVEAL_BLOCK_WORDS = 25;

/**
 * @name revealAsBlock
 * @description Le changement de l'agent apparaît-il d'un bloc ? `mode` :
 * 'block' toujours, 'words' jamais, 'auto' (défaut) : un remplacement
 * (`replace` : une section à la place de sa note, une modification ciblée)
 * toujours d'un coup ; un ajout d'un bloc quand il est gros — plus de
 * REVEAL_BLOCK_WORDS mots, ou plusieurs paragraphes (`multiBlock`) : tout le
 * texte —, mot à mot quand il est petit (quelques mots, une phrase)
 */
export function revealAsBlock(mode, { words = 0, multiBlock = false, replace = false } = {}) {
    if (mode === 'block') return true;
    if (mode === 'words') return false;
    return replace || multiBlock || words > REVEAL_BLOCK_WORDS;
}
