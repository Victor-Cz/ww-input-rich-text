<template>
    <div class="ww-rich-text" :class="{
        '-readonly': isReadonly,
        editing: isEditing,
        'version-preview': isVersionPreview,
    }" data-capture
        @wheel="onEditorWheel" @mouseover="onVersionDiffHover" :style="{
        '--primary-color': content.parameterAiMenuPrimaryColor ?? '#007bff',
        '--primary-color-1A': (content.parameterAiMenuPrimaryColor ?? '#007bff') + '1A', // 10%
        '--primary-color-33': (content.parameterAiMenuPrimaryColor ?? '#007bff') + '33', // 20%
        '--primary-color-inactive': (content.parameterAiMenuPrimaryColor ?? '#007bff') + '4D', // 30%
        '--primary-color-40': (content.parameterAiMenuPrimaryColor ?? '#007bff') + '66', // 40%
        '--primary-color-active': (content.parameterAiMenuPrimaryColor ?? '#007bff') + '99', // 60%
        '--primary-color-hover': (content.parameterAiMenuPrimaryColor ?? '#007bff') + 'CC', // 80%
        ...cssVariables
    }">
        <template v-if="richEditor">
                <!-- Mode historique : la frise remplace le CONTENU du menu sans
                     toucher au conteneur ni à sa position — elle se superpose
                     dans la même boîte pendant que le menu s'estompe -->
                <div class="ww-rich-text__menu-slot" :class="{ '-history': versionHistory.active }">
                <div class="ww-rich-text__menu native-menu" v-if="!hideMenu && !content.customMenu" :style="menuStyles">
                    <!-- Texte type (normal, ...) -->
                    <select id="rich-size" v-model="currentTextType" :disabled="!isEditable" v-if="menu.textType">
                        <option v-for="option in textTypeOptions" :key="option.value" :value="option.value">
                            {{ option.label }}
                        </option>
                    </select>

                    <span class="separator" v-if="menu.textType"></span>

                    <!-- Bold, Italic, Underline -->
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleBold"
                        :class="{ 'is-active': richEditor.isActive('bold') }" :disabled="!isEditable" v-if="menu.bold">
                        <i class="fas fa-bold"></i>
                    </button>
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleItalic"
                        :class="{ 'is-active': richEditor.isActive('italic') }" :disabled="!isEditable"
                        v-if="menu.italic">
                        <i class="fas fa-italic"></i>
                    </button>
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleUnderline"
                        :class="{ 'is-active': richEditor.isActive('underline') }" :disabled="!isEditable"
                        v-if="menu.underline">
                        <i class="fas fa-underline"></i>
                    </button>
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleStrike"
                        :class="{ 'is-active': richEditor.isActive('strike') }" :disabled="!isEditable"
                        v-if="menu.strike">
                        <i class="fas fa-strikethrough"></i>
                    </button>

                    <!-- Show the separator only if at least on of the previous block are visible -->
                    <span class="separator" v-if="menu.bold || menu.italic || menu.underline || menu.strike"></span>

                    <!-- Text align -->
                    <button type="button" class="ww-rich-text__menu-item" @click="setTextAlign('left')"
                        :class="{ 'is-active': richEditor.isActive({ textAlign: 'left' }) }" :disabled="!isEditable"
                        v-if="menu.alignLeft">
                        <i class="fas fa-align-left"></i>
                    </button>

                    <button type="button" class="ww-rich-text__menu-item" @click="setTextAlign('center')"
                        :class="{ 'is-active': richEditor.isActive({ textAlign: 'center' }) }" :disabled="!isEditable"
                        v-if="menu.alignCenter">
                        <i class="fas fa-align-center"></i>
                    </button>

                    <button type="button" class="ww-rich-text__menu-item" @click="setTextAlign('right')"
                        :class="{ 'is-active': richEditor.isActive({ textAlign: 'right' }) }" :disabled="!isEditable"
                        v-if="menu.alignRight">
                        <i class="fas fa-align-right"></i>
                    </button>

                    <button type="button" class="ww-rich-text__menu-item" @click="setTextAlign('justify')"
                        :class="{ 'is-active': richEditor.isActive({ textAlign: 'justify' }) }" :disabled="!isEditable"
                        v-if="menu.alignJustify">
                        <i class="fas fa-align-justify"></i>
                    </button>

                    <span class="separator"
                        v-if="menu.alignLeft || menu.alignCenter || menu.alignRight || menu.alignJustify"></span>

                    <!-- Color -->
                    <label class="ww-rich-text__menu-item" :for="`rich-color-${randomUid}`"
                        @click="richEditor.commands.focus()" v-if="menu.textColor">
                        <i class="fas fa-palette"></i>
                        <input :id="`rich-color-${randomUid}`" type="color" @input="setColor($event.target.value)"
                            :value="richEditor.getAttributes('textStyle').color" style="display: none"
                            :disabled="!isEditable" />
                    </label>

                    <span class="separator" v-if="menu.textColor"></span>

                    <!-- List (Bullet, number) -->
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleBulletList"
                        :class="{ 'is-active': richEditor.isActive('bulletList') }" :disabled="!isEditable"
                        v-if="menu.bulletList">
                        <i class="fas fa-list-ul"></i>
                    </button>
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleOrderedList"
                        :class="{ 'is-active': richEditor.isActive('orderedList') }" :disabled="!isEditable"
                        v-if="menu.orderedList">
                        <i class="fas fa-list-ol"></i>
                    </button>
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleTaskList"
                        :class="{ 'is-active': richEditor.isActive('taskList') }" :disabled="!isEditable"
                        v-if="menu.taskList">
                        <i class="fas fa-check-square"></i>
                    </button>

                    <!-- Table -->
                    <span class="separator" v-if="menu.table"></span>

                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="insertTable"
                        :disabled="!isEditable" v-if="menu.table">
                        <table-icon icon="table-insert" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="insertRow('before')"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="row-insert-before" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="insertRow('after')"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="row-insert-after" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="insertColumn('before')"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="column-inster-before" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="insertColumn('after')"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="column-insert-after" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="deleteRow"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="row-delete" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="deleteColumn"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="column-delete" />
                    </button>
                    <button type="button" class="ww-rich-text__menu-item"
                        :class="{ 'is-highlighted': richEditor.isActive('table') }" @click="deleteTable"
                        :disabled="!isEditable" v-if="menu.table && richEditor.isActive('table')">
                        <table-icon icon="table-delete" />
                    </button>

                    <span class="separator" v-if="menu.bulletList || menu.orderedList || menu.taskList"></span>

                    <!-- Link -->
                    <button type="button" class="ww-rich-text__menu-item" @click="setLink()"
                        :class="{ 'is-active': richEditor.isActive('link') }" :disabled="!isEditable" v-if="menu.link">
                        <i class="fas fa-link"></i>
                    </button>

                    <!-- Image -->
                    <button type="button" class="ww-rich-text__menu-item" @click="setImage()" :disabled="!isEditable"
                        v-if="menu.image">
                        <i class="fas fa-image"></i>
                    </button>

                    <!-- Code -->
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleCodeBlock"
                        :class="{ 'is-active': richEditor.isActive('codeBlock') }" :disabled="!isEditable"
                        v-if="menu.codeBlock">
                        <i class="fas fa-code"></i>
                    </button>

                    <!-- Quote -->
                    <button type="button" class="ww-rich-text__menu-item" @click="toggleBlockquote"
                        :class="{ 'is-active': richEditor.isActive('blockquote') }" :disabled="!isEditable"
                        v-if="menu.blockquote">
                        <i class="fas fa-quote-left"></i>
                    </button>

                    <span class="separator" v-if="menu.link || menu.image || menu.codeBlock || menu.blockquote"></span>

                    <!-- Undo/Redo -->
                    <button type="button" class="ww-rich-text__menu-item" @click="undo" :disabled="!isEditable"
                        v-if="menu.undo">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button type="button" class="ww-rich-text__menu-item" @click="redo" :disabled="!isEditable"
                        v-if="menu.redo">
                        <i class="fas fa-redo"></i>
                    </button>

                    <span class="separator" v-if="menu.undo || menu.redo"></span>

                    <!-- AI Menu Button -->
                    <button type="button" class="ww-rich-text__menu-item" @click="openAiMenu" :disabled="!isEditable"
                        v-if="menu.aiMenu">
                        <i class="fas fa-magic"></i>
                    </button>
                </div>
                <wwElement class="ww-rich-text__menu" v-else-if="content.customMenu"
                    v-bind="content.customMenuElement" />
                <version-timeline v-if="shouldEnableCollaboration"
                    class="ww-rich-text__menu-timeline"
                    :versions="versionHistory.versions"
                    :selected-id="versionHistory.selectedId"
                    :live-epoch="versionHistory.liveEpoch"
                    :epoch-label="content.timelineEpochLabel || 'Époque'"
                    :loading="versionHistory.loadingList"
                    @select="selectTimelineVersion" />
                </div>

                <!-- Indicateur de section visible (fil d'Ariane des titres). Rendu
                     dès qu'il y a un sommaire, même sans section active :
                     apparaître/disparaître au scroll décalerait le texte. -->
                <div class="ww-rich-text__outline" v-if="showOutlineIndicator && outlineItems.length"
                    :style="outlineIndicatorStyles">
                    <template v-for="(entry, entryIndex) in currentHeadingPath" :key="entry.id">
                        <span class="ww-rich-text__outline-separator" v-if="entryIndex">›</span>
                        <span class="ww-rich-text__outline-entry">{{ entry.text }}</span>
                    </template>
                </div>

                <editor-content class="ww-rich-text__input" :editor="richEditor" :style="richStyles" />

                <!-- Overlay de chargement d'une époque archivée -->
                <div v-if="versionHistory.epochOverlay.visible" class="ww-rich-text__epoch-overlay">
                    <div class="ww-rich-text__epoch-overlay-box">
                        <template v-if="!versionHistory.epochOverlay.loading">
                            <button type="button" class="ww-rich-text__epoch-overlay-btn" @click="confirmLoadEpoch">
                                {{ content.epochLoadButtonText || "Charger l'époque" }} {{ versionHistory.epochOverlay.targetEpoch }}
                            </button>
                            <button type="button" class="ww-rich-text__epoch-overlay-cancel" @click="cancelLoadEpoch">
                                Annuler
                            </button>
                        </template>
                        <div v-else class="ww-rich-text__epoch-spinner"></div>
                    </div>
                </div>

                <!-- Link Popover pour afficher/modifier les liens -->
                <link-popover
                    v-if="richEditor"
                    :editor="richEditor"
                    ref="linkPopover"
                />

                <!-- Utilisation du composant AiMenu personnalisé -->
                <ai-menu ref="aiMenu" :rich-editor="richEditor" :is-read-only="content.parameterAiMenuReadOnly ?? true"
                    :parameter-ai-menu-primary-color="content.parameterAiMenuPrimaryColor ?? '#007bff'"
                    :custom-modification-types="content.parameterAiMenuCustomTypes ?? []"
                    :placeholders="content.parameterAiMenuPlaceholders ?? {}"
                    :force-display="content.parameterAiMenuForceDisplay ?? false"
                    @ai-prompt="handleAiPrompt"
                    @ai-suggestion-applied="handleAiSuggestionApplied"
                    v-if="richEditor && content.enableAiMenu && !isMagicMenu" />

                <!-- Variante Magic : input léger docké en bas de l'élément -->
                <magic-menu ref="aiMenu" :rich-editor="richEditor" :is-read-only="content.parameterAiMenuReadOnly ?? true"
                    :parameter-ai-menu-primary-color="content.parameterAiMenuPrimaryColor ?? '#007bff'"
                    :button-color="content.parameterMagicMenuButtonColor ?? ''"
                    :show-type-label="content.parameterMagicMenuShowTypeLabel ?? false"
                    :default-type-index="content.parameterMagicMenuDefaultTypeIndex"
                    :show-types-on-focus="content.parameterMagicMenuShowTypesOnFocus ?? 'no'"
                    :custom-modification-types="content.parameterAiMenuCustomTypes ?? []"
                    :placeholders="content.parameterAiMenuPlaceholders ?? {}"
                    @ai-prompt="handleAiPrompt"
                    @ai-suggestion-applied="handleAiSuggestionApplied"
                    v-if="richEditor && content.enableAiMenu && isMagicMenu" />
            </template>
        </div>
</template>

<script>
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';


import { computed, inject, provide, onBeforeUnmount } from 'vue';
import suggestion from './suggestion.js';
import * as Y from 'yjs';
import { ySyncPluginKey } from 'y-prosemirror';
import { useCollaboration } from './composables/useCollaboration.js';
import * as ImageManager from './composables/useImageManager.js';
import { Markdown } from 'tiptap-markdown';
import TableIcon from './icons/table-icon.vue';

import AiMenu from './components/AiMenu.vue';
import MagicMenu from './components/MagicMenu.vue';
import LinkPopover from './components/LinkPopover.vue';
import VersionTimeline from './components/VersionTimeline.vue';
import { SelectionHighlighter } from './extensions/SelectionHighlighter.js';
import { SeoHighlighter } from './extensions/SeoHighlighter.js';
import { TextSuggestion } from './extensions/TextSuggestion.js';
import { TextStrike } from './extensions/TextStrike.js';
import { CustomImage } from './extensions/CustomImage.js';
import { SeoLink } from './extensions/SeoLink.js';
import { sanitizeLinkUrl, sanitizeImageSrc, safeOpenUrl, isDangerousUrl } from './utils/sanitizeUrl.js';
import { buildOutline, resolveOutlineLevels, toPublicOutline, toPublicHeading } from './utils/outline.js';

function extractMentions(acc, currentNode) {
    if (currentNode.type === 'mention') {
        acc.push(currentNode.attrs.id);
        return acc;
    } else if (currentNode.content) {
        return currentNode.content.reduce(extractMentions, acc);
    } else {
        return acc;
    }
}

const TAGS_MAP = {
    p: 0,
    h1: 1,
    h2: 2,
    h3: 3,
    h4: 4,
    h5: 5,
    h6: 6,
};

export default {
    components: {
        EditorContent,
        TableIcon,
        AiMenu,
        MagicMenu,
        VersionTimeline,
        LinkPopover,
    },
    props: {
        content: { type: Object, required: true },
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        wwFrontState: { type: Object, required: true },
        /* wwEditor:end */
        useForm: { type: Boolean, default: true },
    },
    emits: ['trigger-event', 'update:content:effect', 'update:sidepanel-content'],
    setup(props, { emit }) {
        const { value: variableValue, setValue: _setValue } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            type: 'string',
            defaultValue: computed(() => String(props.content.initialValue || '')),
        });

        const { value: variableMentions, setValue: _setMentions } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'mentions',
            type: 'array',
            defaultValue: [],
            readonly: true,
        });

        const { value: states, setValue: _setStates } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'states',
            type: 'object',
            defaultValue: {},
            readonly: true,
        });

        const { value: pendingChangesCount, setValue: _setPendingChangesCount } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'pendingChangesCount',
            type: 'number',
            defaultValue: 0,
            readonly: true,
        });

        const { value: collaborationStatus, setValue: _setCollaborationStatus } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'collaborationStatus',
            type: 'object',
            defaultValue: computed(() => ({
                connected: false,
                synced: false,
                syncing: false,
                saving: false,
                saved: false,
                error: null,
                connectionId: null,
                users: [],
                userCount: 0,
            })),
            readonly: true,
        });

        const { value: seo, setValue: _setSeo } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'seo',
            type: 'object',
            defaultValue: null,
            readonly: true,
        });

        const { value: outline, setValue: _setOutline } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'outline',
            type: 'array',
            defaultValue: [],
            readonly: true,
        });

        const { value: currentHeading, setValue: _setCurrentHeading } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'currentHeading',
            type: 'object',
            defaultValue: null,
            readonly: true,
        });

        const { value: history, setValue: _setHistory } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'history',
            type: 'object',
            defaultValue: { canUndo: false, canRedo: false },
            readonly: true,
        });

        // true pendant un aperçu/comparaison de version (éditeur en lecture
        // seule sur un état passé), false en édition normale
        const { value: isVersionPreview, setValue: _setIsVersionPreview } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'isVersionPreview',
            type: 'boolean',
            defaultValue: false,
            readonly: true,
        });

        // Wrap setters to silently ignore calls after variable cleanup
        let _isDestroyed = false;
        onBeforeUnmount(() => { _isDestroyed = true; });
        const setValue = (...args) => { if (!_isDestroyed) _setValue(...args); };
        const setMentions = (...args) => { if (!_isDestroyed) _setMentions(...args); };
        const setStates = (...args) => { if (!_isDestroyed) _setStates(...args); };
        const setPendingChangesCount = (...args) => { if (!_isDestroyed) _setPendingChangesCount(...args); };
        const setCollaborationStatus = (...args) => { if (!_isDestroyed) _setCollaborationStatus(...args); };
        const setSeo = (...args) => { if (!_isDestroyed) _setSeo(...args); };
        const setHistory = (...args) => { if (!_isDestroyed) _setHistory(...args); };
        const setOutline = (...args) => { if (!_isDestroyed) _setOutline(...args); };
        const setCurrentHeading = (...args) => { if (!_isDestroyed) _setCurrentHeading(...args); };
        const setIsVersionPreview = (...args) => { if (!_isDestroyed) _setIsVersionPreview(...args); };


        /* wwEditor:start */
        const { createElement } = wwLib.useCreateElement();
        /* wwEditor:end */

        const randomUid = wwLib.wwUtils.getUid();

        const useForm = inject('_wwForm:useForm', () => { });

        const fieldName = computed(() => props.content.fieldName);
        const validation = computed(() => props.content.validation);
        const customValidation = computed(() => props.content.customValidation);

        useForm(
            variableValue,
            { fieldName, validation, customValidation },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form' }
        );

        // Initialiser la collaboration
        const contentRef = computed(() => props.content);
        const collaboration = useCollaboration(props, contentRef, emit, setCollaborationStatus);

        // Fournir les dépendances pour ImageNode.vue
        provide('useImageLayout', computed(() => props.content.useImageLayout || false));
        provide('imageLayoutElement', computed(() => props.content.imageLayoutElement));

        // Fournir les dépendances pour LinkPopover.vue
        provide('useLinkLayoutPopover', computed(() => props.content.useLinkLayoutPopover || false));
        provide('linkPopoverLayoutElement', computed(() => props.content.linkPopoverLayoutElement));
        provide('forceLinkPopoverDisplay', computed(() => props.content.forceLinkPopoverDisplay || false));
        provide('triggerLinkEvent', (eventName, eventData) => {
            emit('trigger-event', { name: eventName, event: eventData });
        });

        return {
            variableValue,
            setValue,
            variableMentions,
            setMentions,
            states,
            setStates,
            pendingChangesCount,
            setPendingChangesCount,
            collaborationStatus,
            setCollaborationStatus,
            seo,
            setSeo,
            history,
            setHistory,
            outline,
            setOutline,
            currentHeading,
            setCurrentHeading,
            isVersionPreview,
            setIsVersionPreview,
            randomUid,
            /* wwEditor:start */
            createElement,
            /* wwEditor:end */
            // Collaboration
            ...collaboration,
        };
    },
    data: () => ({
        richEditor: null,
        loading: false,
        // Mode historique : frise chronologique des versions
        versionHistory: {
            active: false,
            loadingList: false,
            versions: [],
            selectedId: null,
            liveEpoch: null,
            loadedArchiveEpoch: null,
            epochOverlay: { visible: false, targetEpoch: null, loading: false, pendingVersion: null },
        },
        epochBinaryCache: {},
        pendingSteps: [], // Accumulateur de diffs
        seoHighlightVisible: false, // reflété dans seo.highlighting
        outlineItems: [], // sommaire courant (avec positions doc, usage interne)
        activeOutlineIndex: -1, // titre visible au scroll (-1 = au-dessus du premier)
        activeHeadingSignature: '', // index:id:texte du titre courant, pour détecter un vrai changement
    }),

    watch: {
        'content.initialValue'(value) {
            if (!this.shouldEnableCollaboration && value !== this.getContent()) {
                this.richEditor.chain().setContent(value).setMeta('addToHistory', false).run();
                this.setValue(value);
            }
            this.$emit('trigger-event', { name: 'initValueChange', event: { value } });

            if (this.isReadonly) this.handleOnUpdate();
        },

        isEditable(value) {
            this.richEditor.setEditable(value);
        },
        variableValue(value, oldValue) {
            if (this.shouldEnableCollaboration) return;
            if (value !== this.getContent()) this.richEditor.chain().setContent(value).setMeta('addToHistory', false).run();
            // If format changed
            if (value !== this.getContent()) this.setValue(this.getContent());
        },
        /* wwEditor:start */
        editorConfig() {
            this.loadEditor();
        },
        'wwEditorState.boundProps.mentionList'(isBind) {
            if (!isBind)
                this.$emit('update:content:effect', {
                    mentionIdPath: null,
                    mentionLabelPath: null,
                });
        },
        // For updating legacy elements before introduction of custom menu
        'content.customMenu': {
            async handler(value) {
                if (value && !this.content.customMenuElement) {
                    const element = await this.createElement('ww-flexbox', {
                        _state: {
                            name: 'Custom menu container',
                            style: {
                                default: {
                                    width: '100%',
                                },
                            },
                        },
                    });
                    this.$emit('update:content:effect', {
                        customMenuElement: element,
                    });
                }
            },
            immediate: true,
        },
        // Auto-create imageLayoutElement when useImageLayout is enabled
        'content.useImageLayout': {
            async handler(value) {
                if (value && !this.content.imageLayoutElement) {
                    const element = await this.createElement('ww-flexbox', {
                        _state: {
                            name: 'Image template',
                            style: {
                                default: {
                                    width: '100%',
                                    height: '100%',
                                },
                            },
                        },
                    });
                    this.$emit('update:content:effect', {
                        imageLayoutElement: element,
                    });
                }
            },
            immediate: true,
        },
        // Auto-create linkPopoverLayoutElement when useLinkLayoutPopover is enabled
        'content.useLinkLayoutPopover': {
            async handler(value) {
                if (value && !this.content.linkPopoverLayoutElement) {
                    const element = await this.createElement('ww-flexbox', {
                        _state: {
                            name: 'Link popover template',
                            style: {
                                default: {
                                    width: '100%',
                                    height: '100%',
                                },
                            },
                        },
                    });
                    this.$emit('update:content:effect', {
                        linkPopoverLayoutElement: element,
                    });
                }
            },
            immediate: true,
        },
        'wwEditorState.isSelected'() {
            this.$emit('update:sidepanel-content', { path: 'selectedTag', value: null });
        },
        /* wwEditor:end */
        isReadonly: {
            immediate: true,
            handler(value) {
                if (value) {
                    this.$emit('add-state', 'readonly');
                } else {
                    this.$emit('remove-state', 'readonly');
                }
            },
        },
        editorStates: {
            deep: true,
            immediate: true,
            handler(value) {
                this.setStates(value);
            },
        },
        historyStates: {
            deep: true,
            immediate: true,
            handler(value) {
                this.setHistory(value);
            },
        },
        // Watchers de collaboration
        'collabConfig.documentId'(newId, oldId) {
            if (newId !== oldId && this.collabConfig.autoConnect && this.shouldEnableCollaboration) {
                this.initializeCollaboration();
                // Recharger l'éditeur pour inclure les extensions de collaboration
                this.loadEditor();
            }
        },
        'collabConfig.websocketUrl'(newUrl, oldUrl) {
            if (newUrl !== oldUrl && this.collabConfig.autoConnect && this.shouldEnableCollaboration) {
                this.initializeCollaboration();
                // Recharger l'éditeur pour inclure les extensions de collaboration
                this.loadEditor();
            }
        },
        'collabConfig.authToken'(newToken, oldToken) {
            if (newToken !== oldToken && this.collabConfig.autoConnect && this.shouldEnableCollaboration) {
                this.initializeCollaboration();
                // Recharger l'éditeur pour inclure les extensions de collaboration
                this.loadEditor();
            }
        },
        'collabConfig.userName'(newName, oldName) {
            if (newName !== oldName) {
                this.updateUserName(newName);
            }
        },
        'collabConfig.versionDiffColorMode'(newMode, oldMode) {
            if (newMode !== oldMode && this.shouldEnableCollaboration) {
                // Les options des extensions ychange sont figées au chargement
                this.loadEditor();
            }
        },
        // Historique des versions piloté par l'état bindé
        'content.showVersionHistory'(value) {
            if (value) {
                this.openVersionHistory();
            } else if (this.versionHistory.active) {
                this.closeVersionHistory();
            }
        },
        // La sélection initiale attend que le document soit synchronisé
        // (cas d'un binding déjà à true au chargement de la page)
        'collaborationStatus.synced'(synced) {
            if (!synced) return;
            const vh = this.versionHistory;
            if (this.content.showVersionHistory && !vh.active) {
                this.openVersionHistory();
                return;
            }
            if (vh.active && !vh.selectedId && vh.versions.length) {
                this.selectTimelineVersion(vh.versions[0]);
            }
        },
        // Époque périmée (document compacté côté serveur pendant une coupure) :
        // l'état Yjs local est inutilisable, on repart d'un document vierge
        'collaborationStatus.staleEpoch'(stale) {
            if (stale && this.shouldEnableCollaboration) {
                console.warn('[Collaboration] Reinitializing after stale epoch...');
                this.initializeCollaboration();
                this.loadEditor();
            }
        },
        'collabConfig.enabled'(enabled) {
            if (enabled && this.collabConfig.autoConnect && this.shouldEnableCollaboration) {
                this.initializeCollaboration();
                // Recharger l'éditeur pour inclure les extensions de collaboration
                this.loadEditor();
            } else if (!enabled) {
                this.destroyCollaboration();
                // Recharger l'éditeur sans les extensions de collaboration
                this.loadEditor();
            }
        },
        'content.enableSpellcheck'(newValue) {
            // Mettre à jour l'attribut spellcheck en temps réel
            if (this.richEditor && this.richEditor.view && this.richEditor.view.dom) {
                this.richEditor.view.dom.setAttribute('spellcheck', (newValue ?? true) ? 'true' : 'false');
            }
        },
        // Sommaire : activation/désactivation à chaud
        outlineEnabled(enabled) {
            if (enabled) {
                this.attachOutlineListeners();
                this.updateOutline();
            } else {
                this.detachOutlineListeners();
                this.resetOutline();
            }
        },
        outlineLevels() {
            if (this.outlineEnabled) this.updateOutline();
        },
        outlineOffset() {
            if (this.outlineEnabled) this.updateActiveHeading();
        },
        // Analyse SEO : recalcul quand une entrée change, nettoyage quand désactivée.
        // La computed retourne un objet neuf à chaque réévaluation de `content` :
        // sans la garde par valeur, le watcher (deep) relancerait une analyse
        // complète à chaque remplacement de `content`, même sans changement réel.
        seoOptions: {
            deep: true,
            handler(options) {
                if (!options) {
                    if (this.seoDebounce) {
                        clearTimeout(this.seoDebounce);
                        this.seoDebounce = null;
                    }
                    this.lastSeoOptionsKey = null;
                    this.seoRangesMap = null;
                    this.activeSeoHighlight = null;
                    this.seoHighlightVisible = false;
                    this.setSeo(null);
                    if (this.richEditor) this.richEditor.commands.clearSeoHighlights();
                    return;
                }
                const key = JSON.stringify(options);
                if (key === this.lastSeoOptionsKey) return;
                this.lastSeoOptionsKey = key;
                // Débouncé : une option bindée peut changer à chaque frappe
                // (ex. meta title lié à une variable) — une analyse synchrone
                // immédiate ici bloquerait la saisie.
                this.scheduleSeoAnalysis();
            },
        },
    },
    computed: {
        isEditing() {
            /* wwEditor:start */
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        },
        editorStates() {
            if (!this.richEditor) return {};
            const { from, to, empty } = this.richEditor.state.selection;
            const selectedText = empty ? '' : this.richEditor.state.doc.textBetween(from, to, ' ', ' ');
            const selectedTrimmed = selectedText.trim();
            return {
                selected: {
                    text: selectedText,
                    wordCount: selectedTrimmed ? selectedTrimmed.split(/\s+/).length : 0,
                    charCount: selectedText.length,
                },
                textType: Object.keys(TAGS_MAP).find(key => TAGS_MAP[key] === this.currentTextType),
                textColor: this.currentColor,
                bold: this.richEditor.isActive('bold'),
                italic: this.richEditor.isActive('italic'),
                underline: this.richEditor.isActive('underline'),
                strike: this.richEditor.isActive('strike'),
                bulletList: this.richEditor.isActive('bulletList'),
                orderedList: this.richEditor.isActive('orderedList'),
                checkList: this.richEditor.isActive('taskList'),
                link: this.richEditor.isActive('link'),
                codeBlock: this.richEditor.isActive('codeBlock'),
                blockquote: this.richEditor.isActive('blockquote'),
                textAlign: this.richEditor.isActive({ textAlign: 'left' })
                    ? 'left'
                    : this.richEditor.isActive({ textAlign: 'center' })
                        ? 'center'
                        : this.richEditor.isActive({ textAlign: 'right' })
                            ? 'right'
                            : this.richEditor.isActive({ textAlign: 'justify' })
                                ? 'justify'
                                : false,
                table: this.richEditor.isActive('table'),
            };
        },
        historyStates() {
            if (!this.richEditor) return { canUndo: false, canRedo: false };
            return {
                canUndo: this.richEditor.can().undo(),
                canRedo: this.richEditor.can().redo(),
            };
        },
        currentColor() {
            if (this.richEditor.getAttributes('textStyle')?.color)
                return this.richEditor.getAttributes('textStyle')?.color;
            else if (this.richEditor.isActive('link')) return this.content.a.color;
            else if (this.richEditor.isActive('codeBlock')) return this.content.code.color;
            else if (this.richEditor.isActive('blockquote')) return this.content.blockquote.color;
            else return this.content[Object.keys(TAGS_MAP).find(key => TAGS_MAP[key] === this.currentTextType)]?.color;
        },
        mentionList() {
            const data = wwLib.wwCollection.getCollectionData(this.content.mentionList);
            if (!Array.isArray(data)) return [];
            return data.map(mention => ({
                id: wwLib.resolveObjectPropertyPath(mention, this.content.mentionIdPath || 'id') || '',
                label: wwLib.resolveObjectPropertyPath(mention, this.content.mentionLabelPath || 'label') || '',
            }));
        },
        mentionListLength() {
            if (!this.content.mentionListLength || isNaN(this.content.mentionListLength)) return 5;
            return this.content.mentionListLength;
        },
        isReadonly() {
            return this.wwElementState.props.readonly === undefined
                ? this.content.readonly
                : this.wwElementState.props.readonly;
        },
        isEditable() {
            return !this.isReadonly && this.content.editable;
        },
        hideMenu() {
            return this.content.hideMenu || this.isReadonly;
        },
        isMagicMenu() {
            return (this.content.parameterAiMenuVariant ?? 'classic') === 'magic';
        },
        menu() {
            return {
                textType: this.content.parameterTextType ?? true,
                bold: this.content.parameterBold ?? true,
                italic: this.content.parameterItalic ?? true,
                underline: this.content.parameterUnderline ?? true,
                strike: this.content.parameterStrike ?? true,
                alignLeft: this.content.parameterAlignLeft ?? false,
                alignCenter: this.content.parameterAlignCenter ?? false,
                alignRight: this.content.parameterAlignRight ?? false,
                alignJustify: this.content.parameterAlignJustify ?? false,
                textColor: this.content.parameterTextColor ?? true,
                bulletList: this.content.parameterBulletList ?? true,
                orderedList: this.content.parameterOrderedList ?? true,
                taskList: this.content.parameterTaskList ?? false,

                table: this.content.parameterTable ?? false,

                link: this.content.parameterLink ?? true,
                image: this.content.parameterImage ?? false,
                codeBlock: this.content.parameterCodeBlock ?? true,
                blockquote: this.content.parameterQuote ?? true,
                undo: this.content.parameterUndo ?? true,
                redo: this.content.parameterRedo ?? true,

                aiMenu: this.content.parameterAiMenu ?? true,
            };
        },
        editorConfig() {
            return {
                placeholder: wwLib.wwLang.getText(this.content.placeholder),
                autofocus: this.content.autofocus,
                image: {
                    inline: this.content.img?.inline,
                    allowBase64: true,
                },
                mention: {
                    enabled: this.content.enableMention,
                    list: this.mentionList,
                    allowSpaces: this.content.mentionAllowSpaces,
                    char: this.content.mentionChar,
                },
            };
        },
        currentTextType: {
            get() {
                const currentType = this.textTypeOptions.find(option => option.active);
                return currentType ? currentType.value : 0;
            },
            set(value) {
                this.setTag(value);
            },
        },
        textTypeOptions() {
            if (!this.richEditor) return [];
            return [
                { label: 'Paragraph', value: 0, active: this.richEditor.isActive('paragraph') },
                { label: 'Heading 1', value: 1, active: this.richEditor.isActive('heading', { level: 1 }) },
                { label: 'Heading 2', value: 2, active: this.richEditor.isActive('heading', { level: 2 }) },
                { label: 'Heading 3', value: 3, active: this.richEditor.isActive('heading', { level: 3 }) },
                { label: 'Heading 4', value: 4, active: this.richEditor.isActive('heading', { level: 4 }) },
                { label: 'Heading 5', value: 5, active: this.richEditor.isActive('heading', { level: 5 }) },
                { label: 'Heading 6', value: 6, active: this.richEditor.isActive('heading', { level: 6 }) },
            ];
        },
        menuStyles() {
            return {
                '--menu-color': this.content.menuColor,
                'flex-wrap': this.content.wrapMenu ? 'wrap' : 'nowrap',
            };
        },
        richStyles() {
            return {
                display: 'flex',
                flex: 1,
                overflow: 'auto',
                // H1
                '--h1-fontSize': this.content.h1.fontSize,
                '--h1-fontFamily': this.content.h1.fontFamily,
                '--h1-fontWeight': this.content.h1.fontWeight,
                '--h1-textAlign': this.content.h1.textAlign,
                '--h1-color': this.content.h1.color,
                '--h1-lineHeight': this.content.h1.lineHeight,
                '--h1-margin-top': this.content.h1.marginTop,
                '--h1-margin-bottom': this.content.h1.marginBottom,
                // H2
                '--h2-fontSize': this.content.h2.fontSize,
                '--h2-fontFamily': this.content.h2.fontFamily,
                '--h2-fontWeight': this.content.h2.fontWeight,
                '--h2-textAlign': this.content.h2.textAlign,
                '--h2-color': this.content.h2.color,
                '--h2-lineHeight': this.content.h2.lineHeight,
                '--h2-margin-top': this.content.h2.marginTop,
                '--h2-margin-bottom': this.content.h2.marginBottom,
                // H3
                '--h3-fontSize': this.content.h3.fontSize,
                '--h3-fontFamily': this.content.h3.fontFamily,
                '--h3-fontWeight': this.content.h3.fontWeight,
                '--h3-textAlign': this.content.h3.textAlign,
                '--h3-color': this.content.h3.color,
                '--h3-lineHeight': this.content.h3.lineHeight,
                '--h3-margin-top': this.content.h3.marginTop,
                '--h3-margin-bottom': this.content.h3.marginBottom,
                // H4
                '--h4-fontSize': this.content.h4.fontSize,
                '--h4-fontFamily': this.content.h4.fontFamily,
                '--h4-fontWeight': this.content.h4.fontWeight,
                '--h4-textAlign': this.content.h4.textAlign,
                '--h4-color': this.content.h4.color,
                '--h4-lineHeight': this.content.h4.lineHeight,
                '--h4-margin-top': this.content.h4.marginTop,
                '--h4-margin-bottom': this.content.h4.marginBottom,
                // H5
                '--h5-fontSize': this.content.h5.fontSize,
                '--h5-fontFamily': this.content.h5.fontFamily,
                '--h5-fontWeight': this.content.h5.fontWeight,
                '--h5-textAlign': this.content.h5.textAlign,
                '--h5-color': this.content.h5.color,
                '--h5-lineHeight': this.content.h5.lineHeight,
                '--h5-margin-top': this.content.h5.marginTop,
                '--h5-margin-bottom': this.content.h5.marginBottom,
                // H6
                '--h6-fontSize': this.content.h6.fontSize,
                '--h6-fontFamily': this.content.h6.fontFamily,
                '--h6-fontWeight': this.content.h6.fontWeight,
                '--h6-textAlign': this.content.h6.textAlign,
                '--h6-color': this.content.h6.color,
                '--h6-lineHeight': this.content.h6.lineHeight,
                '--h6-margin-top': this.content.h6.marginTop,
                '--h6-margin-bottom': this.content.h6.marginBottom,
                // p
                '--p-fontSize': this.content.p.fontSize,
                '--p-fontFamily': this.content.p.fontFamily,
                '--p-fontWeight': this.content.p.fontWeight,
                '--p-textAlign': this.content.p.textAlign,
                '--p-color': this.content.p.color,
                '--p-lineHeight': this.content.p.lineHeight,
                '--p-margin-top': this.content.p.marginTop,
                '--p-margin-bottom': this.content.p.marginBottom,
                // mention
                '--mention-fontSize': this.content.mention.fontSize,
                '--mention-fontFamily': this.content.mention.fontFamily,
                '--mention-fontWeight': this.content.mention.fontWeight,
                '--mention-color': this.content.mention.color,
                '--mention-borderSize': this.content.mention.borderSize,
                '--mention-border-radius': this.content.mention.borderRadius,
                // a
                '--a-fontSize': this.content.a.fontSize,
                '--a-fontFamily': this.content.a.fontFamily,
                '--a-fontWeight': this.content.a.fontWeight,
                '--a-textAlign': this.content.a.textAlign,
                '--a-color': this.content.a.color,
                '--a-lineHeight': this.content.a.lineHeight,
                '--a-underline': this.content.a.isUnderline ? 'underline' : 'none',
                // blockquote
                '--blockquote-color': this.content.blockquote.color,
                '--blockquote-border-color': this.content.blockquote.borderColor,
                '--blockquote-margin-top': this.content.blockquote.marginTop,
                '--blockquote-margin-bottom': this.content.blockquote.marginBottom,
                // code
                '--code-color': this.content.code.color,
                '--code-bg-color': this.content.code.bgColor,
                '--code-border-radius': this.content.code.borderRadius,
                '--code-padding-y': this.content.code.paddingY,
                '--code-padding-x': this.content.code.paddingX,
                '--code-font-size': this.content.code.fontSize,
                // img
                '--img-max-width': this.content.img?.maxWidth,
                '--img-max-height': this.content.img?.maxHeight,
                // checkbox
                '--checkbox-color': this.content.checkbox?.color,
                // table
                '--table-border-color': this.content.table?.borderColor || '#C7C7C7',
                '--table-border-width': this.content.table?.borderWidth || '1px',
                '--table-header-bg-color': this.content.table?.headerBgColor || '#f5f5f5',
                '--table-header-color': this.content.table?.headerColor || '#000',
                '--table-pair-cell-bg-color': this.content.table?.pairCellBgColor || '#fff',
                '--table-odd-cell-bg-color': this.content.table?.oddCellBgColor || '#FDFDFD',
                '--table-cell-color': this.content.table?.cellColor || '#000',
                '--table-cell-padding-x': this.content.table?.cellPaddingX || '8px',
                '--table-cell-padding-y': this.content.table?.cellPaddingY || '6px',
                // tooltip
                '--tooltip-color': this.content.a?.tooltipColor || '#ffffff',
                '--tooltip-background-color': this.content.a?.tooltipBackgroundColor || '#393d45',
                '--tooltip-font-size': this.content.a?.tooltipFontSize || '12px',
                // editor padding
                '--editor-padding-top': this.content.editorPadding?.paddingTop || '12px',
                '--editor-padding-right': this.content.editorPadding?.paddingRight || '12px',
                '--editor-padding-bottom': this.content.editorPadding?.paddingBottom || '12px',
                '--editor-padding-left': this.content.editorPadding?.paddingLeft || '12px',
                // editor max width (100% = no constraint, keeps the padding calc valid)
                '--editor-max-width':
                    this.content.editorMaxWidth && this.content.editorMaxWidth !== 'none'
                        ? this.content.editorMaxWidth
                        : '100%',
            };
        },
        delay() {
            return wwLib.wwUtils.getLengthUnit(this.content.debounceDelay)[0];
        },
        // --- Sommaire (outline) ---
        outlineEnabled() {
            return !!this.content.enableOutline;
        },
        outlineLevels() {
            return resolveOutlineLevels(this.content.outlineLevels);
        },
        // Décalage de la ligne de détection : un en-tête fixe au-dessus de
        // l'éditeur masquerait sinon le titre au moment où il devient actif.
        outlineOffset() {
            const offset = Number(this.content.outlineOffset);
            return Number.isFinite(offset) ? offset : 0;
        },
        showOutlineIndicator() {
            return this.outlineEnabled && !!this.content.outlineIndicator;
        },
        currentHeadingPath() {
            const item = this.outlineItems[this.activeOutlineIndex];
            return item ? item.path : [];
        },
        outlineIndicatorStyles() {
            return {
                color: this.content.outlineIndicatorColor || 'rgba(0, 0, 0, 0.6)',
                backgroundColor: this.content.outlineIndicatorBgColor || 'transparent',
            };
        },
        seoOptions() {
            if (!this.content.enableSeoAnalysis) return null;
            return {
                keyword: this.content.seoKeyword,
                synonyms: this.content.seoKeywordSynonyms,
                secondaryKeywords: this.content.seoSecondaryKeywords,
                metaTitle: this.content.seoMetaTitle,
                metaDescription: this.content.seoMetaDescription,
                siteDomain: this.content.seoSiteDomain,
                lang: this.content.seoLang,
                uiLang: this.content.seoUiLang,
                wordLists: this.content.seoWordLists,
                expectH1: this.content.seoExpectH1,
                fullLemma: this.content.seoFullLemmatizer,
            };
        },
    },
    methods: {
        onEditorWheel(event) {
            /* wwEditor:start */
            // In edit mode the click-blocking overlay (.editing::before) sits above the
            // ProseMirror, so wheel events never reach the scroll container — forward them
            if (!this.isEditing || !this.richEditor) return;
            const dom = this.richEditor.view.dom;
            if (!dom || dom.scrollHeight <= dom.clientHeight) return;
            const previousScrollTop = dom.scrollTop;
            dom.scrollTop += event.deltaY;
            if (dom.scrollTop !== previousScrollTop) event.preventDefault();
            /* wwEditor:end */
        },
        loadEditor() {
            if (this.loading) return;
            this.loading = true;
            if (this.richEditor) this.richEditor.destroy();
            // Un éditeur fraîchement chargé repart en édition normale
            this.setIsVersionPreview(false);

            try {
                // Vérifier les imports d'extensions
                console.log('[Editor] Checking extension imports:', {
                    StarterKit: !!StarterKit,
                    SeoLink: !!SeoLink,
                    TextStyle: !!TextStyle,
                    Color: !!Color,
                    Underline: !!Underline,
                    Table: !!Table,
                    TableCell: !!TableCell,
                    TableHeader: !!TableHeader,
                    TableRow: !!TableRow,
                    TaskList: !!TaskList,
                    TaskItem: !!TaskItem,
                    TextAlign: !!TextAlign,
                    Placeholder: !!Placeholder,
                    Markdown: !!Markdown,
                    Image: !!Image,
                    SelectionHighlighter: !!SelectionHighlighter,
                    TextSuggestion: !!TextSuggestion,
                    TextStrike: !!TextStrike,
                });

                // Identifier quelle extension est undefined
                const undefinedExtensions = [];
                if (!StarterKit) undefinedExtensions.push('StarterKit');
                if (!SeoLink) undefinedExtensions.push('SeoLink');
                if (!TextStyle) undefinedExtensions.push('TextStyle');
                if (!Color) undefinedExtensions.push('Color');
                if (!Underline) undefinedExtensions.push('Underline');
                if (!Table) undefinedExtensions.push('Table');
                if (!TableCell) undefinedExtensions.push('TableCell');
                if (!TableHeader) undefinedExtensions.push('TableHeader');
                if (!TableRow) undefinedExtensions.push('TableRow');
                if (!TaskList) undefinedExtensions.push('TaskList');
                if (!TaskItem) undefinedExtensions.push('TaskItem');
                if (!TextAlign) undefinedExtensions.push('TextAlign');
                if (!Placeholder) undefinedExtensions.push('Placeholder');
                if (!Markdown) undefinedExtensions.push('Markdown');
                if (!Image) undefinedExtensions.push('Image');
                if (!SelectionHighlighter) undefinedExtensions.push('SelectionHighlighter');
                if (!TextSuggestion) undefinedExtensions.push('TextSuggestion');
                if (!TextStrike) undefinedExtensions.push('TextStrike');

                if (undefinedExtensions.length > 0) {
                    console.error('[Editor] ❌ Undefined extensions:', undefinedExtensions);
                    throw new Error(`Cannot load editor: ${undefinedExtensions.join(', ')} extension(s) are undefined. Check imports.`);
                }

                // Construire la liste des extensions
                // IMPORTANT: Désactiver History dans StarterKit si collaboration active
                // car History et Collaboration sont incompatibles
                const extensions = [
                    StarterKit.configure({
                        history: this.isCollaborating ? false : true,
                    }),
                    SeoLink.configure({
                        // target/rel sont calculés par lien (interne = lien normal,
                        // externe = _blank + noopener noreferrer nofollow). Le domaine
                        // est bindable : on le lit au rendu via un getter.
                        siteDomain: () => this.content.seoSiteDomain,
                        openOnClick: false, // On gère l'ouverture manuellement avec Cmd/Ctrl+clic
                        // Protection injection (XSS) : ne jamais auto-linker ni accepter
                        // une URL utilisant un protocole dangereux (javascript:, data:, ...).
                        shouldAutoLink: url => !isDangerousUrl(url),
                        isAllowedUri: (url, ctx) => ctx.defaultValidate(url) && !isDangerousUrl(url),
                    }),
                    TextStyle,
                    Color,
                    Underline,
                    Table.configure({
                        resizable: true,
                    }),
                    TableCell,
                    TableHeader,
                    TableRow,
                    TaskList,
                    TaskItem.configure({
                        nested: true,
                    }),
                    TextAlign.configure({
                        types: ['heading', 'paragraph'],
                    }),
                    Placeholder.configure({
                        placeholder: this.editorConfig.placeholder,
                    }),
                    Markdown.configure({ breaks: true }),
                    // Use CustomImage if useImageLayout is enabled, otherwise standard Image
                    this.content.useImageLayout
                        ? CustomImage.configure({
                              ...this.editorConfig.image,
                              generateImageId: ImageManager.generateImageId,
                              useImageLayout: true,
                          })
                        : Image.configure({ ...this.editorConfig.image }),
                    SelectionHighlighter.configure({
                        defaultColor: 'var(--primary-color-33)',
                    }),
                    // Surlignage SEO multi-plages (inerte tant qu'aucune décoration n'est posée)
                    SeoHighlighter,
                    TextSuggestion.configure({
                        suggestionText: null,
                        position: 1,
                        className: 'suggestion-label',
                        color: 'var(--primary-color)',
                    }),
                    TextStrike.configure({
                        defaultStrikeColor: 'var(--primary-color)',
                        ranges: [],
                        color: 'var(--primary-color)',
                    }),
                ];

                // Ajouter mention si activé
                if (this.editorConfig.mention.enabled) {
                    extensions.push(
                        Mention.configure({
                            HTMLAttributes: {
                                class: 'mention',
                            },
                            suggestion: {
                                items: ({ query }) =>
                                    this.editorConfig.mention.list
                                        .filter(({ label }) => label.toLowerCase().startsWith(query.toLowerCase()))
                                        .slice(0, this.mentionListLength),
                                render: suggestion.render,
                                allowSpaces: this.editorConfig.mention.allowSpaces,
                                char: this.editorConfig.mention.char,
                            },
                        })
                    );
                }

                // Ajouter les extensions de collaboration si actif
                console.log('[Editor] Checking collaboration state:', {
                    isCollaborating: this.isCollaborating,
                    hasYdoc: !!this.ydoc,
                    hasProvider: !!this.provider,
                    shouldEnableCollaboration: this.shouldEnableCollaboration,
                });

                const collabExtensions = this.getCollaborationExtensions();
                if (collabExtensions && collabExtensions.length > 0) {
                    extensions.push(...collabExtensions);
                    console.log('[Editor] ✅ Collaboration extensions loaded:', collabExtensions.length, collabExtensions.map(ext => ext.name));
                } else {
                    console.log('[Editor] ⚠️ No collaboration extensions loaded');
                }

                // Déterminer le contenu initial
                // En mode collaboration, on laisse Y.js gérer le contenu (même si la connexion n'est pas encore établie)
                const initialContent = this.shouldEnableCollaboration ? undefined : String(this.content.initialValue || '');

                console.log('[Editor] Creating editor with:', {
                    isCollaborating: this.isCollaborating,
                    hasInitialContent: !!initialContent,
                    hasInitialValue: !!this.content.initialValue,
                    extensionsCount: extensions.length,
                    extensionNames: extensions.map(ext => ext.name || ext.type || 'unknown'),
                });

                // Log spécial pour la collaboration
                if (this.isCollaborating) {
                    const collabExt = extensions.find(ext => ext.name === 'collaboration');
                    if (collabExt) {
                        console.log('[Editor] Collaboration extension found:', {
                            hasOptions: !!collabExt.options,
                            hasDocument: !!collabExt.options?.document,
                            documentType: collabExt.options?.document?.constructor?.name,
                        });
                    } else {
                        console.error('[Editor] ❌ Collaboration extension NOT found in extensions array!');
                    }
                }

                this.richEditor = new Editor({
                    content: initialContent,
                    editable: this.isEditable,
                    autofocus: this.editorConfig.autofocus,
                    onFocus: ({ editor, event }) => {
                        this.$emit('trigger-event', { name: 'focus', event: { editor, event } });
                    },
                    onBlur: ({ editor, event }) => {
                        this.$emit('trigger-event', { name: 'blur', event: { editor, event } });
                    },
                    extensions,
                    onCreate: () => {
                        console.log('[Editor] Editor created successfully');

                        this.setValue(this.getContent());
                        this.setMentions(this.richEditor.getJSON().content.reduce(extractMentions, []));
                        // Initialiser l'accumulateur de diffs à vide lors de la création
                        this.pendingSteps = [];
                        this.setPendingChangesCount(0);
                        this.scheduleSeoAnalysis(true);
                        // Débouncé : `this.richEditor` n'est pas encore assigné ici
                        this.scheduleOutlineUpdate();
                    },
                    onUpdate: ({ transaction }) => {
                        if (this.isDestroying) return;
                        // Intercepter les transactions pour enregistrer les steps
                        if (transaction.docChanged) {
                            transaction.steps.forEach(step => {
                                this.pendingSteps.push(step.toJSON());
                            });
                            this.setPendingChangesCount(this.pendingSteps.length);
                        }
                        // Appeler la fonction handleOnUpdate existante
                        this.handleOnUpdate();
                    },
                    // Contrairement à onUpdate, onTransaction est appelé pour TOUTE
                    // modification du document, y compris setContent (contenu bindé)
                    // qui pose la meta `preventUpdate`. C'est ici — et uniquement ici —
                    // que l'état dérivé du document (sommaire, mentions, analyse SEO)
                    // est resynchronisé, quel que soit le chemin d'entrée du contenu.
                    onTransaction: ({ editor, transaction }) => {
                        if (this.isDestroying || !transaction.docChanged) return;
                        this.setMentions(editor.getJSON().content.reduce(extractMentions, []));
                        this.scheduleOutlineUpdate();
                        this.scheduleSeoAnalysis();
                    },
                    editorProps: {
                        attributes: {
                            spellcheck: (this.content.enableSpellcheck ?? true) ? 'true' : 'false',
                        },
                        handleClickOn: (_view, _pos, node) => {
                            if (node.type.name === 'mention') {
                                this.$emit('trigger-event', {
                                    name: 'mention:click',
                                    event: { mention: { id: node.attrs.id, label: node.attrs.label } },
                                });
                            }
                        },
                        handleClick: (_view, _pos, event) => {
                            const link = event.target?.closest('a');
                            if (link && (event.metaKey || event.ctrlKey)) {
                                // Protection injection (XSS) : ne pas ouvrir un protocole dangereux.
                                safeOpenUrl(link.getAttribute('href'));
                                return true;
                            }
                            return false;
                        },
                    },
                });

                console.log('[Editor] Editor instance created:', !!this.richEditor);
            } catch (error) {
                console.error('[Editor] Error creating editor:', error);
                // Créer un éditeur basique en fallback
                this.richEditor = new Editor({
                    content: String(this.content.initialValue || ''),
                    editable: this.isEditable,
                    extensions: [StarterKit],
                });
            }

            this.loading = false;
        },
        handleOnUpdate() {
            if (this.isDestroying) return;
            let htmlValue = this.getContent();
            if (this.variableValue === htmlValue) return;
            this.setValue(htmlValue);
            if (this.content.debounce) {
                this.isDebouncing = true;
                if (this.debounce) {
                    clearTimeout(this.debounce);
                }
                this.debounce = setTimeout(() => {
                    if (this.isDestroying) return;
                    this.$emit('trigger-event', { name: 'change', event: { value: this.variableValue } });
                    this.isDebouncing = false;
                }, this.delay);
            } else {
                this.$emit('trigger-event', { name: 'change', event: { value: this.variableValue } });
            }
            // Sommaire, mentions et analyse SEO sont resynchronisés par le hook
            // onTransaction de l'éditeur (couvre aussi les chemins sans onUpdate).
        },
        setLink(url) {
            if (this.richEditor.isActive('link')) {
                this.richEditor.chain().focus().unsetLink().run();
                return;
            }

            // Si l'URL est fournie directement (depuis un menu personnalisé par exemple)
            // url doit être une string non vide (pas undefined, null, ou '')
            if (url !== undefined && url !== null && url !== '') {
                // Protection injection (XSS) : refuser les protocoles dangereux.
                const safeUrl = sanitizeLinkUrl(url);
                if (!safeUrl) return;
                // update link
                this.richEditor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
                return;
            }

            // Si useLinkLayoutPopover est activé, afficher le popover
            if (this.content.useLinkLayoutPopover && this.$refs.linkPopover) {
                this.$refs.linkPopover.showForNewLink();
                return;
            }

            // Sinon, utiliser la popup native
            const previousUrl = this.richEditor.getAttributes('link').href;
            const selectedUrl = window.prompt('URL', previousUrl);

            // cancelled
            if (selectedUrl === null) {
                return;
            }

            // empty
            if (selectedUrl === '') {
                this.richEditor.chain().focus().extendMarkRange('link').unsetLink().run();
                return;
            }

            // Protection injection (XSS) : refuser les protocoles dangereux.
            const safeUrl = sanitizeLinkUrl(selectedUrl);
            if (!safeUrl) return;

            // update link
            this.richEditor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
        },
        setImage(src, alt = '', title = '') {
            // If using image layout system with IDs
            if (this.content.useImageLayout) {
                if (this.content.customMenu) {
                    // Custom menu provides the src, alt, title
                    // Protection injection (XSS) : refuser les sources dangereuses.
                    const safeSrc = sanitizeImageSrc(src);
                    if (!safeSrc) return;
                    const imageId = ImageManager.generateImageId();
                    this.richEditor.commands.setImageWithId({
                        src: safeSrc,
                        dataImageId: imageId,
                        alt: alt,
                        title: title,
                    });
                } else {
                    // Prompt for URL (editor mode)
                    let url;
                    /* wwEditor:start */
                    url = wwLib.getEditorWindow().prompt('Image URL');
                    /* wwEditor:end */
                    /* wwFront:start */
                    url = wwLib.getFrontWindow().prompt('Image URL');
                    /* wwFront:end */

                    const safeSrc = sanitizeImageSrc(url);
                    if (!safeSrc) return;

                    const imageId = ImageManager.generateImageId();
                    this.richEditor.commands.setImageWithId({
                        src: safeSrc,
                        dataImageId: imageId,
                        alt: alt,
                        title: title,
                    });
                }
            } else {
                // Standard behavior (no ID system)
                if (this.content.customMenu) {
                    // Protection injection (XSS) : refuser les sources dangereuses.
                    const safeSrc = sanitizeImageSrc(src);
                    if (!safeSrc) return;
                    this.richEditor.commands.setImage({ src: safeSrc, alt, title });
                } else {
                    let url;
                    /* wwEditor:start */
                    url = wwLib.getEditorWindow().prompt('Image URL');
                    /* wwEditor:end */
                    /* wwFront:start */
                    url = wwLib.getFrontWindow().prompt('Image URL');
                    /* wwFront:end */

                    const safeSrc = sanitizeImageSrc(url);
                    if (!safeSrc) return;
                    this.richEditor.chain().focus().setImage({ src: safeSrc }).run();
                }
            }
        },
        focusEditor() {
            this.richEditor.chain().focus().run();
        },
        setTag(tag) {
            if (typeof tag === 'string') {
                tag = tag.toLocaleLowerCase().trim();
                if (tag in TAGS_MAP) tag = TAGS_MAP[tag];
            }
            if (tag === 0) this.richEditor.chain().focus().setParagraph().run();
            if (tag !== 0)
                this.richEditor
                    .chain()
                    .focus()
                    .toggleHeading({ level: Number(tag) })
                    .run();
        },
        toggleUnderline() {
            this.richEditor.chain().focus().toggleMark('underline').run();
        },
        toggleBold() {
            this.richEditor.chain().focus().toggleBold().run();
        },
        toggleItalic() {
            this.richEditor.chain().focus().toggleItalic().run();
        },
        toggleStrike() {
            this.richEditor.chain().focus().toggleStrike().run();
        },
        setTextAlign(textAlign) {
            this.richEditor.chain().focus().setTextAlign(textAlign).run();
        },
        setColor(color) {
            this.richEditor.chain().focus().setColor(color).run();
        },
        toggleBulletList() {
            this.richEditor.chain().focus().toggleBulletList().run();
        },
        toggleOrderedList() {
            this.richEditor.chain().focus().toggleOrderedList().run();
        },
        toggleTaskList() {
            this.richEditor.chain().focus().toggleTaskList().run();
        },
        toggleCodeBlock() {
            this.richEditor.chain().focus().toggleCodeBlock().run();
        },
        toggleBlockquote() {
            this.richEditor.chain().focus().toggleBlockquote().run();
        },
        undo() {
            this.richEditor.chain().undo().run();
        },
        redo() {
            this.richEditor.chain().redo().run();
        },
        getContent() {
            if (this.content.output === 'markdown') return this.richEditor.storage.markdown.getMarkdown();
            return this.richEditor.getHTML();
        },
        /* Table */
        insertTable() {
            this.richEditor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        },
        insertRow(direction) {
            direction === 'before'
                ? this.richEditor.chain().focus().addRowBefore().run()
                : this.richEditor.chain().focus().addRowAfter().run();
        },
        insertColumn(direction) {
            direction === 'before'
                ? this.richEditor.chain().focus().addColumnBefore().run()
                : this.richEditor.chain().focus().addColumnAfter().run();
        },
        deleteRow() {
            this.richEditor.chain().focus().deleteRow().run();
        },
        deleteColumn() {
            this.richEditor.chain().focus().deleteColumn().run();
        },
        deleteTable() {
            this.richEditor.chain().focus().deleteTable().run();
        },

        // AI Menu actions

        openAiMenu(modificationType) {
            // Vérifier si le menu AI est activé avant de l'ouvrir
            if (!this.content.enableAiMenu) {
                return; // Ne pas ouvrir le menu si enableAiMenu est false
            }
            
            // Ouvrir directement le composant AiMenu
            if (this.$refs.aiMenu) {
                this.$refs.aiMenu.openWithType(modificationType ?? null);
            }
        },

        setResponse(response) {
            // Appeler la méthode setResponse du composant AiMenu
            if (this.$refs.aiMenu) {
                this.$refs.aiMenu.setResponse(response);
            }
        },

        handleAiPrompt(eventData) {
            // Déclencher l'événement WeWeb 'ai-prompt' via $emit
            this.$emit('trigger-event', { name: 'ai-prompt', event: eventData });
        },

        handleAiSuggestionApplied(eventData) {
            // Déclencher l'événement WeWeb 'ai-suggestion-applied' via $emit
            this.$emit('trigger-event', { name: 'ai-suggestion-applied', event: eventData });
        },

        // Gestion de l'accumulateur de diffs
        getAndClearChanges() {
            // Récupérer une copie des steps accumulés
            const steps = [...this.pendingSteps];

            // Vider l'accumulateur
            this.pendingSteps = [];
            this.setPendingChangesCount(0);

            // Retourner les steps pour que WeWeb puisse les envoyer à l'API
            return steps;
        },

        clearChanges() {
            // Vider l'accumulateur sans récupération
            this.pendingSteps = [];
            this.setPendingChangesCount(0);
        },

        saveDocument(saveId = null) {
            this.sendSaveSignal(true, saveId);
        },

        // ===== Versionnage (snapshots Yjs) =====

        createVersion(label = null) {
            return this.sendCreateVersionSignal(label);
        },

        /**
         * Affiche le document à un état donné, avec les ajouts/suppressions
         * annotés (colorés par auteur) par rapport à un état de référence.
         * @param {string|null} snapshot - état AFFICHÉ, le plus récent :
         *   contenu base64 de la colonne ydoc_versions.snapshot (PAS l'id de
         *   la ligne). null/vide = état actuel du document vivant.
         * @param {string|null} prevSnapshot - état de RÉFÉRENCE, plus ancien.
         *   null = document vide (tout apparaît comme ajouté).
         * Ex. « quoi de neuf depuis la version X » : showVersionCompare(null, snapshotX)
         * Limite : versions de l'époque courante uniquement (sinon passer par
         * l'endpoint REST /versions/:id/content côté WeWeb).
         */
        showVersionCompare(snapshot = null, prevSnapshot = null) {
            if (!this.shouldEnableCollaboration || !this.richEditor || !this.ydoc) {
                console.warn('[Versions] Compare requires active collaboration');
                return false;
            }
            try {
                const decode = b64 => {
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b64)) {
                        throw new Error(
                            "Un id de version (uuid) a été fourni au lieu du snapshot : passez le contenu de la colonne ydoc_versions.snapshot"
                        );
                    }
                    return Y.decodeSnapshot(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
                };
                const view = this.richEditor.view;
                const compareDoc = this.getCompareDoc();
                view.dispatch(
                    view.state.tr.setMeta(ySyncPluginKey, {
                        snapshot: snapshot ? decode(snapshot) : Y.snapshot(compareDoc),
                        prevSnapshot: prevSnapshot ? decode(prevSnapshot) : Y.emptySnapshot,
                    })
                );
                this.richEditor.setEditable(false);
                this.setIsVersionPreview(true);
                return true;
            } catch (e) {
                console.error('[Versions] Compare failed:', e);
                this.$emit('trigger-event', {
                    name: 'collab:error',
                    event: {
                        error: 'version-compare',
                        message: e.message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return false;
            }
        },

        /**
         * Diff annoté d'une version appartenant à une époque ARCHIVÉE :
         * charge temporairement l'archive de l'époque à la place du document
         * vivant, puis applique la comparaison dessus (attribution comprise —
         * elle est stockée dans l'archive elle-même).
         * @param {string} epochBinary - binaire base64 de l'époque
         *   (colonne ydoc_epochs.binary_data, lisible via Supabase)
         * @param {string|null} snapshot - version affichée (null = fin de l'époque)
         * @param {string|null} prevSnapshot - version de référence
         */
        showArchiveVersionCompare(epochBinary, snapshot = null, prevSnapshot = null) {
            if (!this.shouldEnableCollaboration || !epochBinary) {
                console.warn('[Versions] Archive compare requires active collaboration and an epoch binary');
                return false;
            }
            try {
                this.enterArchivePreview(epochBinary);
                this.loadEditor();
                const ok = this.showVersionCompare(snapshot, prevSnapshot);
                if (!ok) {
                    this.exitArchivePreview();
                    this.loadEditor();
                }
                return ok;
            } catch (e) {
                console.error('[Versions] Archive compare failed:', e);
                this.exitArchivePreview();
                this.loadEditor();
                this.$emit('trigger-event', {
                    name: 'collab:error',
                    event: {
                        error: 'archive-version-compare',
                        message: e.message,
                        timestamp: new Date().toISOString(),
                    },
                });
                return false;
            }
        },

        hideVersionPreview() {
            if (!this.richEditor) return;
            // Sortie d'un aperçu d'archive : rebrancher l'éditeur sur le
            // document vivant
            if (this.isArchivePreview()) {
                this.exitArchivePreview();
                this.loadEditor();
                return;
            }
            const binding = ySyncPluginKey.getState(this.richEditor.view.state)?.binding;
            if (binding) binding.unrenderSnapshot();
            this.richEditor.setEditable(this.isEditable);
            this.setIsVersionPreview(false);
        },

        // ===== Mode historique (frise chronologique) =====

        collabApiFetch(path) {
            const base = (this.collabConfig.websocketUrl || '').replace(/^ws/, 'http').replace(/\/+$/, '');
            const token = this.collabConfig.authToken || '';
            const auth = token.startsWith('Bearer') ? token : `Bearer ${token}`;
            return fetch(`${base}${path}`, { headers: { Authorization: auth } }).then(async response => {
                if (!response.ok) {
                    const body = await response.json().catch(() => ({}));
                    throw new Error(body.error || `HTTP ${response.status}`);
                }
                return response.json();
            });
        },

        async openVersionHistory() {
            if (!this.shouldEnableCollaboration) {
                console.warn('[Versions] History requires active collaboration');
                return false;
            }
            const vh = this.versionHistory;
            vh.active = true;
            vh.loadingList = true;
            try {
                const res = await this.collabApiFetch(
                    `/documents/${encodeURIComponent(this.collabConfig.documentId)}/versions`
                );
                vh.versions = res.versions || [];
                vh.liveEpoch = res.currentEpoch ?? null;
                vh.loadingList = false;
                // Sélection initiale seulement si le doc est synchronisé ;
                // sinon le watcher collaborationStatus.synced s'en chargera
                const latest = vh.versions[0];
                if (latest && this.collaborationStatus?.synced) {
                    await this.selectTimelineVersion(latest);
                }
                return true;
            } catch (e) {
                console.error('[Versions] Failed to load history:', e);
                vh.loadingList = false;
                vh.active = false;
                this.$emit('trigger-event', {
                    name: 'collab:error',
                    event: { error: 'version-history', message: e.message, timestamp: new Date().toISOString() },
                });
                return false;
            }
        },

        closeVersionHistory() {
            const vh = this.versionHistory;
            vh.active = false;
            vh.selectedId = null;
            vh.loadedArchiveEpoch = null;
            vh.epochOverlay = { visible: false, targetEpoch: null, loading: false, pendingVersion: null };
            this.hideVersionPreview();
        },

        // Liste triée desc : la version « précédente » est la suivante du
        // tableau, si elle appartient à la même époque
        previousVersionInEpoch(version) {
            const versions = this.versionHistory.versions;
            const idx = versions.findIndex(v => v.id === version.id);
            if (idx === -1) return null;
            const prev = versions[idx + 1];
            return prev && prev.epoch === version.epoch ? prev : null;
        },

        async selectTimelineVersion(version) {
            const vh = this.versionHistory;
            const prev = this.previousVersionInEpoch(version);

            if (version.epoch === vh.liveEpoch) {
                // Époque courante : comparaison sur le document vivant
                if (this.isArchivePreview()) {
                    this.exitArchivePreview();
                    this.loadEditor();
                    vh.loadedArchiveEpoch = null;
                }
                if (this.showVersionCompare(version.snapshot, prev?.snapshot ?? null)) {
                    this.markTimelineSelection(version);
                }
            } else if (vh.loadedArchiveEpoch === version.epoch) {
                // Archive déjà chargée dans l'éditeur
                if (this.showVersionCompare(version.snapshot, prev?.snapshot ?? null)) {
                    this.markTimelineSelection(version);
                }
            } else if (this.epochBinaryCache[version.epoch]) {
                // Binaire déjà téléchargé : pas d'overlay
                await this.loadArchiveEpoch(version);
            } else {
                // Époque archivée à télécharger : demander confirmation
                vh.epochOverlay = { visible: true, targetEpoch: version.epoch, loading: false, pendingVersion: version };
            }
        },

        markTimelineSelection(version) {
            this.versionHistory.selectedId = version.id;
            this.$emit('trigger-event', {
                name: 'version-history:select',
                event: {
                    id: version.id,
                    versionNumber: version.version_number,
                    epoch: version.epoch,
                    timestamp: new Date().toISOString(),
                },
            });
        },

        async loadArchiveEpoch(version) {
            let binary = this.epochBinaryCache[version.epoch];
            if (!binary) {
                const res = await this.collabApiFetch(
                    `/documents/${encodeURIComponent(this.collabConfig.documentId)}/epochs/${version.epoch}`
                );
                binary = res.binary_data;
                this.epochBinaryCache[version.epoch] = binary;
            }
            const prev = this.previousVersionInEpoch(version);
            if (this.showArchiveVersionCompare(binary, version.snapshot, prev?.snapshot ?? null)) {
                this.versionHistory.loadedArchiveEpoch = version.epoch;
                this.markTimelineSelection(version);
            }
        },

        async confirmLoadEpoch() {
            const vh = this.versionHistory;
            const version = vh.epochOverlay.pendingVersion;
            if (!version) return;
            vh.epochOverlay.loading = true;
            try {
                await this.loadArchiveEpoch(version);
                vh.epochOverlay = { visible: false, targetEpoch: null, loading: false, pendingVersion: null };
            } catch (e) {
                console.error('[Versions] Epoch load failed:', e);
                vh.epochOverlay.loading = false;
                this.$emit('trigger-event', {
                    name: 'collab:error',
                    event: { error: 'epoch-load', message: e.message, timestamp: new Date().toISOString() },
                });
            }
        },

        cancelLoadEpoch() {
            this.versionHistory.epochOverlay = { visible: false, targetEpoch: null, loading: false, pendingVersion: null };
        },

        // Ancre la bulle d'attribution à droite quand l'élément survolé est
        // dans la moitié droite du composant (sinon elle déborderait)
        onVersionDiffHover(event) {
            const el = event.target?.closest?.('[data-ychange-label]');
            if (!el || !this.$el) return;
            const containerRect = this.$el.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            const isRightHalf = elRect.left - containerRect.left > containerRect.width / 2;
            el.setAttribute('data-ychange-align', isRightHalf ? 'right' : 'left');
        },

        // Image Layout actions
        insertEmptyImage(caption = null, position = null, refresh = false) {
            if (!this.content.useImageLayout) {
                console.warn('Image Layout system is not enabled. Enable "Use image layout system" in settings.');
                return null;
            }
            return ImageManager.insertEmptyImage(this.richEditor, caption, position, refresh);
        },

        updateImageById(imageId, url, alt = '', title = '', caption = null, position = null, refresh = null) {
            if (!this.content.useImageLayout) {
                console.warn('Image Layout system is not enabled. Enable "Use image layout system" in settings.');
                return;
            }
            ImageManager.updateImageById(this.richEditor, imageId, url, alt, title, caption, position, refresh);
        },

        getImageById(imageId) {
            if (!this.content.useImageLayout) {
                console.warn('Image Layout system is not enabled. Enable "Use image layout system" in settings.');
                return null;
            }
            return ImageManager.getImageById(this.richEditor, imageId);
        },

        removeImageById(imageId) {
            if (!this.content.useImageLayout) {
                console.warn('Image Layout system is not enabled. Enable "Use image layout system" in settings.');
                return;
            }
            ImageManager.removeImageById(this.richEditor, imageId);
        },

        getAllImagesMapping() {
            if (!this.content.useImageLayout) {
                console.warn('Image Layout system is not enabled. Enable "Use image layout system" in settings.');
                return {};
            }
            return ImageManager.getAllImages(this.richEditor);
        },

        // Link Popover actions
        openCurrentLink() {
            if (!this.$refs.linkPopover) {
                console.warn('Link popover is not available.');
                return;
            }
            this.$refs.linkPopover.openLink();
        },

        editCurrentLink(newUrl) {
            if (!this.$refs.linkPopover) {
                console.warn('Link popover is not available.');
                return;
            }
            this.$refs.linkPopover.editLink(newUrl);
        },

        removeCurrentLink() {
            if (!this.$refs.linkPopover) {
                console.warn('Link popover is not available.');
                return;
            }
            this.$refs.linkPopover.removeLink();
        },

        getCurrentLinkUrl() {
            if (!this.$refs.linkPopover) {
                console.warn('Link popover is not available.');
                return null;
            }
            return this.$refs.linkPopover.linkUrl;
        },

        closeCurrentLinkPopover() {
            if (!this.$refs.linkPopover) {
                console.warn('Link popover is not available.');
                return;
            }
            this.$refs.linkPopover.closePopover();
        },

        // SEO analysis
        scheduleSeoAnalysis(immediate = false) {
            if (!this.content.enableSeoAnalysis || !this.richEditor || this.isDestroying) return;
            if (this.seoDebounce) {
                clearTimeout(this.seoDebounce);
                this.seoDebounce = null;
            }
            if (immediate) {
                this.runSeoAnalysis();
                return;
            }
            this.seoDebounce = setTimeout(() => {
                this.seoDebounce = null;
                this.runSeoAnalysis();
            }, 500);
        },

        async runSeoAnalysis() {
            if (!this.content.enableSeoAnalysis || !this.richEditor || this.isDestroying) return;
            try {
                // Import dynamique : le module d'analyse n'est chargé que si l'extension est activée
                if (!this.seoAnalyzerPromise) {
                    this.seoAnalyzerPromise = import('./seo/analyzer.js');
                }
                const { analyzeSeo } = await this.seoAnalyzerPromise;
                if (!this.content.enableSeoAnalysis || !this.richEditor || this.isDestroying) return;

                // Garder la garde du watcher seoOptions en phase : cette analyse
                // couvre déjà les options courantes, inutile d'en relancer une.
                this.lastSeoOptionsKey = JSON.stringify(this.seoOptions);
                const previous = this.seo;
                const { result, rangesMap } = analyzeSeo(this.richEditor.state.doc, this.seoOptions || {});
                this.seoRangesMap = rangesMap;
                // Surlignage persistant : ré-appliquer les plages fraîches du check actif,
                // puis refléter l'état de surlignage dans l'objet seo exposé
                this.refreshSeoHighlight();
                result.highlighting = this.seoHighlightVisible;
                this.setSeo(result);

                if (!previous || previous.score !== result.score || previous.grade !== result.grade) {
                    this.$emit('trigger-event', {
                        name: 'seo:change',
                        event: { score: result.score, grade: result.grade, scores: result.scores },
                    });
                }
            } catch (error) {
                console.error('[SEO] Analysis error:', error);
            }
        },

        highlightSeoCheck(checkId, color = null) {
            if (!this.richEditor || !this.seoRangesMap) return false;
            const ranges = this.seoRangesMap[checkId];
            if (!ranges || !ranges.length) return false;

            // Couleur : argument de l'action > seoHighlightColor (settings) > défaut de l'extension
            const effectiveColor = color || this.content.seoHighlightColor || null;

            // Mode persistant : le check reste surligné à travers les éditions
            // (mapping ProseMirror) et ses plages sont recalculées à chaque ré-analyse,
            // jusqu'à clearSeoHighlight ou un highlight sur un autre check.
            this.activeSeoHighlight = { checkId, color: effectiveColor };
            this.richEditor.commands.setSeoHighlights(ranges, effectiveColor || undefined);
            this.setSeoHighlightingState(true);

            this.scrollToSeoRange(ranges[0]);
            return true;
        },

        // Ré-applique le surlignage du check actif avec les plages de la dernière
        // analyse (sans scroll : appelé pendant que l'utilisateur tape).
        // Ré-applique le surlignage du check actif et met à jour le flag interne.
        // Ne touche PAS à la variable seo : appelé depuis runSeoAnalysis qui pose
        // ensuite result.highlighting.
        refreshSeoHighlight() {
            if (!this.richEditor) return;
            const active = this.activeSeoHighlight;
            const ranges = active ? this.seoRangesMap?.[active.checkId] || [] : [];
            if (ranges.length) {
                this.richEditor.commands.setSeoHighlights(ranges, active.color || undefined);
                this.seoHighlightVisible = true;
            } else {
                // Pas de mode actif, ou plus d'occurrence (corrigé) : rien de surligné,
                // mais le mode reste armé si de nouvelles occurrences apparaissent.
                // Ne dispatcher la transaction de nettoyage que si un surlignage
                // était réellement affiché (évite un re-render à chaque analyse).
                if (this.seoHighlightVisible) this.richEditor.commands.clearSeoHighlights();
                this.seoHighlightVisible = false;
            }
        },

        clearSeoHighlight() {
            this.activeSeoHighlight = null;
            if (this.richEditor) this.richEditor.commands.clearSeoHighlights();
            this.setSeoHighlightingState(false);
        },

        // Met à jour le flag interne + reflète `highlighting` dans l'objet seo exposé
        // (pour les actions déclenchées hors ré-analyse : highlight/clear au clic).
        setSeoHighlightingState(value) {
            this.seoHighlightVisible = value;
            if (this.seo) this.setSeo({ ...this.seo, highlighting: value });
        },

        // Scroll vers une plage. Les plages de texte pointent à l'intérieur du
        // texte (domAtPos OK) ; les plages de bloc/nœud (titres, images) pointent
        // AVANT le nœud → domAtPos renvoie le conteneur parent et ne scrolle pas.
        // nodeDOM(pos) renvoie le DOM du nœud qui commence à cette position.
        scrollToSeoRange(range) {
            if (!this.richEditor || !range) return;
            try {
                const view = this.richEditor.view;
                const dom = view.nodeDOM(range.from) || view.domAtPos(range.from)?.node;
                const element = dom?.nodeType === Node.ELEMENT_NODE ? dom : dom?.parentElement;
                element?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            } catch {
                // Position introuvable dans le DOM : le surlignage reste appliqué
            }
        },

        // --- Sommaire (outline) et section visible ---

        // Le sommaire suit le contenu : débouncé pendant la frappe, immédiat à
        // la création de l'éditeur et au changement de configuration.
        scheduleOutlineUpdate() {
            if (!this.outlineEnabled || this.isDestroying) return;
            if (this.outlineDebounce) clearTimeout(this.outlineDebounce);
            this.outlineDebounce = setTimeout(() => {
                this.outlineDebounce = null;
                this.updateOutline();
            }, 300);
        },

        updateOutline() {
            if (!this.outlineEnabled || !this.richEditor || this.isDestroying) return;
            this.outlineItems = buildOutline(this.richEditor.state.doc, this.outlineLevels);
            // Des titres ont pu disparaître : l'index actif est ramené dans les
            // bornes, sa fraîcheur est assurée par updateActiveHeading (la
            // signature du titre courant a changé s'il a été supprimé/renommé).
            this.activeOutlineIndex = Math.min(this.activeOutlineIndex, this.outlineItems.length - 1);
            this.publishOutline();
            // Les titres ont pu bouger : la section visible est remesurée dans le DOM
            this.updateActiveHeading();
        },

        resetOutline() {
            if (this.outlineDebounce) {
                clearTimeout(this.outlineDebounce);
                this.outlineDebounce = null;
            }
            this.outlineItems = [];
            this.activeOutlineIndex = -1;
            this.activeHeadingSignature = '';
            this.setOutline([]);
            this.setCurrentHeading(null);
        },

        publishOutline() {
            this.setOutline(toPublicOutline(this.outlineItems, this.activeOutlineIndex));
        },

        // Ligne de référence : le haut de la zone de texte visible. Quand le
        // texte défile dans l'éditeur, c'est le haut de l'éditeur ; quand c'est
        // la page qui défile, l'éditeur sort par le haut → on retombe sur le
        // haut du viewport.
        getOutlineRefTop() {
            const dom = this.richEditor?.view?.dom;
            if (!dom) return this.outlineOffset;
            return Math.max(dom.getBoundingClientRect().top, 0) + this.outlineOffset;
        },

        getHeadingElement(item) {
            if (!item || !this.richEditor) return null;
            try {
                const dom = this.richEditor.view.nodeDOM(item.from);
                return dom?.nodeType === Node.ELEMENT_NODE ? dom : null;
            } catch {
                // Position hors document (frappe entre deux recalculs)
                return null;
            }
        },

        // Le conteneur qui défile réellement : l'éditeur lui-même, un wrapper
        // scrollable, ou la page (null).
        getOutlineScrollElement() {
            const win = this.$el?.ownerDocument?.defaultView;
            let element = this.richEditor?.view?.dom;
            while (win && element && element !== win.document.body) {
                const overflowY = win.getComputedStyle(element).overflowY;
                if (/(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight + 1) {
                    return element;
                }
                element = element.parentElement;
            }
            return null;
        },

        // La section visible = le dernier titre passé au-dessus de la ligne de
        // référence. Les titres sont en ordre doc : on s'arrête au premier qui
        // est encore en dessous.
        updateActiveHeading() {
            if (!this.outlineEnabled || !this.richEditor || this.isDestroying) return;
            if (!this.outlineItems.length) {
                this.setActiveOutlineIndex(-1);
                return;
            }
            const refTop = this.getOutlineRefTop();
            let active = -1;
            for (const item of this.outlineItems) {
                const element = this.getHeadingElement(item);
                if (!element) continue;
                // 1px de tolérance : le scroll produit des positions sous-pixel
                if (element.getBoundingClientRect().top - refTop > 1) break;
                active = item.index;
            }
            this.setActiveOutlineIndex(active);
        },

        setActiveOutlineIndex(index) {
            const item = index >= 0 ? this.outlineItems[index] || null : null;
            // La signature couvre le renommage et la suppression : à index égal,
            // le titre courant peut avoir changé entre deux recalculs.
            const signature = item ? `${item.index}:${item.id}:${item.text}` : '';
            if (signature === this.activeHeadingSignature && index === this.activeOutlineIndex) return;
            this.activeOutlineIndex = index;
            this.activeHeadingSignature = signature;
            const heading = toPublicHeading(item);
            this.setCurrentHeading(heading);
            // `active` change dans le sommaire exposé (pratique pour styliser la TOC)
            this.publishOutline();
            this.$emit('trigger-event', {
                name: 'heading:change',
                event: heading || { id: '', index: -1, level: 0, text: '', path: [] },
            });
        },

        attachOutlineListeners() {
            const document_ = this.$el?.ownerDocument;
            const win = document_?.defaultView;
            if (!document_ || !win || this.outlineListenersAttached) return;

            this.onOutlineScroll = () => {
                if (this.outlineFrame) return;
                this.outlineFrame = win.requestAnimationFrame(() => {
                    this.outlineFrame = null;
                    this.updateActiveHeading();
                });
            };
            // Capture : les événements scroll ne remontent pas, mais descendent
            // en capture — un seul écouteur couvre le défilement interne de
            // l'éditeur comme celui de la page ou d'un wrapper intermédiaire.
            document_.addEventListener('scroll', this.onOutlineScroll, { capture: true, passive: true });
            win.addEventListener('resize', this.onOutlineScroll, { passive: true });
            // Cibles mémorisées : au démontage, this.$el peut déjà avoir disparu
            this.outlineListenersAttached = { document_, win };
        },

        detachOutlineListeners() {
            const attached = this.outlineListenersAttached;
            if (attached?.win && this.outlineFrame) {
                attached.win.cancelAnimationFrame(this.outlineFrame);
                this.outlineFrame = null;
            }
            if (!attached || !this.onOutlineScroll) return;
            attached.document_.removeEventListener('scroll', this.onOutlineScroll, { capture: true });
            attached.win.removeEventListener('resize', this.onOutlineScroll);
            this.onOutlineScroll = null;
            this.outlineListenersAttached = null;
        },

        // Cible acceptée : id du titre, index, ou texte exact.
        findOutlineItem(target) {
            if (target === null || target === undefined || target === '') return null;
            if (typeof target === 'number') return this.outlineItems[target] || null;
            const key = String(target).trim();
            const byId = this.outlineItems.find(item => item.id === key);
            if (byId) return byId;
            if (/^\d+$/.test(key)) return this.outlineItems[Number(key)] || null;
            const lower = key.toLowerCase();
            return this.outlineItems.find(item => item.text.toLowerCase() === lower) || null;
        },

        scrollToHeading(target, focus = false) {
            if (!this.richEditor) return false;
            const item = this.findOutlineItem(target);
            if (!item) return false;

            // Le focus place d'abord le curseur (ProseMirror ramène la position
            // dans le viewport) ; le scroll ci-dessous ne fait plus qu'aligner.
            if (focus && this.isEditable) this.richEditor.chain().focus(item.from + 1).run();

            const element = this.getHeadingElement(item);
            if (!element) return false;
            const delta = element.getBoundingClientRect().top - this.getOutlineRefTop();
            const scrollElement = this.getOutlineScrollElement();
            if (scrollElement) scrollElement.scrollBy({ top: delta, behavior: 'smooth' });
            else this.$el?.ownerDocument?.defaultView?.scrollBy({ top: delta, behavior: 'smooth' });
            return true;
        },

        scrollToNextHeading() {
            return this.scrollToHeading(this.activeOutlineIndex + 1);
        },

        scrollToPreviousHeading() {
            // On repart du titre courant : à mi-section, « précédent » remonte
            // à celui qui vient d'être dépassé.
            return this.scrollToHeading(Math.max(this.activeOutlineIndex - 1, 0));
        },

        getOutline() {
            return toPublicOutline(this.outlineItems, this.activeOutlineIndex);
        },
    },
    mounted() {
        console.log('[Editor] Component mounted, checking collaboration config:', {
            autoConnect: this.collabConfig.autoConnect,
            shouldEnable: this.shouldEnableCollaboration,
            documentId: this.collabConfig.documentId,
            websocketUrl: this.collabConfig.websocketUrl,
        });

        // Initialiser la collaboration si configurée
        if (this.collabConfig.autoConnect && this.shouldEnableCollaboration) {
            console.log('[Editor] Initializing collaboration before loading editor...');
            this.initializeCollaboration();

            // Vérifier que la collaboration est bien initialisée
            console.log('[Editor] Collaboration initialized:', {
                isCollaborating: this.isCollaborating,
                hasYdoc: !!this.ydoc,
                hasProvider: !!this.provider,
            });

            // Charger l'éditeur avec les extensions de collaboration
            this.loadEditor();
        } else {
            console.log('[Editor] Loading editor without collaboration');
            this.loadEditor();
        }

        // Suivi de la section visible (écouteurs en capture : indépendants de
        // l'instance d'éditeur, ils survivent à un rechargement de celle-ci)
        if (this.outlineEnabled) this.attachOutlineListeners();
    },
    beforeUnmount() {
        this.isDestroying = true;

        // Nettoyer le debounce en cours
        if (this.debounce) {
            clearTimeout(this.debounce);
            this.debounce = null;
        }

        // Nettoyer l'analyse SEO en attente
        if (this.seoDebounce) {
            clearTimeout(this.seoDebounce);
            this.seoDebounce = null;
        }

        // Nettoyer le suivi du sommaire
        if (this.outlineDebounce) {
            clearTimeout(this.outlineDebounce);
            this.outlineDebounce = null;
        }
        this.detachOutlineListeners();

        // Nettoyer la collaboration
        this.destroyCollaboration();

        // Nettoyer l'éditeur
        if (this.richEditor) this.richEditor.destroy();
    },
};
</script>

<style lang="scss">
.ww-rich-text {
    --menu-color: unset;
    display: flex;
    flex-direction: column;
    min-height: 150px;
    position: relative;

    &.editing .ww-rich-text__input {
        position: relative;

        &::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 1;
        }
    }

    &.editing .native-menu {
        position: relative;

        &::before {
            content: '';
            position: absolute;
            inset: 0;
            z-index: 1;
        }
    }

    .separator {
        background: rgb(235, 236, 240);
        width: 1px;
        height: 24px;
        margin: 0px 8px;

        &:last-child {
            display: none;
        }
    }

    &__menu {
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: 4px;
        gap: 4px;
        overflow-x: auto;
        min-height: 32px;

        select {
            padding: 8px;
            appearance: none;
            border: none;
            font-weight: 700;
            cursor: pointer;
            color: var(--menu-color);
            background-color: transparent;

            &:hover {
                background-color: rgb(245, 245, 245);
            }
        }

        &-item {
            padding: 2px;
            color: var(--menu-color);
            cursor: pointer;
            text-align: center;
            border-radius: 4px;

            i {
                width: 24px;
            }

            .icon {
                color: var(--menu-color);
                display: flex;
                width: 24px;
                max-height: 16px;
            }

            &:hover {
                background-color: rgb(245, 245, 245);
            }

            &.is-active {
                color: white;
                background-color: var(--menu-color);
            }
        }
    }

    /* Indicateur de section visible : reste en haut de l'éditeur quand le texte
       défile à l'intérieur, colle au viewport quand c'est la page qui défile */
    &__outline {
        position: sticky;
        top: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 24px;
        padding: 4px 12px;
        font-size: 13px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;

        &-entry {
            overflow: hidden;
            text-overflow: ellipsis;

            &:last-child {
                flex: 0 1 auto;
                font-weight: 600;
            }
        }

        &-separator {
            flex: 0 0 auto;
            opacity: 0.5;
        }
    }

    .ProseMirror {
        /* Basic editor styles */
        cursor: text;
        height: 100%;
        min-height: 100px;
        width: 100%;
        padding-top: var(--editor-padding-top, 12px);
        /* Center the text column when --editor-max-width is set: the extra space
           goes into the padding, so the scrollbar stays on the editor edge */
        padding-right: max(var(--editor-padding-right, 12px), calc((100% - var(--editor-max-width, 100%)) / 2));
        padding-bottom: var(--editor-padding-bottom, 12px);
        padding-left: max(var(--editor-padding-left, 12px), calc((100% - var(--editor-max-width, 100%)) / 2));
        overflow: auto;
        box-sizing: border-box;
        font-size: var(--p-fontSize);
        font-family: var(--p-fontFamily);
        font-weight: var(--p-fontSize);
        text-align: var(--p-textAlign);
        color: var(--p-color);
        line-height: var(--p-lineHeight);

        &-focused {
            outline: unset;
        }

        >*+* {
            margin-top: 0.75em;
        }

        /* Placeholder (at the top) */
        & p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #adb5bd;
            pointer-events: none;
            height: 0;
        }

        h1 {
            font-size: var(--h1-fontSize);
            font-family: var(--h1-fontFamily);
            font-weight: var(--h1-fontWeight);
            text-align: var(--h1-textAlign);
            color: var(--h1-color);
            line-height: var(--h1-lineHeight);
            margin-top: var(--h1-margin-top);
            margin-bottom: var(--h1-margin-bottom);
        }

        h2 {
            font-size: var(--h2-fontSize);
            font-family: var(--h2-fontFamily);
            font-weight: var(--h2-fontWeight);
            text-align: var(--h2-textAlign);
            color: var(--h2-color);
            line-height: var(--h2-lineHeight);
            margin-top: var(--h2-margin-top);
            margin-bottom: var(--h2-margin-bottom);
        }

        h3 {
            font-size: var(--h3-fontSize);
            font-family: var(--h3-fontFamily);
            font-weight: var(--h3-fontWeight);
            text-align: var(--h3-textAlign);
            color: var(--h3-color);
            line-height: var(--h3-lineHeight);
            margin-top: var(--h3-margin-top);
            margin-bottom: var(--h3-margin-bottom);
        }

        h4 {
            font-size: var(--h4-fontSize);
            font-family: var(--h4-fontFamily);
            font-weight: var(--h4-fontWeight);
            text-align: var(--h4-textAlign);
            color: var(--h4-color);
            line-height: var(--h4-lineHeight);
            margin-top: var(--h4-margin-top);
            margin-bottom: var(--h4-margin-bottom);
        }

        h5 {
            font-size: var(--h5-fontSize);
            font-family: var(--h5-fontFamily);
            font-weight: var(--h5-fontWeight);
            text-align: var(--h5-textAlign);
            color: var(--h5-color);
            line-height: var(--h5-lineHeight);
            margin-top: var(--h5-margin-top);
            margin-bottom: var(--h5-margin-bottom);
        }

        h6 {
            font-size: var(--h6-fontSize);
            font-family: var(--h6-fontFamily);
            font-weight: var(--h6-fontWeight);
            text-align: var(--h6-textAlign);
            color: var(--h6-color);
            line-height: var(--h6-lineHeight);
            margin-top: var(--h6-margin-top);
            margin-bottom: var(--h6-margin-bottom);
        }

        p {
            font-size: var(--p-fontSize);
            font-family: var(--p-fontFamily);
            font-weight: var(--p-fontWeight);
            text-align: var(--p-textAlign);
            color: var(--p-color);
            line-height: var(--p-lineHeight);
            margin-top: var(--p-margin-top);
            margin-bottom: var(--p-margin-bottom);
        }

        a {
            display: initial;
            text-decoration: var(--a-underline);
            font-size: var(--a-fontSize);
            font-family: var(--a-fontFamily);
            font-weight: var(--a-fontWeight);
            text-align: var(--a-textAlign);
            color: var(--a-color);
            line-height: var(--a-lineHeight);
            cursor: pointer;
        }


        .mention {
            border: var(--mention-borderSize) solid var(--mention-color);
            border-radius: var(--mention-border-radius);
            padding: 0.1rem 0.3rem;
            box-decoration-break: clone;
            cursor: pointer;
            font-size: var(--mention-fontSize);
            font-family: var(--mention-fontFamily);
            font-weight: var(--mention-fontSize);
            color: var(--mention-color);
        }

        table {
            border-collapse: collapse;
            margin: 0;
            overflow: hidden;
            display: table;
            width: 100%;

            td,
            th {
                text-align: left;
                border: var(--table-border-width) solid var(--table-border-color);
                box-sizing: border-box;
                min-width: 1em;
                padding: var(--table-cell-padding-y) var(--table-cell-padding-x);
                position: relative;
                vertical-align: top;

                >* {
                    margin-bottom: 0;
                }
            }

            th {
                color: var(--table-header-color);
                font-style: normal;
                font-weight: 500;
                font-size: 15px;
                line-height: 18px;
                letter-spacing: -0.08px;
                background-color: var(--table-header-bg-color);
            }

            td {
                background-color: var(--table-pair-cell-bg-color);
                color: var(--table-cell-color);
            }

            tr:nth-child(odd) td {
                background-color: var(--table-odd-cell-bg-color);
            }

            /*
            .selectedCell:after {
                background: blue;
                content: '';
                left: 0;
                right: 0;
                top: 0;
                bottom: 0;
                pointer-events: none;
                position: absolute;
                z-index: 2;
            }
                */

            .column-resize-handle {
                background-color: red;
                bottom: -2px;
                pointer-events: none;
                position: absolute;
                right: -2px;
                top: 0;
                width: 4px;
            }
        }

        .tableWrapper {
            margin: 1.5rem 0;
            overflow-x: auto;
        }

        &.resize-cursor {
            cursor: ew-resize;
            cursor: col-resize;
        }

        blockquote {
            color: var(--blockquote-color);
            border-left: 0.2rem solid var(--blockquote-border-color);
            margin: 1rem 0;
            padding: 0.25rem 0 0.25rem 1rem;
            margin-top: var(--blockquote-margin-top);
            margin-bottom: var(--blockquote-margin-bottom);
        }

        pre {
            background: var(--code-bg-color);
            color: var(--code-color);
            font-family: 'JetBrainsMono', monospace;
            padding: var(--code-padding-y) var(--code-padding-x);
            border-radius: var(--code-border-radius);

            code {
                color: inherit;
                padding: 0;
                background: none;
                font-size: var(--code-font-size);
            }
        }

        img {
            max-width: var(--img-max-width);
            max-height: var(--img-max-height);
        }

        ul[data-type='taskList'] {
            list-style: none;
            padding: 0;

            p {
                margin: 0;
            }

            li {
                display: flex;

                >label {
                    flex: 0 0 auto;
                    margin-right: var(--ww-spacing-01);
                    user-select: none;
                }

                >div {
                    flex: 1 1 auto;
                }

                ul li,
                ol li {
                    display: list-item;
                }

                ul[data-type='taskList']>li {
                    display: flex;
                }

                input[type='checkbox'] {
                    cursor: pointer;
                    accent-color: var(--checkbox-color);
                }
            }
        }
    }

    &.-readonly .ProseMirror {
        cursor: inherit;
    }

    // Style pour les liens sécurisés
    .safe-link {
        cursor: default !important;
        position: relative;
        
        &:hover {
            cursor: text !important;
            
            &::after {
                content: attr(data-tooltip);
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: var(--tooltip-background-color);
                color: var(--tooltip-color);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: var(--tooltip-font-size);
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
            }
        }
    }

    /* Styles des curseurs de collaboration */
    .collaboration-cursor__caret {
        position: relative;
        border-left: 2px solid;
        border-right: none;
        margin-left: -1px;
        margin-right: -1px;
        pointer-events: none;
        word-break: normal;
        width: 0;
        z-index: 99;
    }
    

    .collaboration-cursor__label {
        position: absolute;
        top: -1.8em;
        left: -2px;
        font-size: 12px;
        font-style: normal;
        font-weight: 600;
        line-height: normal;
        user-select: none;
        color: #fff;
        padding: 2px 6px;
        border-radius: 3px 3px 3px 0;
        white-space: nowrap;
        pointer-events: none;
        transition: top 0.2s ease, left 0.2s ease, right 0.2s ease, border-radius 0.2s ease;
        z-index: 100;
    }
}

