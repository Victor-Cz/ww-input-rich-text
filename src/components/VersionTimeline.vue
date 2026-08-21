<template>
    <div class="version-timeline" :style="{ '--vt-selected-color': selectedColor || '#111827' }">
        <div class="version-timeline__scroller" ref="scroller"
            @scroll.passive="onScroll" @wheel.prevent.stop="onWheel">
            <div class="version-timeline__track" ref="track">
                <div class="version-timeline__content" ref="content">
                    <div v-if="loading" class="version-timeline__loading">…</div>
                    <template v-else>
                        <div v-for="group in groups" :key="group.epoch" class="version-timeline__epoch">
                            <div class="version-timeline__versions">
                                <button v-for="v in group.versions" :key="v.id" type="button"
                                    class="version-timeline__version"
                                    :class="tickClass(v)"
                                    :data-version-id="v.id"
                                    @click="onClickVersion(v)">
                                    <span class="version-timeline__tick"></span>
                                </button>
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'VersionTimeline',
    props: {
        // Versions triées de la plus récente à la plus ancienne (ordre API)
        versions: { type: Array, default: () => [] },
        selectedId: { type: String, default: null },
        loading: { type: Boolean, default: false },
        // Couleur de la barre sélectionnée (config WeWeb)
        selectedColor: { type: String, default: '#111827' },
    },
    emits: ['select'],
    data: () => ({
        scrollTimer: null,
        suppressScrollSelect: false,
        // Surlignage instantané pendant le scroll, avant que la sélection
        // réelle (et le rendu du diff) ne soit confirmée
        provisionalId: null,
        // La sélection vient du scroll : ne pas re-centrer (effet élastique)
        fromScroll: false,
        // Sens du scroll en cours (+1 droite, -1 gauche) : le posé magnétique
        // ne doit jamais revenir en arrière
        scrollDirection: 0,
        lastScrollLeft: 0,
        resizeObserver: null,
        // Animation de défilement maison (décélération douce en fin de course)
        scrollAnimId: null,
        // Molette : cible lissée par interpolation (inertie)
        wheelAnimId: null,
        wheelTarget: null,
    }),
    computed: {
        activeId() {
            return this.provisionalId || this.selectedId;
        },
        // Affichage chronologique : de la plus ancienne (gauche) à la plus
        // récente (droite)
        displayVersions() {
            return [...this.versions].reverse();
        },
        displayIndexById() {
            const map = new Map();
            this.displayVersions.forEach((v, i) => map.set(v.id, i));
            return map;
        },
        activeIndex() {
            return this.activeId ? (this.displayIndexById.get(this.activeId) ?? -1) : -1;
        },
        // Groupes consécutifs par époque (séparateur visuel uniquement)
        groups() {
            const groups = [];
            for (const v of this.displayVersions) {
                const last = groups[groups.length - 1];
                if (last && last.epoch === v.epoch) last.versions.push(v);
                else groups.push({ epoch: v.epoch, versions: [v] });
            }
            return groups;
        },
    },
    watch: {
        selectedId() {
            this.provisionalId = null;
            if (this.fromScroll) {
                this.fromScroll = false;
                return;
            }
            this.centerSelected();
        },
        versions() {
            this.$nextTick(() => this.centerSelected());
        },
    },
    mounted() {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.centerSelected());
            if (this.$refs.scroller) this.resizeObserver.observe(this.$refs.scroller);
        }
        // Remontage à chaud (conteneur re-résolu après une éjection par
        // WeWeb) : aucun watcher ne se redéclenchera, se caler tout de
        // suite sur la sélection, sans animation
        this.$nextTick(() => this.centerSelected(true));
    },
    methods: {
        // Bosse autour de la sélection : la barre principale et ses voisines
        // sont agrandies (par classes, tout le rendu est en CSS)
        tickClass(v) {
            if (this.activeIndex === -1) return null;
            const idx = this.displayIndexById.get(v.id);
            if (idx === undefined) return null;
            const dist = Math.abs(idx - this.activeIndex);
            if (dist === 0) return '-selected';
            if (dist === 1) return '-near1';
            if (dist === 2) return '-near2';
            return null;
        },
        onClickVersion(v) {
            this.provisionalId = null;
            this.$emit('select', v);
        },
        nearestToCenter() {
            const scroller = this.$refs.scroller;
            if (!scroller) return null;
            const center = scroller.scrollLeft + scroller.clientWidth / 2;
            let bestId = null;
            let bestDist = Infinity;
            for (const el of scroller.querySelectorAll('[data-version-id]')) {
                const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestId = el.getAttribute('data-version-id');
                }
            }
            return bestId ? this.versions.find(v => v.id === bestId) || null : null;
        },
        // Barre retenue au posé : la plus proche du centre, mais jamais à
        // contre-sens du scroll — si la plus proche est derrière, on prend
        // la première barre dans le sens du mouvement
        pickSettleVersion() {
            const scroller = this.$refs.scroller;
            if (!scroller) return null;
            const center = scroller.scrollLeft + scroller.clientWidth / 2;
            const bars = [];
            for (const el of scroller.querySelectorAll('[data-version-id]')) {
                bars.push({ id: el.getAttribute('data-version-id'), center: el.offsetLeft + el.offsetWidth / 2 });
            }
            if (!bars.length) return null;
            let best = null;
            let bestDist = Infinity;
            for (const bar of bars) {
                const dist = Math.abs(bar.center - center);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = bar;
                }
            }
            const dir = this.scrollDirection;
            if (dir > 0 && best.center < center - 1) {
                const forward = bars.filter(b => b.center >= center - 1).sort((a, b) => a.center - b.center)[0];
                if (forward) best = forward;
            } else if (dir < 0 && best.center > center + 1) {
                const backward = bars.filter(b => b.center <= center + 1).sort((a, b) => b.center - a.center)[0];
                if (backward) best = backward;
            }
            return this.versions.find(v => v.id === best.id) || null;
        },
        // Écart entre deux barres adjacentes (pour calibrer la molette)
        barPitch() {
            const els = this.$refs.scroller?.querySelectorAll('[data-version-id]');
            if (!els || els.length < 2) return 9;
            return Math.max(4, els[1].offsetLeft - els[0].offsetLeft);
        },
        // Molette : gain calibré sur le pas des barres (un cran de souris
        // ≈ une barre) + lissage inertiel vers la cible. La sélection suit
        // la barre la plus proche du centre (onScroll), puis posé magnétique.
        onWheel(event) {
            let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            // Normaliser les unités : deltaMode 1 = lignes, 2 = pages
            if (event.deltaMode === 1) delta *= 16;
            else if (event.deltaMode === 2) delta *= 100;
            const scroller = this.$refs.scroller;
            if (!scroller) return;

            // Un nouveau geste interrompt le posé en cours
            if (this.scrollAnimId) {
                cancelAnimationFrame(this.scrollAnimId);
                this.scrollAnimId = null;
                this.suppressScrollSelect = false;
            }

            const gain = this.barPitch() / 100;
            const max = scroller.scrollWidth - scroller.clientWidth;
            const from = this.wheelTarget !== null ? this.wheelTarget : scroller.scrollLeft;
            this.wheelTarget = Math.max(0, Math.min(max, from + delta * gain));

            if (this.wheelAnimId === null) {
                const step = () => {
                    const s = this.$refs.scroller;
                    if (!s || this.wheelTarget === null) {
                        this.wheelAnimId = null;
                        return;
                    }
                    const diff = this.wheelTarget - s.scrollLeft;
                    if (Math.abs(diff) < 0.4) {
                        s.scrollLeft = this.wheelTarget;
                        this.wheelAnimId = null;
                        this.wheelTarget = null;
                        return;
                    }
                    s.scrollLeft += diff * 0.3;
                    this.wheelAnimId = requestAnimationFrame(step);
                };
                this.wheelAnimId = requestAnimationFrame(step);
            }
        },
        // Défilement animé maison : décélération douce (ease-out cubique),
        // re-ciblable en cours de route sans à-coup
        animateScrollTo(target, duration = 380) {
            const scroller = this.$refs.scroller;
            if (!scroller) return;
            if (this.scrollAnimId) cancelAnimationFrame(this.scrollAnimId);
            // Le posé prend la main sur l'inertie de molette en cours
            if (this.wheelAnimId) {
                cancelAnimationFrame(this.wheelAnimId);
                this.wheelAnimId = null;
                this.wheelTarget = null;
            }
            const from = scroller.scrollLeft;
            const clamped = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));
            if (Math.abs(clamped - from) < 0.5) return;
            const start = performance.now();
            this.suppressScrollSelect = true;
            const step = now => {
                const s = this.$refs.scroller;
                if (!s) {
                    this.scrollAnimId = null;
                    this.suppressScrollSelect = false;
                    return;
                }
                const t = Math.min(1, (now - start) / duration);
                const eased = 1 - (1 - t) ** 3;
                s.scrollLeft = from + (clamped - from) * eased;
                if (t < 1) {
                    this.scrollAnimId = requestAnimationFrame(step);
                } else {
                    this.scrollAnimId = null;
                    setTimeout(() => {
                        this.suppressScrollSelect = false;
                    }, 60);
                }
            };
            this.scrollAnimId = requestAnimationFrame(step);
        },
        centerOffsetOf(el) {
            const scroller = this.$refs.scroller;
            if (!scroller || !el) return null;
            return el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2;
        },
        // Amène la version sélectionnée sous le sélecteur central
        // (instant : saut direct sans animation, pour un montage/remontage)
        centerSelected(instant = false) {
            if (!this.selectedId) return;
            const scroller = this.$refs.scroller;
            const el = scroller?.querySelector(`[data-version-id="${this.selectedId}"]`);
            if (!el) return;
            const target = this.centerOffsetOf(el);
            if (target === null) return;
            if (instant) {
                scroller.scrollLeft = Math.max(0, Math.min(target, scroller.scrollWidth - scroller.clientWidth));
                return;
            }
            this.animateScrollTo(target);
        },
        // Défilement (drag/trackpad) : la barre au centre est toujours la
        // sélection ; surlignage immédiat, puis au repos la sélection est
        // confirmée et la frise se cale doucement sur la barre
        onScroll() {
            if (this.suppressScrollSelect) return;
            // Mémoriser le sens du mouvement pour le posé magnétique
            const scrollLeft = this.$refs.scroller?.scrollLeft ?? 0;
            const delta = scrollLeft - this.lastScrollLeft;
            if (delta !== 0) this.scrollDirection = delta > 0 ? 1 : -1;
            this.lastScrollLeft = scrollLeft;

            const nearest = this.nearestToCenter();
            if (nearest) this.provisionalId = nearest.id;
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                if (this.suppressScrollSelect) return;
                // Jamais à contre-sens du scroll
                const version = this.pickSettleVersion();
                this.provisionalId = null;
                this.scrollDirection = 0;
                if (version && version.id !== this.selectedId) {
                    this.fromScroll = true;
                    this.$emit('select', version);
                }
                // Posé de fin de course : caler la barre exactement au centre
                const scroller = this.$refs.scroller;
                const el = version
                    ? scroller?.querySelector(`[data-version-id="${version.id}"]`)
                    : null;
                if (el) {
                    const target = this.centerOffsetOf(el);
                    if (target !== null) this.animateScrollTo(target, 300);
                }
            }, 100);
        },
    },
    beforeUnmount() {
        clearTimeout(this.scrollTimer);
        if (this.scrollAnimId) cancelAnimationFrame(this.scrollAnimId);
        if (this.wheelAnimId) cancelAnimationFrame(this.wheelAnimId);
        if (this.resizeObserver) this.resizeObserver.disconnect();
    },
};
</script>

