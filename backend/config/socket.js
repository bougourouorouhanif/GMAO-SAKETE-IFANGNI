// backend/config/socket.js - Configuration Socket.IO pour GMAO Sakété

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io = null;
let connectedClients = new Map(); // Map pour stocker les clients connectés

// ============================================
// AUTHENTIFICATION PAR TOKEN
// ============================================

/**
 * Vérifier le token JWT pour l'authentification Socket.IO
 * @param {string} token - Token JWT
 * @returns {Object|null} Utilisateur décodé ou null
 */
const authenticateSocket = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gmao-secret-key');
        return decoded;
    } catch (error) {
        console.error('❌ Erreur authentification socket:', error.message);
        return null;
    }
};

// ============================================
// INITIALISATION DU SERVEUR SOCKET
// ============================================

/**
 * Initialiser le serveur Socket.IO
 * @param {Object} server - Serveur HTTP
 * @param {Object} options - Options supplémentaires
 * @returns {Object} Instance Socket.IO
 */
export const initSocket = (server, options = {}) => {
    const defaultOptions = {
        cors: {
            origin: process.env.FRONTEND_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    };

    io = new Server(server, { ...defaultOptions, ...options });

    // Middleware d'authentification
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            // Mode invité (lecture seule)
            socket.isGuest = true;
            return next();
        }

        const user = authenticateSocket(token);
        if (!user) {
            return next(new Error('Authentication error'));
        }

        socket.user = user;
        socket.userId = user.id;
        socket.userRole = user.role;
        next();
    });

    io.on('connection', (socket) => {
        const userId = socket.userId || 'guest';
        const userRole = socket.userRole || 'guest';
        
        console.log(`🟢 Client connecté: ${socket.id} (Utilisateur: ${userId}, Rôle: ${userRole})`);
        
        // Stocker le client
        connectedClients.set(socket.id, {
            id: socket.id,
            userId,
            userRole,
            connectedAt: new Date()
        });

        // Rejoindre la room personnelle
        if (userId !== 'guest') {
            socket.join(`user_${userId}`);
            socket.join(`role_${userRole}`);
            console.log(`📱 Utilisateur ${userId} a rejoint les rooms: user_${userId}, role_${userRole}`);
        }

        // ============================================
        // ÉCOUTEURS D'ÉVÉNEMENTS
        // ============================================

        // Rejoindre une room spécifique
        socket.on('join-room', (roomName) => {
            if (roomName) {
                socket.join(roomName);
                console.log(`📢 Socket ${socket.id} a rejoint la room: ${roomName}`);
                socket.emit('room-joined', { room: roomName });
            }
        });

        // Quitter une room
        socket.on('leave-room', (roomName) => {
            if (roomName) {
                socket.leave(roomName);
                console.log(`📢 Socket ${socket.id} a quitté la room: ${roomName}`);
            }
        });

        // Événement pour les interventions
        socket.on('intervention:start', (data) => {
            console.log(`🔧 Intervention commencée par ${userId}:`, data);
            socket.to('role_TECHNICIEN').emit('intervention:updated', {
                ...data,
                action: 'started',
                startedBy: userId
            });
        });

        socket.on('intervention:complete', (data) => {
            console.log(`✅ Intervention terminée par ${userId}:`, data);
            if (data.soignantId) {
                io.to(`user_${data.soignantId}`).emit('intervention:completed', data);
            }
            io.to('role_TECHNICIEN').emit('intervention:updated', {
                ...data,
                action: 'completed'
            });
        });

        // Événement pour les signalements
        socket.on('signalement:new', (data) => {
            console.log(`🚨 Nouveau signalement de ${userId}:`, data);
            io.to('role_TECHNICIEN').emit('signalement:received', data);
        });

        // Événement pour les alertes
        socket.on('alert:new', (data) => {
            console.log(`⚠️ Nouvelle alerte:`, data);
            
            if (data.criticite === 'CRITIQUE') {
                io.to('role_TECHNICIEN').emit('alert:critical', data);
            } else {
                io.to('role_TECHNICIEN').emit('alert:new', data);
            }
        });

        // Événement pour le stock
        socket.on('stock:low', (data) => {
            console.log(`⚠️ Stock faible:`, data);
            io.to('role_TECHNICIEN').emit('stock:alert', data);
        });

        // Message privé à un utilisateur
        socket.on('message:private', ({ toUserId, message, type = 'text' }) => {
            console.log(`💬 Message privé de ${userId} à ${toUserId}`);
            io.to(`user_${toUserId}`).emit('message:received', {
                from: userId,
                message,
                type,
                timestamp: new Date()
            });
        });

        // Message à une room
        socket.on('message:room', ({ room, message }) => {
            console.log(`💬 Message dans la room ${room} de ${userId}`);
            socket.to(room).emit('message:room', {
                from: userId,
                message,
                timestamp: new Date()
            });
        });

        // Typing indicator
        socket.on('typing:start', ({ toUserId }) => {
            if (toUserId) {
                io.to(`user_${toUserId}`).emit('typing:start', { from: userId });
            }
        });

        socket.on('typing:stop', ({ toUserId }) => {
            if (toUserId) {
                io.to(`user_${toUserId}`).emit('typing:stop', { from: userId });
            }
        });

        // Ping pour mesurer la latence
        socket.on('ping', (callback) => {
            const start = Date.now();
            if (typeof callback === 'function') {
                callback({ latency: Date.now() - start });
            } else {
                socket.emit('pong', { latency: Date.now() - start });
            }
        });

        // Déconnexion
        socket.on('disconnect', (reason) => {
            console.log(`🔴 Client déconnecté: ${socket.id} (Raison: ${reason})`);
            connectedClients.delete(socket.id);
        });

        // Erreur
        socket.on('error', (error) => {
            console.error(`❌ Erreur socket ${socket.id}:`, error);
        });
    });

    console.log('✅ Serveur Socket.IO initialisé');
    return io;
};

