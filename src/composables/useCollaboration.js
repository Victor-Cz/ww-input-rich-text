import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { TiptapCollabProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';

/**
 * Composable pour gérer la collaboration Hocuspocus/Yjs dans l'éditeur Tiptap
 * @param {Object} props - Props du composant parent
 * @param {Object} content - Contenu de la configuration
 * @param {Function} emit - Fonction emit du composant parent
 * @param {Function} setCollaborationStatus - Fonction pour mettre à jour le statut
 */
export function useCollaboration(props, content, emit, setCollaborationStatus) {
    // États réactifs
    const ydoc = ref(null);
    const provider = ref(null);
    const isCollaborating = ref(false);
    const connectionAttempts = ref(0);
    const maxConnectionAttempts = 5;

    // Configuration de collaboration
    const collabConfig = computed(() => ({
        enabled: content.value.enableCollaboration || false,
        websocketUrl: content.value.websocketUrl || '',
        documentId: content.value.documentId || '',
        authToken: content.value.authToken || '',
        userName: content.value.userName || 'Anonymous',
        autoConnect: content.value.autoConnect ?? true,
        saveMode: content.value.saveMode || 'manual',
    }));

    // Vérification si la collaboration doit être activée
    const shouldEnableCollaboration = computed(() => {
        return (
            collabConfig.value.enabled &&
            collabConfig.value.documentId &&
            collabConfig.value.websocketUrl
        );
    });

    // Palette de couleurs pour les curseurs
    const getRandomColor = () => {
        const colors = [
            '#958DF1', '#F98181', '#FBBC88', '#FAF594',
            '#70CFF8', '#94FADB', '#B9F18D', '#C3E2C2',
            '#EAECCC', '#AFC8AD', '#EEC759', '#9BB8CD'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Configuration des event listeners du provider
    const setupCollaborationListeners = (collaborationStatus) => {
        if (!provider.value) return;

        // Événement de connexion
        provider.value.on('connect', () => {
            connectionAttempts.value = 0;
            setCollaborationStatus({
                ...collaborationStatus.value,
                connected: true,
                error: null,
            });

            emit('trigger-event', {
                name: 'collab:connected',
                event: {
                    documentId: collabConfig.value.documentId,
                    timestamp: new Date().toISOString(),
                    connectionId: provider.value.connection?.connectionId || null,
                },
            });
        });

        // Événement de déconnexion
        provider.value.on('disconnect', ({ event }) => {
            setCollaborationStatus({
                ...collaborationStatus.value,
                connected: false,
                synced: false,
            });

            emit('trigger-event', {
                name: 'collab:disconnected',
                event: {
                    documentId: collabConfig.value.documentId,
                    timestamp: new Date().toISOString(),
                    reason: event?.reason || 'unknown',
                },
            });
        });

        // Événement de synchronisation
        provider.value.on('synced', () => {
            setCollaborationStatus({
                ...collaborationStatus.value,
                synced: true,
                syncing: false,
            });

            emit('trigger-event', {
                name: 'collab:synced',
                event: {
                    documentId: collabConfig.value.documentId,
                    timestamp: new Date().toISOString(),
                    state: 'synced',
                },
            });
        });

        // Événement de synchronisation en cours
        provider.value.on('status', ({ status }) => {
            if (status === 'connecting' || status === 'syncing') {
                setCollaborationStatus({
                    ...collaborationStatus.value,
                    syncing: true,
                });

                emit('trigger-event', {
                    name: 'collab:syncing',
                    event: {
                        documentId: collabConfig.value.documentId,
                        timestamp: new Date().toISOString(),
                        state: status,
                    },
                });
            }
        });

        // Événement d'erreur
        provider.value.on('error', ({ error }) => {
            connectionAttempts.value++;

            setCollaborationStatus({
                ...collaborationStatus.value,
                error: error.message,
            });

            emit('trigger-event', {
                name: 'collab:error',
                event: {
                    error: error.name,
                    message: error.message,
                    timestamp: new Date().toISOString(),
                },
            });

            // Retry logic
            if (connectionAttempts.value < maxConnectionAttempts) {
                setTimeout(() => {
                    if (provider.value && !provider.value.isConnected) {
                        provider.value.connect();
                    }
                }, 2000 * connectionAttempts.value);
            }
        });

        // Awareness (présence des utilisateurs)
        if (provider.value.awareness) {
            provider.value.awareness.on('change', () => {
                const states = Array.from(provider.value.awareness.getStates().values());
                const users = states.filter(state => state.user).map(state => state.user);

                setCollaborationStatus({
                    ...collaborationStatus.value,
                    users,
                    userCount: users.length,
                });

                emit('trigger-event', {
                    name: 'collab:awareness-update',
                    event: {
                        users,
                        count: users.length,
                        timestamp: new Date().toISOString(),
                    },
                });
            });
        }
    };

    // Initialisation de la collaboration
    const initializeCollaboration = (collaborationStatus) => {
        // Nettoyer si déjà existant
        destroyCollaboration(collaborationStatus);

        if (!shouldEnableCollaboration.value) {
            return;
        }

        try {
            // Créer le document Yjs
            ydoc.value = new Y.Doc();

            // Configurer le provider pour serveur Hocuspocus auto-hébergé
            const providerConfig = {
                name: collabConfig.value.documentId,
                document: ydoc.value,
                baseUrl: collabConfig.value.websocketUrl,
                parameters: {
                    saveMode: collabConfig.value.saveMode,
                    userName: collabConfig.value.userName,
                },
            };

            // Ajouter le token d'authentification si fourni
            if (collabConfig.value.authToken) {
                providerConfig.token = collabConfig.value.authToken;
            }

            // Créer le provider
            provider.value = new TiptapCollabProvider(providerConfig);

            // Configurer les event listeners
            setupCollaborationListeners(collaborationStatus);

            isCollaborating.value = true;

        } catch (error) {
            console.error('Error initializing collaboration:', error);
            emit('trigger-event', {
                name: 'collab:error',
                event: {
                    error: error.name,
                    message: error.message,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    };

    // Destruction de la collaboration
    const destroyCollaboration = (collaborationStatus) => {
        if (provider.value) {
            provider.value.destroy();
            provider.value = null;
        }

        if (ydoc.value) {
            ydoc.value.destroy();
            ydoc.value = null;
        }

        isCollaborating.value = false;
        connectionAttempts.value = 0;

        setCollaborationStatus({
            connected: false,
            synced: false,
            syncing: false,
            error: null,
            connectionId: null,
            users: [],
            userCount: 0,
        });
    };

    // Actions publiques
    const connectCollaboration = () => {
        if (!provider.value) {
            // Sera initialisé par le watcher ou manuellement
            return;
        } else if (!provider.value.isConnected) {
            provider.value.connect();
        }
    };

    const disconnectCollaboration = () => {
        if (provider.value && provider.value.isConnected) {
            provider.value.disconnect();
        }
    };

    const forceSync = () => {
        if (provider.value && provider.value.isConnected) {
            provider.value.forceSync();
        }
    };

    const getConnectionStatus = (collaborationStatus) => {
        return {
            connected: provider.value?.isConnected || false,
            synced: provider.value?.isSynced || false,
            documentId: collabConfig.value.documentId,
            users: collaborationStatus.value.users || [],
            userCount: collaborationStatus.value.userCount || 0,
        };
    };

    // Obtenir les extensions Tiptap pour la collaboration
    const getCollaborationExtensions = () => {
        if (!isCollaborating.value || !ydoc.value) {
            return [];
        }

        const extensions = [
            Collaboration.configure({
                document: ydoc.value,
            })
        ];

        // Ajouter les curseurs collaboratifs si awareness est disponible
        if (provider.value?.awareness) {
            extensions.push(
                CollaborationCursor.configure({
                    provider: provider.value,
                    user: {
                        name: collabConfig.value.userName || 'Anonymous',
                        color: getRandomColor(),
                    },
                })
            );
        }

        return extensions;
    };

    // Mettre à jour le nom d'utilisateur dans awareness
    const updateUserName = (newName) => {
        if (provider.value?.awareness) {
            provider.value.awareness.setLocalStateField('user', {
                name: newName,
                color: getRandomColor(),
            });
        }
    };

    // Cleanup automatique
    onBeforeUnmount(() => {
        if (provider.value) {
            provider.value.destroy();
        }
        if (ydoc.value) {
            ydoc.value.destroy();
        }
    });

    return {
        // États
        ydoc,
        provider,
        isCollaborating,
        collabConfig,
        shouldEnableCollaboration,

        // Méthodes
        initializeCollaboration,
        destroyCollaboration,
        connectCollaboration,
        disconnectCollaboration,
        forceSync,
        getConnectionStatus,
        getCollaborationExtensions,
        updateUserName,
        getRandomColor,
    };
}
