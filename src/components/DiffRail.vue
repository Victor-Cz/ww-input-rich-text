<template>
    <!-- Réglette des modifications : carte verticale du document affichée le
         long du bord droit de la zone de texte pendant une comparaison de
         versions. Un rectangle par zone modifiée, à sa position relative dans
         le document (bicolore quand ajouts et retraits s'y côtoient) ; le
         curseur, sur la piste, situe la partie visible.
         Positionnement en `fixed` (coordonnées viewport) : jamais rognée par
         le scroll interne de l'éditeur ni par un conteneur en overflow. -->
    <div v-if="visible" class="ww-diff-rail" :style="railStyle">
        <div v-if="viewport" class="ww-diff-rail__viewport" :style="viewport"></div>
        <button
            v-for="mark in marks"
            :key="mark.key"
            type="button"
            class="ww-diff-rail__mark"
            :style="mark.style"
            :title="mark.label"
            @click="scrollToMark(mark)"
        ></button>
    </div>
</template>

<script>
const RAIL_WIDTH = 10; // largeur des rectangles
const MARK_HEIGHT = 3; // hauteur des rectangles (doit suivre la valeur CSS)
const RAIL_INSET = 4; // écart entre la réglette et le bord droit de l'éditeur
const MERGE_GAP = 4; // px sur la réglette en deçà desquels deux zones n'en font qu'une

// Teintes sobres, dans l'esprit des indicateurs de diff GitHub
const DEFAULT_COLORS = { removed: '#cf222e', added: '#1a7f37' };

/**
 * Couleur du bloc. En mode « couleurs par auteur », elle est reprise du fond
 * appliqué au passage modifié (translucide dans le texte, plein ici) ; sinon
 * les deux teintes sobres ci-dessus, indépendantes du surlignage du texte.
 */
function markColor(el, type, colorMode) {
    if (colorMode === 'author') {
        const match = /^rgba?\(([^)]+)\)/.exec(el.style?.backgroundColor || '');
        if (match) {
            const [r, g, b] = match[1].split(',').map(part => parseFloat(part));
            if ([r, g, b].every(Number.isFinite)) return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return DEFAULT_COLORS[type] || DEFAULT_COLORS.added;
}

/**
 * Fond du rectangle : la teinte de la nature du changement, ou les deux
 * moitiés (ajout à gauche, retrait à droite) quand la zone porte les deux.
 */
function bandBackground(colors) {
    const { added, removed } = colors;
    if (added && removed) return `linear-gradient(90deg, ${added} 0 50%, ${removed} 50% 100%)`;
    return added || removed || DEFAULT_COLORS.added;
}

export default {
    name: 'DiffRail',
    props: {
        editor: { type: Object, required: true },
        // Vrai pendant un aperçu/comparaison de version : hors de ce mode la
        // réglette n'a rien à montrer et ne mesure rien.
        active: { type: Boolean, default: false },
        // 'default' (teintes ajouté/retiré) ou 'author' (teinte par auteur)
        colorMode: { type: String, default: 'default' },
    },
    data() {
        return {
            rail: null, // { top, left, height } en coordonnées viewport
            marks: [],
            viewport: null, // style de la bande « partie visible », null si tout est visible
        };
    },
    computed: {
        // Présente pendant tout le mode versionnage, même sans modification :
        // une réglette vide dit « rien à voir ailleurs », son apparition et sa
        // disparition ne dépendent pas du contenu du diff.
        visible() {
            return this.active && !!this.rail;
        },
        railStyle() {
            if (!this.rail) return null;
            return {
                top: `${this.rail.top}px`,
                left: `${this.rail.left}px`,
                height: `${this.rail.height}px`,
                width: `${RAIL_WIDTH}px`,
            };
        },
    },
    watch: {
        active() {
            this.$nextTick(this.scheduleMeasure);
        },
        // L'éditeur est recréé au rechargement du composant : les écouteurs
        // suivent la nouvelle instance
        editor() {
            this.detachListeners();
            this.rail = null;
            this.marks = [];
            this.attachListeners();
            this.$nextTick(this.scheduleMeasure);
        },
    },
    mounted() {
        this.attachListeners();
        this.scheduleMeasure();
    },
    beforeUnmount() {
        this.detachListeners();
    },
    methods: {
        attachListeners() {
            const dom = this.editor?.view?.dom;
            const document_ = dom?.ownerDocument;
            const win = document_?.defaultView;
            if (!document_ || !win) return;

            this.onViewChange = () => this.scheduleMeasure();
            // Capture : les événements scroll ne remontent pas, mais descendent
            // — un seul écouteur couvre le défilement interne de l'éditeur
            // comme celui de la page ou d'un wrapper intermédiaire.
            document_.addEventListener('scroll', this.onViewChange, { capture: true, passive: true });
            win.addEventListener('resize', this.onViewChange, { passive: true });
            if (win.ResizeObserver) {
                this.resizeObserver = new win.ResizeObserver(this.onViewChange);
                this.resizeObserver.observe(dom);
            }
            // Changement de version affichée : le rendu du diff passe par une
            // transaction ProseMirror
            this.editor.on('transaction', this.onViewChange);
            this.listeners = { document_, win };
        },

        detachListeners() {
            const attached = this.listeners;
            if (attached?.win && this.frame) {
                attached.win.cancelAnimationFrame(this.frame);
                this.frame = null;
            }
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            if (this.onViewChange) this.editor?.off?.('transaction', this.onViewChange);
            if (attached && this.onViewChange) {
                attached.document_.removeEventListener('scroll', this.onViewChange, { capture: true });
                attached.win.removeEventListener('resize', this.onViewChange);
            }
            this.onViewChange = null;
            this.listeners = null;
        },

        scheduleMeasure() {
            const win = this.listeners?.win;
            if (!win || this.frame) return;
            // Hors comparaison, rien à mesurer tant qu'il n'y a rien à effacer
            if (!this.active && !this.rail) return;
            this.frame = win.requestAnimationFrame(() => {
                this.frame = null;
                this.measure();
            });
        },

        measure() {
            const dom = this.editor?.view?.dom;
            if (!this.active || !dom || !dom.isConnected) {
                this.rail = null;
                this.marks = [];
                this.viewport = null;
                return;
            }

            const rect = dom.getBoundingClientRect();
            const total = Math.max(dom.scrollHeight, 1);
            this.rail = { top: rect.top, left: rect.right - RAIL_INSET - RAIL_WIDTH, height: rect.height };

            // Zones modifiées, projetées sur la hauteur de la réglette. Les
            // passages proches n'en forment qu'une : un ajout et un retrait
            // au même endroit du texte donnent un seul rectangle bicolore.
            const scale = rect.height / total;
            const bands = [];
            let last = null;
            for (const el of dom.querySelectorAll('[data-ychange-type]')) {
                // Un ancêtre déjà annoté (nœud entier ajouté/retiré) porte le repère
                if (el.parentElement?.closest('[data-ychange-type]')) continue;
                const elRect = el.getBoundingClientRect();
                if (!elRect.height) continue;
                const type = el.getAttribute('data-ychange-type');
                const offset = elRect.top - rect.top + dom.scrollTop;
                const top = offset * scale;
                const bottom = top + elRect.height * scale;
                const color = markColor(el, type, this.colorMode);
                const label = el.getAttribute('data-ychange-label') || '';
                if (last && top - last.bottom <= MERGE_GAP) {
                    last.bottom = Math.max(last.bottom, bottom);
                    last.colors[type] = last.colors[type] || color;
                    if (label && !last.labels.includes(label)) last.labels.push(label);
                    continue;
                }
                last = { top, bottom, offset, colors: { [type]: color }, labels: label ? [label] : [] };
                bands.push(last);
            }

            const maxTop = Math.max(rect.height - MARK_HEIGHT, 0);
            this.marks = bands.map((band, key) => ({
                key,
                offset: band.offset,
                label: band.labels.join(' · '),
                style: {
                    // Rectangle centré sur la zone, borné à la réglette
                    top: `${Math.min(Math.max((band.top + band.bottom) / 2 - MARK_HEIGHT / 2, 0), maxTop)}px`,
                    background: bandBackground(band.colors),
                },
            }));

            // Partie du document actuellement visible : scroll interne de
            // l'éditeur et/ou scroll de page, selon ce qui défile réellement
            const winHeight = this.listeners?.win?.innerHeight ?? rect.height;
            const from = dom.scrollTop + Math.max(0, -rect.top);
            const to = dom.scrollTop + Math.min(dom.clientHeight, winHeight - rect.top);
            this.viewport =
                to - from > 0 && to - from < total
                    ? { top: `${(from / total) * 100}%`, height: `${((to - from) / total) * 100}%` }
                    : null;
        },

        // Amène la modification dans le premier tiers de la zone visible
        scrollToMark(mark) {
            const dom = this.editor?.view?.dom;
            if (!dom) return;
            if (dom.scrollHeight > dom.clientHeight + 1) {
                dom.scrollTo({ top: Math.max(mark.offset - dom.clientHeight / 3, 0), behavior: 'smooth' });
                return;
            }
            const win = dom.ownerDocument?.defaultView;
            if (!win) return;
            const delta = dom.getBoundingClientRect().top + mark.offset - win.innerHeight / 3;
            win.scrollBy({ top: delta, behavior: 'smooth' });
        },
    },
};
</script>

<style scoped>
/* Réglette : une piste fine, façon règle d'aperçu d'éditeur de code. Les
   teintes neutres sont dérivées de la couleur du texte (color-mix), pour
   tenir sur fond clair comme sur fond sombre ; la valeur rgba qui précède
   sert de repli. */
.ww-diff-rail {
    position: fixed;
    pointer-events: none;
    z-index: 20;
    animation: ww-diff-rail-in 0.18s ease both;
}

.ww-diff-rail::before {
    content: '';
    position: absolute;
    inset: 0 0 0 auto;
    width: 2px;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.07);
    background: color-mix(in srgb, currentColor 10%, transparent);
}

/* Partie visible : un curseur sur la piste, comme une barre de défilement */
.ww-diff-rail__viewport {
    position: absolute;
    right: 0;
    width: 2px;
    min-height: 10px;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.2);
    background: color-mix(in srgb, currentColor 26%, transparent);
    transition: top 0.12s ease, height 0.12s ease;
}

/* Repères posés sur la piste, débordant vers le texte ; ils s'allongent au
   survol plutôt que de s'épaissir. */
.ww-diff-rail__mark {
    position: absolute;
    right: 0;
    width: 100%;
    height: 3px;
    padding: 0;
    border: none;
    border-radius: 2px;
    opacity: 0.85;
    cursor: pointer;
    pointer-events: auto;
    transition: width 0.14s ease, opacity 0.14s ease, box-shadow 0.14s ease;
}

/* Zone d'accroche plus large que le repère, sans l'épaissir visuellement */
.ww-diff-rail__mark::before {
    content: '';
    position: absolute;
    inset: -4px -6px;
}

.ww-diff-rail__mark:hover,
.ww-diff-rail__mark:focus-visible {
    width: 170%;
    opacity: 1;
    outline: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
}

@keyframes ww-diff-rail-in {
    from {
        opacity: 0;
        transform: translateX(3px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .ww-diff-rail {
        animation: none;
    }

    .ww-diff-rail__mark,
    .ww-diff-rail__viewport {
        transition: none;
    }
}
</style>
