<template>
    <div class="version-timeline">
        <!-- Date de la version au centre, dans le creux formé par les barres -->
        <div v-if="activeDateLabel" class="version-timeline__date">{{ activeDateLabel }}</div>

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
                                    :class="{ '-selected': v.id === activeId }"
                                    :data-version-id="v.id"
                                    :title="tooltip(v)"
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
        // Langue du site pour le formatage des dates
        locale: { type: String, default: '' },
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
        resizeObserver: null,
        rafId: null,
    }),
    computed: {
        activeId() {
            return this.provisionalId || this.selectedId;
        },
        activeDateLabel() {
            const active = this.versions.find(v => v.id === this.activeId);
            return active ? this.formatDate(active.created_at) : '';
        },
        // Affichage chronologique : de la plus ancienne (gauche) à la plus
        // récente (droite)
        displayVersions() {
            return [...this.versions].reverse();
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
            this.$nextTick(() => {
                this.centerSelected();
                this.scheduleTickHeights();
            });
        },
    },
    mounted() {
        this.scheduleTickHeights();
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => {
                this.centerSelected();
                this.scheduleTickHeights();
            });
            if (this.$refs.scroller) this.resizeObserver.observe(this.$refs.scroller);
        }
    },
    methods: {
        formatDate(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '';
            const locale = this.locale || undefined;
            try {
                const date = d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
                const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                return `${date} ${time}`;
            } catch {
                return d.toLocaleString();
            }
        },
        tooltip(v) {
            const parts = [`v${v.version_number}`, this.formatDate(v.created_at)];
            if (v.label) parts.push(v.label);
            else if (v.source) parts.push(v.source);
            if (v.created_by_name) parts.push(v.created_by_name);
            return parts.join(' · ');
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
        // Creux progressif : les barres rétrécissent à l'approche du centre
        // (alignées en bas) pour laisser la place à la date au-dessus
        scheduleTickHeights() {
            if (this.rafId) return;
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                this.updateTickHeights();
            });
        },
        updateTickHeights() {
            const scroller = this.$refs.scroller;
            if (!scroller) return;
            const center = scroller.scrollLeft + scroller.clientWidth / 2;
            const radius = 90;
            const minFactor = 0.35;
            for (const el of scroller.querySelectorAll('[data-version-id]')) {
                const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
                const t = Math.min(1, dist / radius);
                const factor = minFactor + (1 - minFactor) * t;
                const tick = el.firstElementChild;
                if (tick) tick.style.transform = `scaleY(${factor.toFixed(3)})`;
            }
        },
        // La molette fait défiler la frise sous le sélecteur central
        onWheel(event) {
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            const scroller = this.$refs.scroller;
            if (scroller) scroller.scrollLeft += delta;
        },
        // Amène la version sélectionnée sous le sélecteur central
        centerSelected() {
            if (!this.selectedId) return;
            const scroller = this.$refs.scroller;
            const el = scroller?.querySelector(`[data-version-id="${this.selectedId}"]`);
            if (!el) return;
            this.suppressScrollSelect = true;
            const target = el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2;
            scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                this.suppressScrollSelect = false;
            }, 400);
        },
        // Défilement : la barre au centre est toujours la sélection ; le
        // surlignage et le creux suivent chaque frame, la sélection réelle
        // (rendu du diff) est confirmée dès que le scroll se pose
        onScroll() {
            this.scheduleTickHeights();
            if (this.suppressScrollSelect) return;
            const nearest = this.nearestToCenter();
            if (nearest) this.provisionalId = nearest.id;
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                if (this.suppressScrollSelect) return;
                const version = this.nearestToCenter();
                this.provisionalId = null;
                if (version && version.id !== this.selectedId) {
                    this.fromScroll = true;
                    this.$emit('select', version);
                }
            }, 100);
        },
    },
    beforeUnmount() {
        clearTimeout(this.scrollTimer);
        if (this.rafId) cancelAnimationFrame(this.rafId);
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

.version-timeline__date {
    position: absolute;
    top: 3px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    font-weight: 600;
    color: #4f46e5;
    white-space: nowrap;
    user-select: none;
    pointer-events: none;
    z-index: 2;
}

.version-timeline__scroller {
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
    display: inline-flex;
    min-width: 100%;
    height: 100%;
    box-sizing: border-box;
    /* La frise défile sous le sélecteur central : une demi-largeur de
       padding de chaque côté pour que toute version puisse s'y placer */
    padding-left: 50%;
    padding-right: 50%;
}

.version-timeline__content {
    display: inline-flex;
    align-items: flex-end;
    height: 100%;
    padding: 2px 0 5px;
    box-sizing: border-box;
}

.version-timeline__loading {
    align-self: center;
    padding: 0 14px;
    color: #9ca3af;
}

/* Séparateur discret entre époques (le concept n'est pas exposé au client) */
.version-timeline__epoch {
    display: flex;
    align-items: flex-end;
    align-self: stretch;
    border-left: 2px solid #d1d5db;
    padding-left: 8px;
    margin-right: 8px;

    &:first-child {
        border-left: none;
        padding-left: 0;
    }
}

.version-timeline__versions {
    display: flex;
    align-items: flex-end;
    gap: 1px;
}

.version-timeline__version {
    position: relative;
    display: flex;
    align-items: flex-end;
    padding: 0 3px;
    background: none;
    border: none;
    cursor: pointer;

    &:hover .version-timeline__tick {
        background: #9ca3af;
    }

    &.-selected .version-timeline__tick {
        width: 3px;
        background: #4f46e5;
    }
}

.version-timeline__tick {
    width: 2px;
    height: 26px;
    background: #d1d5db;
    border-radius: 1px;
    transform-origin: bottom;
    transition: background 0.12s ease, width 0.12s ease;
}
</style>
