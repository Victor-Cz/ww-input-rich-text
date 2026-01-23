import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { HocuspocusProvider } from '@hocuspocus/provider';
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
    // Note: On stocke ydoc comme une propriété directe au lieu d'une ref
    // pour éviter les problèmes de référence avec Tiptap
    let ydocInstance = null;
    const ydoc = computed(() => ydocInstance);
    const provider = ref(null);
    const isCollaborating = ref(false);
    const connectionAttempts = ref(0);

    // Configuration de collaboration
    const collabConfig = computed(() => ({
        enabled: content.value.enableCollaboration || false,
        websocketUrl: content.value.websocketUrl || '',
        documentId: content.value.documentId || '',
        authToken: content.value.authToken || '',
        userName: content.value.userName || 'Anonymous',
        autoConnect: content.value.autoConnect ?? true,
        saveMode: content.value.saveMode || 'manual',
        maxConnectionAttempts: content.value.maxConnectionAttempts || 5,
    }));

    // Vérification si la collaboration doit être activée
    const shouldEnableCollaboration = computed(() => {
        return collabConfig.value.enabled && collabConfig.value.documentId && collabConfig.value.websocketUrl;
    });

    // Palette de couleurs pour les curseurs (couleurs plus foncées et saturées)
    const getRandomColor = () => {
        const colors = [
            '#6B46C1', // Violet foncé
            '#DC2626', // Rouge foncé
            '#EA580C', // Orange foncé
            '#CA8A04', // Jaune moutarde
            '#0284C7', // Bleu foncé
            '#0D9488', // Teal foncé
            '#16A34A', // Vert foncé
            '#65A30D', // Vert lime foncé
            '#C026D3', // Magenta foncé
            '#DB2777', // Rose foncé
            '#7C3AED', // Indigo foncé
            '#0891B2', // Cyan foncé
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    };

    // Configuration des event listeners du provider
    const setupCollaborationListeners = collaborationStatus => {
        if (!provider.value) return;

        // Événement de connexion
        provider.value.on('connect', () => {
            connectionAttempts.value = 0;

            // LOG DE SUCCÈS CLAIR
            console.log('✅ [Collaboration] Successfully connected to Hocuspocus server!', {
                documentId: collabConfig.value.documentId,
                websocketUrl: collabConfig.value.websocketUrl,
                userName: collabConfig.value.userName,
            });

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
            // LOG DE SUCCÈS POUR LA SYNC
            console.log('✅ [Collaboration] Document synced successfully!', {
                documentId: collabConfig.value.documentId,
            });

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

            // Utiliser console.warn au lieu de console.error pour les premières tentatives
            const logLevel = connectionAttempts.value < collabConfig.value.maxConnectionAttempts ? 'warn' : 'error';

            console[logLevel](
                `[Collaboration] Connection ${logLevel} (attempt ${connectionAttempts.value}/${collabConfig.value.maxConnectionAttempts}):`,
                {
                    errorName: error.name,
                    errorMessage: error.message,
                    documentId: collabConfig.value.documentId,
                    websocketUrl: collabConfig.value.websocketUrl,
                }
            );

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
                    attempt: connectionAttempts.value,
                    maxAttempts: collabConfig.value.maxConnectionAttempts,
                },
            });

            // Retry logic avec nombre de tentatives configurable
            if (connectionAttempts.value < collabConfig.value.maxConnectionAttempts) {
                const retryDelay = 2000 * connectionAttempts.value;
                console.log(`[Collaboration] Retrying in ${retryDelay}ms...`);
                setTimeout(() => {
                    if (provider.value && !provider.value.isConnected) {
                        provider.value.connect();
                    }
                }, retryDelay);
            } else {
                console.error(`[Collaboration] Max connection attempts reached. Stopping retries.`);
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
    const initializeCollaboration = collaborationStatus => {
        // Nettoyer si déjà existant
        destroyCollaboration(collaborationStatus);

        if (!shouldEnableCollaboration.value) {
            return;
        }

        try {
            // Créer le document Yjs et le stocker directement
            ydocInstance = new Y.Doc();

            // Nettoyer l'URL WebSocket (enlever les slashes finaux)
            const cleanBaseUrl = collabConfig.value.websocketUrl.replace(/\/+$/, '');

            // HocuspocusProvider attend:
            // - url: l'URL du serveur WebSocket
            // - name: le nom du document (sera ajouté à l'URL par le provider)
            const providerConfig = {
                url: cleanBaseUrl, // URL de base sans le documentId
                name: collabConfig.value.documentId, // Le provider ajoutera automatiquement /{name}
                document: ydocInstance,
                token: collabConfig.value.authToken || undefined,
                // Passer les paramètres personnalisés via onAuthenticate
                onAuthenticate: () => {
                    return {
                        token: collabConfig.value.authToken,
                        saveMode: collabConfig.value.saveMode,
                        userName: collabConfig.value.userName,
                    };
                },
            };

            console.log('[Collaboration] Initializing connection with config:', {
                baseUrl: cleanBaseUrl,
                documentId: providerConfig.name,
                willConnectTo: `${cleanBaseUrl}/${providerConfig.name}`,
                hasToken: !!providerConfig.token,
                saveMode: collabConfig.value.saveMode,
                userName: collabConfig.value.userName,
            });

            // Créer le provider Hocuspocus
            provider.value = new HocuspocusProvider(providerConfig);

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
    const destroyCollaboration = collaborationStatus => {
        if (provider.value) {
            provider.value.destroy();
            provider.value = null;
        }

        if (ydocInstance) {
            ydocInstance.destroy();
            ydocInstance = null;
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

    const attemptConnection = collaborationStatus => {
        console.log('[Collaboration] Manually attempting connection (resetting retry counter)');
        // Réinitialiser le compteur de tentatives
        connectionAttempts.value = 0;
        // Réinitialiser et reconnecter
        initializeCollaboration(collaborationStatus);
    };

    const forceSync = () => {
        if (provider.value && provider.value.isConnected) {
            provider.value.forceSync();
        }
    };

    const getConnectionStatus = collaborationStatus => {
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
        console.log('[Collaboration] getCollaborationExtensions called:', {
            isCollaborating: isCollaborating.value,
            hasYdoc: !!ydocInstance,
            hasProvider: !!provider.value,
            ydocInstance: ydocInstance,
        });

        if (!isCollaborating.value || !ydocInstance) {
            console.log('[Collaboration] ⚠️ Cannot load extensions: isCollaborating=' + isCollaborating.value + ', hasYdoc=' + !!ydocInstance);
            return [];
        }

        if (!provider.value) {
            console.warn('[Collaboration] ⚠️ Provider is null, CollaborationCursor may not work');
        }

        // IMPORTANT: Créer une référence stable pour éviter les problèmes de timing
        const doc = ydocInstance;
        const prov = provider.value;

        if (!doc) {
            console.error('[Collaboration] ❌ ydocInstance is null when creating extensions!');
            return [];
        }

        // Tester d'abord uniquement avec Collaboration pour isoler le problème
        const extensions = [
            Collaboration.configure({
                document: doc,
                field: 'default',
            }),
        ];

        // Ajouter CollaborationCursor seulement si le provider est prêt
        // Note: Désactivé temporairement pour debug
        if (prov) {
            extensions.push(
                CollaborationCursor.configure({
                    provider: prov,
                    user: {
                        name: collabConfig.value.userName || 'Anonymous',
                        color: getRandomColor(),
                    },
                })
            );
        }

        console.log('[Collaboration] ✅ Extensions configured:', {
            extensionsCount: extensions.length,
            userName: collabConfig.value.userName,
            hasProviderAwareness: !!provider.value?.awareness,
            ydocPassedToCollaboration: !!ydocInstance,
        });

        return extensions;
    };

    // Mettre à jour le nom d'utilisateur dans awareness
    const updateUserName = newName => {
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
        if (ydocInstance) {
            ydocInstance.destroy();
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
        attemptConnection,
        forceSync,
        getConnectionStatus,
        getCollaborationExtensions,
        updateUserName,
        getRandomColor,
    };
}