/* ===== Aperçu de version — bulle d'attribution au survol =====
   Bulle CSS instantanée (le title natif est peu fiable dans l'éditeur). */
.ww-rich-text .ProseMirror ychange {
    border-radius: 2px;
}

.ww-rich-text .ProseMirror ychange[data-ychange-label] {
    position: relative;
}

.ww-rich-text .ProseMirror ychange[data-ychange-label]:hover::after,
.ww-rich-text .ProseMirror [data-ychange-type][data-ychange-label]:not(:has(ychange)):hover::after {
    content: attr(data-ychange-label);
    position: absolute;
    top: -1.9em;
    left: 0;
    background: #1f2937;
    color: #fff;
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    line-height: normal;
    text-decoration: none;
    padding: 2px 6px;
    border-radius: 3px 3px 3px 0;
    white-space: nowrap;
    pointer-events: none;
    z-index: 100;
}

.ww-rich-text .ProseMirror [data-ychange-type][data-ychange-label] {
    position: relative;
}

/* Élément dans la moitié droite : bulle ancrée à droite, déployée vers la gauche */
.ww-rich-text .ProseMirror [data-ychange-label][data-ychange-align='right']:hover::after {
    left: auto;
    right: 0;
    border-radius: 3px 3px 0 3px;
}

/* ===== Mode historique : la frise se superpose au contenu du menu =====
   Le conteneur du menu garde sa taille et sa position ; seul son contenu
   s'estompe pendant que la frise apparaît dans la même boîte. */
