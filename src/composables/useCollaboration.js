import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { YChangeMark, YChangeNodeAttrs } from '../extensions/YChange.js';

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

    // Versionnage : attribution par utilisateur (Y.PermanentUserData) et
    // époque courante du document (compaction côté serveur)
    let permanentUserDataInstance = null;
    let currentEpoch = null;

    // État local du statut de collaboration (pour éviter les problèmes de closure)
    let currentStatus = {
        connected: false,
        synced: false,
        syncing: false,
        saving: false,
        saved: false,
        error: null,
        connectionId: null,
        users: [],
        userCount: 0,
        epoch: null,
        staleEpoch: false,
    };

    // Helper pour mettre à jour le statut
    const updateStatus = updates => {
        currentStatus = { ...currentStatus, ...updates };
        setCollaborationStatus(currentStatus);
    };

    // Mémorise l'époque courante et la propage aux paramètres de reconnexion :
    // si le serveur compacte le document pendant une coupure, la reconnexion
    // avec une époque périmée sera rejetée (stale-epoch) au lieu de fusionner
    // un état local obsolète (ce qui dupliquerait tout le contenu)
    const setEpoch = epoch => {
        currentEpoch = epoch;
        const wsParams = provider.value?.configuration?.websocketProvider?.configuration?.parameters;
        if (wsParams) wsParams.epoch = epoch;
        updateStatus({ epoch });
    };

    // Configuration de collaboration
    const collabConfig = computed(() => ({
        enabled: content.value.enableCollaboration || false,
        websocketUrl: content.value.websocketUrl || '',
        documentId: content.value.documentId || '',
        authToken: content.value.authToken || '',
        userName: content.value.userName || 'Anonymous',
        userId: content.value.userId || '',
        versionDiffColorMode: content.value.versionDiffColorMode || 'default',
        autoConnect: content.value.autoConnect ?? true,
        saveMode: content.value.saveMode || 'manual',
        saveDebounce: content.value.saveDebounce ?? 2000,
        maxConnectionAttempts: content.value.maxConnectionAttempts || 5,
    }));

    // Vérification si la collaboration doit être activée
    const shouldEnableCollaboration = computed(() => {
        return collabConfig.value.enabled && collabConfig.value.documentId && collabConfig.value.websocketUrl;
    });

    // Palette de couleurs utilisateurs (couleurs foncées et saturées)
    const USER_COLORS = [
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

    const getRandomColor = () => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

    // Clé d'identité de l'utilisateur local (stable) : id, fallback nom
    const localUserKey = () => collabConfig.value.userId || collabConfig.value.userName || 'Anonymous';

    // Couleur déterministe par utilisateur : même id → même couleur,
    // partout (curseurs, liste users, diffs de version) et à chaque session
    const colorForUser = key => {
        const str = String(key || 'anonymous');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) | 0;
        }
        return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
    };

    // Mapping utilisateur → couleur pour les diffs de version (ySync).
    // Clé = la même que PermanentUserData (userId, fallback userName),
    // alimenté pour soi à l'init et pour les autres via l'awareness.
    const ychangeColorMapping = new Map();
    const registerUserColor = key => {
        if (!key) return;
        const dark = colorForUser(key);
        ychangeColorMapping.set(String(key), { light: `${dark}26`, dark });
    };

    // Configuration des event listeners du provider
    const setupCollaborationListeners = () => {
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

            updateStatus({
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
            updateStatus({
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

            updateStatus({
                synced: true,
                syncing: false,
            });

            // Demander l'époque courante au serveur (versionnage/compaction)
            try {
                provider.value.sendStateless(JSON.stringify({ action: 'get-epoch' }));
            } catch (e) {
                console.warn('[Collaboration] Failed to request epoch:', e);
            }

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
                updateStatus({
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

            updateStatus({
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

                // On récupère tout l'objet user pour être sûr d'avoir 'name' ET 'color'
                const users = states
                    .filter(state => state.user)
                    .map(state => ({
                        name: state.user.name,
                        color: state.user.color, // <-- On s'assure que c'est bien mappé ici
                        id: state.user.id || null,
                    }));

                // Alimenter le mapping de couleurs des diffs de version
                // avec les utilisateurs présents (même clé que PermanentUserData)
                users.forEach(user => registerUserColor(user.id || user.name));

                console.log('[Collaboration] Awareness update - Users with colors:', users);

                updateStatus({
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

        // Écouter les messages stateless du serveur (save-state)
        provider.value.on('stateless', ({ payload }) => {
            try {
                const data = JSON.parse(payload);
                if (data.action === 'save-state') {
                    // Le serveur DOIT renvoyer le saveId pour permettre le tracking
                    const saveId = data.saveId || null;

                    if (data.state === 'saving') {
                        updateStatus({ saving: true, saved: false });
                        emit('trigger-event', {
                            name: 'collab:saving',
                            event: {
                                timestamp: new Date().toISOString(),
                                saveId,
                            },
                        });
                    } else if (data.state === 'saved') {
                        updateStatus({ saving: false, saved: true });
                        emit('trigger-event', {
                            name: 'collab:saved',
                            event: {
                                timestamp: new Date().toISOString(),
                                saveId,
                            },
                        });
                    } else if (data.state === 'error') {
                        updateStatus({ saving: false, saved: false, error: data.message });
                        emit('trigger-event', {
                            name: 'collab:error',
                            event: {
                                error: 'save-error',
                                message: data.message,
                                timestamp: new Date().toISOString(),
                                saveId,
                            },
                        });
                    }
                } else if (data.action === 'epoch') {
                    setEpoch(data.epoch);
                } else if (data.action === 'version-created') {
                    emit('trigger-event', {
                        name: 'collab:version-created',
                        event: {
                            created: !!data.created,
                            versionNumber: data.versionNumber ?? null,
                            label: data.label ?? null,
                            error: data.error ?? null,
                            timestamp: new Date().toISOString(),
                        },
                    });
                } else if (data.action === 'content-replaced') {
                    emit('trigger-event', {
                        name: 'collab:content-replaced',
                        event: {
                            documentName: data.documentName ?? null,
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (e) {
                console.warn('[Collaboration] Failed to parse stateless message:', e);
            }
        });

        // Rejet d'authentification — cas particulier : époque périmée.
        // L'état Yjs local appartient à une époque compactée côté serveur,
        // il faut repartir d'un document vierge (via le watcher staleEpoch
        // du composant, qui ré-initialise la collaboration ET l'éditeur).
        provider.value.on('authenticationFailed', ({ reason }) => {
            const message = typeof reason === 'string' ? reason : reason?.message || '';
            if (message.includes('stale-epoch')) {
                console.warn('[Collaboration] Stale epoch detected, local state must be reset:', message);
                emit('trigger-event', {
                    name: 'collab:stale-epoch',
                    event: {
                        documentId: collabConfig.value.documentId,
                        epoch: currentEpoch,
                        timestamp: new Date().toISOString(),
                    },
                });
                currentEpoch = null;
                updateStatus({ staleEpoch: true, error: 'stale-epoch' });
            } else {
                updateStatus({ error: message || 'authentication failed' });
                emit('trigger-event', {
                    name: 'collab:error',
                    event: {
                        error: 'authentication-failed',
                        message,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        });
    };

    // Initialisation de la collaboration
    const initializeCollaboration = () => {
        // Nettoyer si déjà existant
        destroyCollaboration();

        if (!shouldEnableCollaboration.value) {
            return;
        }

        try {
            // Créer le document Yjs et le stocker directement.
            // gc: false — conserve l'historique localement, indispensable pour
            // rendre les snapshots de versions dans l'éditeur (compare mode)
            ydocInstance = new Y.Doc({ gc: false });

            // Attribution durable par utilisateur (qui a écrit quoi) pour la
            // comparaison de versions — stockée dans le document lui-même.
            // Clé = userId (stable face aux renommages et homonymes),
            // fallback userName ; la résolution id → nom se fait côté UI.
            permanentUserDataInstance = new Y.PermanentUserData(ydocInstance);
            permanentUserDataInstance.setUserMapping(
                ydocInstance,
                ydocInstance.clientID,
                localUserKey()
            );
            registerUserColor(localUserKey());

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
                // Ping toutes les 30s pour éviter les coupures par proxies/firewalls
                keepAlive: 30000,
                // Ajoute ?saveMode=...&userName=...&saveDebounce=... à l'URL WebSocket
                parameters: {
                    saveMode: collabConfig.value.saveMode,
                    saveDebounce: collabConfig.value.saveDebounce,
                    userName: collabConfig.value.userName,
                },
                // Garde onAuthenticate pour la logique de token
                onAuthenticate: () => ({
                    token: collabConfig.value.authToken,
                }),
            };

            console.log('[Collaboration] Initializing connection with config:', {
                baseUrl: cleanBaseUrl,
                documentId: providerConfig.name,
                willConnectTo: `${cleanBaseUrl}/${providerConfig.name}`,
                hasToken: !!providerConfig.token,
                saveMode: collabConfig.value.saveMode,
                saveDebounce: collabConfig.value.saveDebounce,
                userName: collabConfig.value.userName,
            });

            // Créer le provider Hocuspocus
            provider.value = new HocuspocusProvider(providerConfig);

            // Configurer les event listeners
            setupCollaborationListeners();

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
    const destroyCollaboration = () => {
        if (provider.value) {
            provider.value.destroy();
            provider.value = null;
        }

        if (ydocInstance) {
            ydocInstance.destroy();
            ydocInstance = null;
        }

        permanentUserDataInstance = null;
        currentEpoch = null;
        isCollaborating.value = false;
        connectionAttempts.value = 0;

        // Réinitialiser l'état local et le statut externe
        currentStatus = {
            connected: false,
            synced: false,
            syncing: false,
            saving: false,
            saved: false,
            error: null,
            connectionId: null,
            users: [],
            userCount: 0,
            epoch: null,
            staleEpoch: false,
        };
        setCollaborationStatus(currentStatus);
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

    const attemptConnection = () => {
        console.log('[Collaboration] Manually attempting connection (resetting retry counter)');
        // Réinitialiser le compteur de tentatives
        connectionAttempts.value = 0;
        // Réinitialiser et reconnecter
        initializeCollaboration();
    };

    const forceSync = () => {
        if (provider.value && provider.value.isConnected) {
            provider.value.forceSync();
        }
    };

    const getConnectionStatus = () => {
        return {
            connected: provider.value?.isConnected || false,
            synced: provider.value?.isSynced || false,
            documentId: collabConfig.value.documentId,
            users: currentStatus.users || [],
            userCount: currentStatus.userCount || 0,
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
            console.log(
                '[Collaboration] ⚠️ Cannot load extensions: isCollaborating=' +
                    isCollaborating.value +
                    ', hasYdoc=' +
                    !!ydocInstance
            );
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

        // Palette d'attribution pour la comparaison de versions : mêmes
        // couleurs que les curseurs, mapping déterministe par utilisateur
        // (ychangeColorMapping), fallback sur la palette pour les inconnus
        const ychangeColors = USER_COLORS.map(dark => ({ light: `${dark}26`, dark }));

        // Résolution id → nom pour l'infobulle des diffs de versions,
        // via la propriété bindable versionDiffAuthors ({ userId: name }).
        // Lue au moment du rendu : la table peut arriver après le chargement.
        const resolveAuthor = user => {
            const authors = content.value.versionDiffAuthors;
            if (authors && typeof authors === 'object' && authors[user]) {
                return authors[user];
            }
            return user;
        };
        const ychangeOptions = {
            colorMode: collabConfig.value.versionDiffColorMode,
            resolveAuthor,
        };

        const extensions = [
            Collaboration.configure({
                document: doc,
                field: 'default',
                ySyncOptions: {
                    permanentUserData: permanentUserDataInstance,
                    colors: ychangeColors,
                    colorMapping: ychangeColorMapping,
                },
            }),
            // Schéma + rendu des annotations de versions (snapshot compare)
            YChangeMark.configure(ychangeOptions),
            YChangeNodeAttrs.configure(ychangeOptions),
        ];

        // Ajouter CollaborationCursor
        if (prov) {
            extensions.push(
                CollaborationCursor.configure({
                    provider: prov,
                    user: {
                        name: collabConfig.value.userName || 'Anonymous',
                        color: colorForUser(localUserKey()),
                        id: collabConfig.value.userId || null,
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
    // (couleur inchangée : elle dépend de l'id, pas du nom affiché)
    const updateUserName = newName => {
        if (provider.value?.awareness) {
            provider.value.awareness.setLocalStateField('user', {
                name: newName,
                color: colorForUser(collabConfig.value.userId || newName),
                id: collabConfig.value.userId || null,
            });
        }
    };

    // Envoyer un signal de sauvegarde au serveur via stateless message
    // IMPORTANT: Le serveur DOIT renvoyer le saveId dans sa réponse stateless
    // pour permettre le tracking de sauvegardes multiples simultanées
    const sendSaveSignal = (force = false, saveId = null) => {
        if (provider.value && provider.value.isConnected) {
            updateStatus({ saving: true, saved: false });
            provider.value.sendStateless(
                JSON.stringify({
                    action: 'save-document',
                    payload: { force, saveId },
                })
            );
            console.log('[Collaboration] Save signal sent to server', { force, saveId });
            return true;
        }
        console.warn('[Collaboration] Cannot send save signal: provider not connected');
        return false;
    };

    // Demander au serveur de créer une version nommée du document
    // Réponse : message stateless { action: "version-created", ... }
    const sendCreateVersionSignal = (label = null) => {
        if (provider.value && provider.value.isConnected) {
            provider.value.sendStateless(
                JSON.stringify({
                    action: 'create-version',
                    payload: { label },
                })
            );
            console.log('[Collaboration] Create-version signal sent', { label });
            return true;
        }
        console.warn('[Collaboration] Cannot send create-version signal: provider not connected');
        return false;
    };

    const getEpoch = () => currentEpoch;
    const getPermanentUserData = () => permanentUserDataInstance;

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
        colorForUser,
        sendSaveSignal,
        sendCreateVersionSignal,
        getEpoch,
        getPermanentUserData,
    };
}