<style lang="scss" scoped>
.version-timeline {
    position: relative;
    height: 100%;
    overflow: hidden;
}

.version-timeline__scroller {
    display: flex;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    /* Scrollbar masquée : la navigation se fait à la molette/trackpad */
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
    }
}

.version-timeline__track {
    display: flex;
    align-items: center;
    flex: none;
    min-width: 100%;
    height: 100%;
    box-sizing: border-box;
    /* La frise défile sous le sélecteur central : une demi-largeur de
       padding de chaque côté pour que toute version puisse s'y placer */
    padding-left: 50%;
    padding-right: 50%;
}

.version-timeline__content {
    display: flex;
    align-items: center;
    height: 100%;
    box-sizing: border-box;
}

.version-timeline__loading {
    align-self: center;
    padding: 0 14px;
    color: #9ca3af;
}

/* Séparateur discret entre époques (le concept n'est pas exposé au client) :
   un petit trait centré, un peu plus épais mais pas plus haut que les barres */
.version-timeline__epoch {
    position: relative;
    display: flex;
    align-items: center;
    padding-left: 9px;
    margin-right: 9px;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 16px;
        background: #d1d5db;
        border-radius: 2px;
    }

    &:first-child {
        padding-left: 0;

        &::before {
            display: none;
        }
    }
}

/* Barres centrées verticalement : elles grandissent symétriquement
   depuis l'axe central (plus de date à loger au-dessus) */
.version-timeline__versions {
    display: flex;
    align-items: center;
    height: 32px;
    gap: 1px;
}

.version-timeline__version {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 3px;
    background: none;
    border: none;
    cursor: pointer;

    /* Légère pousse au survol */
    &:hover .version-timeline__tick {
        height: 24px;
        background: #9ca3af;
    }

    /* Bosse autour de la sélection : voisines agrandies en dégradé */
    &.-near2 .version-timeline__tick {
        height: 23px;
    }

    &.-near1 .version-timeline__tick {
        height: 26px;
    }

    &.-selected .version-timeline__tick {
        height: 32px;
        background: var(--vt-selected-color, #111827);
    }
}

.version-timeline__tick {
    width: 2px;
    height: 20px;
    background: #d1d5db;
    border-radius: 2px;
    transition: background 0.15s ease, width 0.15s ease, height 0.18s ease;
}
</style>