.ww-rich-text {
    position: relative;
}

.ww-rich-text__menu-slot {
    position: relative;
}

/* Sans menu du tout, réserver la place de la frise en mode historique */
.ww-rich-text__menu-slot.-history:not(:has(.ww-rich-text__menu)) {
    min-height: 52px;
}

.ww-rich-text__menu-slot .ww-rich-text__menu {
    transition: opacity 0.25s ease, transform 0.25s ease;
}

.ww-rich-text__menu-slot.-history .ww-rich-text__menu {
    opacity: 0;
    transform: translateY(-4px);
    pointer-events: none;
}

.ww-rich-text__menu-timeline {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: translateY(4px);
    pointer-events: none;
    transition: opacity 0.25s ease, transform 0.25s ease;
    z-index: 5;
}

.ww-rich-text__menu-slot.-history .ww-rich-text__menu-timeline {
    opacity: 1;
    transform: none;
    pointer-events: auto;
}

/* ===== Overlay de chargement d'une époque archivée ===== */
.ww-rich-text__epoch-overlay {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.ww-rich-text__epoch-overlay-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px 28px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.ww-rich-text__epoch-overlay-btn {
    background: var(--primary-color, #007bff);
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 600;
    cursor: pointer;
}

.ww-rich-text__epoch-overlay-cancel {
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 12px;
}

.ww-rich-text__epoch-spinner {
    width: 28px;
    height: 28px;
    border: 3px solid #e5e7eb;
    border-top-color: var(--primary-color, #007bff);
    border-radius: 50%;
    animation: ww-epoch-spin 0.8s linear infinite;
}

@keyframes ww-epoch-spin {
    to {
        transform: rotate(360deg);
    }
}
</style>