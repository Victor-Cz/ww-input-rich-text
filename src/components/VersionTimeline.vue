<template>
    <div class="version-timeline" :class="{ '-scrollable': scrollable }" ref="scroller"
        @scroll.passive="onScroll" @wheel.prevent.stop="onWheel">
        <div class="version-timeline__track" ref="track">
            <!-- Date de la version active : badge sticky, toujours visible à
                 gauche de la frise, indépendant du scroll -->
            <div v-if="activeDateLabel" class="version-timeline__current-date">{{ activeDateLabel }}</div>
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
        // Le contenu déborde : padding de bord (50%) pour que les extrémités
        // puissent se placer au centre, et sélection par scroll active
        scrollable: false,
        resizeObserver: null,
        // Accumulation de molette pour le pas-à-pas quand rien ne déborde
        wheelAccumulator: 0,
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
                this.updateScrollable();
                this.centerSelected();
            });
        },
    },
    mounted() {
        this.updateScrollable();
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.updateScrollable());
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
        updateScrollable() {
            const scroller = this.$refs.scroller;
            const content = this.$refs.content;
            if (!scroller || !content) return;
            this.scrollable = content.scrollWidth > scroller.clientWidth + 1;
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
        // Sélection suivante/précédente dans l'ordre chronologique affiché
        stepSelection(direction) {
            const list = this.displayVersions;
            if (!list.length) return;
            const idx = list.findIndex(v => v.id === this.selectedId);
            const nextIdx = idx === -1 ? list.length - 1 : Math.min(list.length - 1, Math.max(0, idx + direction));
            const next = list[nextIdx];
            if (next && next.id !== this.selectedId) this.$emit('select', next);
        },
        // La molette navigue TOUJOURS entre les versions :
        // - contenu débordant → molette verticale convertie en défilement
        //   horizontal (la sélection suit le centre via onScroll)
        // - tout visible → pas-à-pas version suivante/précédente
        onWheel(event) {
            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (!delta) return;
            if (this.scrollable) {
                const scroller = this.$refs.scroller;
                if (scroller) scroller.scrollLeft += delta;
                return;
            }
            this.wheelAccumulator += delta;
            const threshold = 40;
            if (Math.abs(this.wheelAccumulator) >= threshold) {
                const direction = this.wheelAccumulator > 0 ? 1 : -1;
                this.wheelAccumulator = 0;
                this.stepSelection(direction);
            }
        },
        // La sélection se centre dans la frise — sauf si tout tient déjà,
        // ou si elle provient du scroll de l'utilisateur
        centerSelected() {
            if (!this.selectedId || !this.scrollable) return;
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
        // Scroll manuel : surlignage immédiat de la version la plus proche du
        // centre, sélection réelle confirmée dès que le scroll se pose
        onScroll() {
            if (this.suppressScrollSelect || !this.scrollable) return;
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
        if (this.resizeObserver) this.resizeObserver.disconnect();
    },
};
</script>

<style lang="scss" scoped>
.version-timeline {
    position: relative;
    height: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    background: #fff;
    /* Scrollbar masquée : la navigation se fait à la molette/trackpad */
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
        display: none;
        width: 0;
        height: 0;
    }

    &__track {
        display: inline-flex;
        min-width: 100%;
        height: 100%;
        box-sizing: border-box;
    }

    /* Contenu débordant : padding d'une demi-frise de chaque côté pour que
       la première et la dernière version puissent se placer au centre */
    &.-scrollable &__track {
        padding-left: 50%;
        padding-right: 50%;
    }

    &__content {
        display: inline-flex;
        align-items: center;
        height: 100%;
        padding: 2px 12px;
        box-sizing: border-box;
    }

    &__loading {
        align-self: center;
        padding: 0 14px;
        color: #9ca3af;
    }

    /* Séparateur discret entre époques (le concept n'est pas exposé au client) */
    &__epoch {
        display: flex;
        align-items: center;
        align-self: stretch;
        border-left: 2px solid #d1d5db;
        padding-left: 8px;
        margin-right: 8px;

        &:first-child {
            border-left: none;
            padding-left: 0;
        }
    }

    &__versions {
        display: flex;
        align-items: center;
        gap: 1px;
    }

    &__version {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 2px 3px;
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 3px;

        &:hover .version-timeline__tick {
            background: #9ca3af;
        }

        &.-selected .version-timeline__tick {
            background: #4f46e5;
            height: 26px;
        }
    }

    &__tick {
        width: 2px;
        height: 18px;
        background: #d1d5db;
        border-radius: 1px;
        transition: height 0.12s ease, background 0.12s ease;
    }

    /* Badge sticky : reste visible au bord gauche pendant le scroll */
    &__current-date {
        position: sticky;
        left: 6px;
        align-self: center;
        flex-shrink: 0;
        padding: 2px 7px;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        color: #4f46e5;
        white-space: nowrap;
        user-select: none;
        pointer-events: none;
        z-index: 2;
    }
}
</style>
