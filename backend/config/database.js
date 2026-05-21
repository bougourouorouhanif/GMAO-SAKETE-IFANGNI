// config/prisma.js - Configuration Prisma pour GMAO Sakété

import { PrismaClient } from '@prisma/client';

// ============================================
// CONFIGURATION PRISMA
// ============================================

// Options de logging selon l'environnement
const getLogOptions = () => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
        case 'development':
            return ['query', 'info', 'warn', 'error'];
        case 'test':
            return ['error'];
        case 'production':
            return ['error', 'warn'];
        default:
            return ['error'];
    }
};

// Création du client Prisma
const prisma = new PrismaClient({
    log: getLogOptions(),
    errorFormat: process.env.NODE_ENV === 'development' ? 'pretty' : 'minimal'
});

// ============================================
# GESTION DES CONNEXIONS
============================================

// Variable pour suivre l'état de la connexion
let isConnected = false;

/**
 * Vérifier et établir la connexion à la base de données
 * @returns {Promise<boolean>} true si connecté
 */
export const connectDB = async () => {
    if (isConnected) {
        console.log('📊 Base de données déjà connectée');
        return true;
    }

    try {
        await prisma.$connect();
        isConnected = true;
        console.log('✅ Base de données connectée avec succès');
        return true;
    } catch (error) {
        console.error('❌ Erreur de connexion à la base de données:', error.message);
        return false;
    }
};

/**
 * Déconnecter la base de données (utilisé pour les tests)
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
    if (!isConnected) return;

    try {
        await prisma.$disconnect();
        isConnected = false;
        console.log('🔌 Base de données déconnectée');
    } catch (error) {
        console.error('❌ Erreur lors de la déconnexion:', error.message);
    }
};

/**
 * Vérifier l'état de la connexion
 * @returns {boolean} true si connecté
 */
export const isDatabaseConnected = () => isConnected;

/**
 * Tester la connexion à la base de données
 * @returns {Promise<Object>} Résultat du test
 */
export const testConnection = async () => {
    try {
        // Exécuter une requête simple pour tester
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        return {
            success: true,
            message: 'Connexion à la base de données établie',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// ============================================
# MIDDLEWARE POUR EXPRESS
============================================

/**
 * Middleware pour s'assurer que la base de données est connectée
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
export const ensureDatabaseConnection = async (req, res, next) => {
    if (!isConnected) {
        const connected = await connectDB();
        if (!connected) {
            return res.status(503).json({
                success: false,
                error: 'Service de base de données temporairement indisponible'
            });
        }
    }
    next();
};

// ============================================
# TRANSACTIONS
============================================

/**
 * Exécuter une transaction
 * @param {Function} callback - Fonction de transaction
 * @returns {Promise<any>} Résultat de la transaction
 */
export const runTransaction = async (callback) => {
    try {
        return await prisma.$transaction(async (tx) => {
            return await callback(tx);
        });
    } catch (error) {
        console.error('Erreur de transaction:', error);
        throw error;
    }
};

// ============================================
# HEALTH CHECK
============================================

/**
 * Obtenir les métriques de santé de la base de données
 * @returns {Promise<Object>} Métriques
 */
export const getDatabaseHealth = async () => {
    try {
        const startTime = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        return {
            status: 'healthy',
            connected: isConnected,
            latency: `${latency}ms`,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// ============================================
# HELPERS DE REQUÊTES
============================================

/**
 * Helper pour les requêtes paginées
 * @param {Object} model - Modèle Prisma
 * @param {Object} options - Options de pagination
 * @returns {Promise<Object>} Résultat paginé
 */
export const paginate = async (model, options = {}) => {
    const {
        page = 1,
        limit = 10,
        where = {},
        orderBy = { id: 'desc' },
        include = {},
        select = null
    } = options;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
        model.findMany({
            where,
            skip,
            take,
            orderBy,
            include,
            ...(select && { select })
        }),
        model.count({ where })
    ]);

    return {
        data,
        pagination: {
            page: parseInt(page),
            limit: take,
            total,
            totalPages: Math.ceil(total / take),
            hasNext: page * take < total,
            hasPrev: page > 1
        }
    };
};

/**
 * Helper pour vérifier l'existence d'un enregistrement
 * @param {Object} model - Modèle Prisma
 * @param {Object} where - Condition de recherche
 * @param {string} errorMessage - Message d'erreur personnalisé
 * @returns {Promise<Object>} L'enregistrement trouvé
 * @throws {Error} Si non trouvé
 */
export const findOrFail = async (model, where, errorMessage = 'Ressource non trouvée') => {
    const record = await model.findUnique({ where });
    if (!record) {
        const error = new Error(errorMessage);
        error.status = 404;
        throw error;
    }
    return record;
};

/**
 * Helper pour créer ou mettre à jour (upsert)
 * @param {Object} model - Modèle Prisma
 * @param {Object} where - Condition de recherche
 * @param {Object} createData - Données pour la création
 * @param {Object} updateData - Données pour la mise à jour
 * @returns {Promise<Object>} Résultat de l'opération
 */
export const upsertRecord = async (model, where, createData, updateData) => {
    return model.upsert({
        where,
        create: createData,
        update: updateData
    });
};

/**
 * Helper pour les soft delete (si le modèle a un champ deletedAt)
 * @param {Object} model - Modèle Prisma
 * @param {number} id - ID de l'enregistrement
 * @returns {Promise<Object>} Résultat du soft delete
 */
export const softDelete = async (model, id) => {
    // Vérifier si le modèle a un champ deletedAt
    const hasDeletedAt = await model.findFirst({
        where: { id },
        select: { deletedAt: true }
    }).catch(() => false);

    if (hasDeletedAt !== false) {
        return model.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
    }
    
    // Si pas de deletedAt, faire un delete normal
    return model.delete({ where: { id } });
};

// ============================================
# INITIALISATION
============================================

// Connecter automatiquement au démarrage (non bloquant)
if (process.env.NODE_ENV !== 'test') {
    connectDB().catch(console.error);
}

// Gestion de la fermeture propre
process.on('beforeExit', async () => {
    await disconnectDB();
});

process.on('SIGINT', async () => {
    await disconnectDB();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await disconnectDB();
    process.exit(0);
});

// ============================================
# EXPORTATION
============================================

export default prisma;
