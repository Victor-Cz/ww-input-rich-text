<template>
    <div class="version-timeline" ref="scroller" @scroll.passive="onScroll">
        <div class="version-timeline__track" ref="track">
            <div v-if="loading" class="version-timeline__loading">…</div>
            <template v-else>
                <div v-for="group in groups" :key="group.epoch" class="version-timeline__epoch">
                    <div class="version-timeline__epoch-header"
                        :class="{ '-current': group.epoch === liveEpoch }">
                        <span class="version-timeline__epoch-number">{{ group.epoch }}</span>
                        <span class="version-timeline__epoch-label">{{ epochLabel }}</span>
                    </div>
                    <div class="version-timeline__versions">
                        <button v-for="v in group.versions" :key="v.id" type="button"
                            class="version-timeline__version"
                            :class="{ '-selected': v.id === selectedId }"
                            :data-version-id="v.id"
                            :title="tooltip(v)"
                            @click="$emit('select', v)">
                            <span class="version-timeline__tick"></span>
                            <span class="version-timeline__date">{{ formatDate(v.created_at) }}</span>
                        </button>
                    </div>
                </div>
            </template>
        </div>
    </div>
</template>

<script>
export default {
    name: 'VersionTimeline',
    props: {
        // Versions triées de la plus récente à la plus ancienne
        versions: { type: Array, default: () => [] },
        selectedId: { type: String, default: null },
        liveEpoch: { type: Number, default: null },
        epochLabel: { type: String, default: 'Époque' },
        loading: { type: Boolean, default: false },
    },
    emits: ['select'],
    data: () => ({
        scrollTimer: null,
        suppressScrollSelect: false,
    }),
    computed: {
        // Groupes consécutifs par époque (l'ordre du tableau est préservé :
        // les plus récentes — et l'époque courante — à gauche)
        groups() {
            const groups = [];
            for (const v of this.versions) {
                const last = groups[groups.length - 1];
                if (last && last.epoch === v.epoch) last.versions.push(v);
                else groups.push({ epoch: v.epoch, versions: [v] });
            }
            return groups;
        },
    },
    watch: {
        selectedId() {
            this.centerSelected();
        },
        versions() {
            this.$nextTick(() => this.centerSelected());
        },
    },
    methods: {
        formatDate(iso) {
            if (!iso) return '';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '';
            const date = d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });
            const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            return `${date} ${time}`;
        },
        tooltip(v) {
            const parts = [`v${v.version_number}`];
            if (v.label) parts.push(v.label);
            else if (v.source) parts.push(v.source);
            if (v.created_by_name) parts.push(v.created_by_name);
            return parts.join(' · ');
        },
        contentFits() {
            const scroller = this.$refs.scroller;
            const track = this.$refs.track;
            if (!scroller || !track) return true;
            return track.scrollWidth <= scroller.clientWidth + 1;
        },
        // La sélection se centre dans la frise — sauf si tout tient déjà
        centerSelected() {
            if (!this.selectedId || this.contentFits()) return;
            const scroller = this.$refs.scroller;
            const el = scroller?.querySelector(`[data-version-id="${this.selectedId}"]`);
            if (!el) return;
            this.suppressScrollSelect = true;
            const target = el.offsetLeft + el.offsetWidth / 2 - scroller.clientWidth / 2;
            scroller.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                this.suppressScrollSelect = false;
            }, 450);
        },
        // Scroll manuel : la version la plus proche du centre devient la sélection
        onScroll() {
            if (this.suppressScrollSelect || this.contentFits()) return;
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                if (this.suppressScrollSelect) return;
                const scroller = this.$refs.scroller;
                if (!scroller) return;
                const center = scroller.scrollLeft + scroller.clientWidth / 2;
                let best = null;
                let bestDist = Infinity;
                for (const el of scroller.querySelectorAll('[data-version-id]')) {
                    const dist = Math.abs(el.offsetLeft + el.offsetWidth / 2 - center);
                    if (dist < bestDist) {
                        bestDist = dist;
                        best = el;
                    }
                }
                if (!best) return;
                const id = best.getAttribute('data-version-id');
                if (id === this.selectedId) return;
                const version = this.versions.find(v => v.id === id);
                if (version) this.$emit('select', version);
            }, 180);
        },
    },
    beforeUnmount() {
        clearTimeout(this.scrollTimer);
    },
};
</script>

<style lang="scss" scoped>
.version-timeline {
    overflow-x: auto;
    overflow-y: hidden;
    border-bottom: 1px solid #e5e7eb;
    background: #fff;
    scrollbar-width: thin;

    &__track {
        display: inline-flex;
        align-items: stretch;
        min-width: 100%;
        padding: 6px 12px 0;
    }

    &__loading {
        padding: 14px;
        color: #9ca3af;
    }

    &__epoch {
        display: flex;
        flex-direction: column;
        border-left: 2px solid #d1d5db;
        padding-left: 10px;
        margin-right: 28px;

        &:first-child {
            border-left: none;
            padding-left: 0;
        }
    }

    &__epoch-header {
        display: flex;
        align-items: baseline;
        gap: 6px;
        color: #9ca3af;
        user-select: none;

        &.-current {
            color: #111827;
        }
    }

    &__epoch-number {
        font-size: 20px;
        font-weight: 700;
        line-height: 1.2;
    }

    &__epoch-label {
        font-size: 11px;
    }

    &__versions {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        padding: 4px 0 0;
    }

    &__version {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        padding: 2px 4px 6px;
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 4px;

        &:hover {
            background: #f3f4f6;
        }

        &.-selected {
            background: #eef2ff;

            .version-timeline__tick {
                background: #4f46e5;
                height: 18px;
            }

            .version-timeline__date {
                color: #4f46e5;
                font-weight: 600;
            }
        }
    }

    &__tick {
        width: 2px;
        height: 12px;
        background: #d1d5db;
        border-radius: 1px;
    }

    &__date {
        font-size: 10px;
        color: #9ca3af;
        white-space: nowrap;
        user-select: none;
    }
}
</style>