// ============================================
// FONCTIONS D'ENVOI DE NOTIFICATIONS
// ============================================

/**
 * Envoyer une notification à un utilisateur spécifique
 * @param {number|string} userId - ID de l'utilisateur
 * @param {Object} data - Données de la notification
 * @returns {boolean} true si envoyé
 */
export const sendNotification = (userId, data) => {
    if (!io) {
        console.warn('⚠️ Socket.IO non initialisé');
        return false;
    }

    const room = `user_${userId}`;
    const notificationData = {
        ...data,
        timestamp: new Date(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    io.to(room).emit('notification', notificationData);
    console.log(`📨 Notification envoyée à l'utilisateur ${userId}`);
    return true;
};

/**
 * Envoyer une notification à tous les utilisateurs d'un rôle
 * @param {string} role - Rôle (TECHNICIEN, SOIGNANT)
 * @param {Object} data - Données de la notification
 * @returns {boolean} true si envoyé
 */
export const sendNotificationToRole = (role, data) => {
    if (!io) {
        console.warn('⚠️ Socket.IO non initialisé');
        return false;
    }

    const room = `role_${role}`;
    const notificationData = {
        ...data,
        timestamp: new Date(),
        role: role,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    io.to(room).emit('notification', notificationData);
    console.log(`📨 Notification envoyée au rôle ${role}`);
    return true;
};

/**
 * Envoyer une notification à tous les utilisateurs
 * @param {Object} data - Données de la notification
 * @returns {boolean} true si envoyé
 */
export const sendBroadcast = (data) => {
    if (!io) {
        console.warn('⚠️ Socket.IO non initialisé');
        return false;
    }

    const broadcastData = {
        ...data,
        timestamp: new Date(),
        broadcast: true
    };

    io.emit('broadcast', broadcastData);
    console.log('📢 Broadcast envoyé à tous les clients');
    return true;
};

// ============================================
// NOTIFICATIONS SPÉCIFIQUES
// ============================================

/**
 * Notification de nouvelle intervention
 * @param {Object} intervention - Intervention créée
 * @param {Array} techniciens - Liste des techniciens
 */
export const notifyNewIntervention = (intervention, techniciens) => {
    const notificationData = {
        type: 'NEW_INTERVENTION',
        title: '🚨 Nouvelle intervention',
        body: `${intervention.equipement?.nom} - ${intervention.signalement?.priorite || 'Panne'}`,
        data: intervention,
        action: 'view_intervention',
        actionId: intervention.id
    };

    sendNotificationToRole('TECHNICIEN', notificationData);
};

/**
 * Notification d'intervention terminée
 * @param {Object} intervention - Intervention terminée
 * @param {Object} soignant - Soignant concerné
 */
export const notifyInterventionCompleted = (intervention, soignant) => {
    const notificationData = {
        type: 'INTERVENTION_COMPLETED',
        title: '✅ Panne résolue',
        body: `L'équipement ${intervention.equipement?.nom} est à nouveau fonctionnel`,
        data: intervention,
        action: 'view_historique'
    };

    sendNotification(soignant.id, notificationData);
};

/**
 * Notification de nouvelle alerte
 * @param {Object} alerte - Alerte créée
 */
export const notifyNewAlert = (alerte) => {
    const notificationData = {
        type: 'NEW_ALERT',
        title: alerte.niveau === 'CRITIQUE' ? '🔴 Alerte critique' : '⚠️ Nouvelle alerte',
        body: alerte.message,
        data: alerte,
        action: 'view_alert',
        actionId: alerte.id
    };

    sendNotificationToRole('TECHNICIEN', notificationData);
};

/**
 * Notification de stock faible
 * @param {Object} piece - Pièce en stock faible
 */
export const notifyLowStock = (piece) => {
    const notificationData = {
        type: 'LOW_STOCK',
        title: '⚠️ Stock faible',
        body: `La pièce ${piece.designation} n'a plus que ${piece.quantiteStock} unités`,
        data: piece,
        action: 'view_stock'
    };

    sendNotificationToRole('TECHNICIEN', notificationData);
};

// ============================================
// UTILITAIRES
// ============================================

/**
 * Obtenir le nombre de clients connectés
 * @returns {number} Nombre de clients
 */
export const getConnectedClientsCount = () => {
    return connectedClients.size;
};

/**
 * Obtenir la liste des clients connectés
 * @returns {Array} Liste des clients
 */
export const getConnectedClients = () => {
    return Array.from(connectedClients.values());
};

/**
 * Vérifier si un utilisateur est connecté
 * @param {number|string} userId - ID de l'utilisateur
 * @returns {boolean} true si connecté
 */
export const isUserOnline = (userId) => {
    for (const client of connectedClients.values()) {
        if (client.userId === userId) {
            return true;
        }
    }
    return false;
};

/**
 * Déconnecter un utilisateur
 * @param {string} socketId - ID du socket
 */
export const disconnectClient = (socketId) => {
    const socket = io?.sockets?.sockets?.get(socketId);
    if (socket) {
        socket.disconnect();
        console.log(`🔌 Client ${socketId} déconnecté manuellement`);
    }
};

/**
 * Arrêter le serveur Socket.IO
 */
export const closeSocket = async () => {
    if (io) {
        await io.close();
        io = null;
        connectedClients.clear();
        console.log('🔌 Serveur Socket.IO fermé');
    }
};

// ============================================
// EXPORTATION
// ============================================

export default {
    initSocket,
    sendNotification,
    sendNotificationToRole,
    sendBroadcast,
    notifyNewIntervention,
    notifyInterventionCompleted,
    notifyNewAlert,
    notifyLowStock,
    getConnectedClientsCount,
    getConnectedClients,
    isUserOnline,
    disconnectClient,
    closeSocket
};
