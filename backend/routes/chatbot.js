// routes/chatbotRoutes.js - Routes pour le chatbot GMAO Sakété

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
    chatbotDiagnostic, 
    chatbotCreerIntervention 
} from '../controllers/chatbotDiagnosticController.js';
import { 
    chatbotSignalement, 
    chatbotCreerSignalement 
} from '../controllers/chatbotSignalementController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien, isSoignant } from '../middleware/roleCheck.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// ============================================
// CONFIGURATION RATE LIMITING
// ============================================

// Limite générale pour le chatbot (20 requêtes par minute)
const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    message: {
        success: false,
        error: 'Trop de requêtes, veuillez patienter quelques secondes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limite plus stricte pour la création (10 requêtes par minute)
const createLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Trop de tentatives de création, veuillez patienter'
    }
});

// ============================================
// VALIDATION DES REQUÊTES
// ============================================

// Validation pour le diagnostic
const validateDiagnostic = [
    body('message')
        .notEmpty().withMessage('Le message est requis')
        .isString().withMessage('Le message doit être une chaîne de caractères')
        .trim()
        .isLength({ min: 2, max: 500 }).withMessage('Le message doit contenir entre 2 et 500 caractères'),
    body('equipmentId')
        .optional()
        .isInt({ min: 1 }).withMessage('L\'ID de l\'équipement doit être un nombre valide')
        .toInt(),
    body('conversationId')
        .optional()
        .isString().withMessage('L\'ID de conversation doit être une chaîne')
        .trim()
];

// Validation pour la création d'intervention
const validateIntervention = [
    body('equipmentId')
        .notEmpty().withMessage('L\'ID de l\'équipement est requis')
        .isInt({ min: 1 }).withMessage('L\'ID de l\'équipement doit être un nombre valide')
        .toInt(),
    body('diagnostic')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 1000 }).withMessage('Le diagnostic ne doit pas dépasser 1000 caractères'),
    body('pieceSuggestion')
        .optional()
        .isString()
        .trim(),
    body('pieceId')
        .optional()
        .isInt({ min: 1 }).withMessage('L\'ID de la pièce doit être un nombre valide')
        .toInt(),
    body('conversationId')
        .optional()
        .isString()
        .trim()
];

// Validation pour le signalement soignant
const validateSignalement = [
    body('message')
        .notEmpty().withMessage('Le message est requis')
        .isString().withMessage('Le message doit être une chaîne de caractères')
        .trim()
        .isLength({ min: 2, max: 500 }).withMessage('Le message doit contenir entre 2 et 500 caractères'),
    body('equipmentId')
        .optional()
        .isInt({ min: 1 }).withMessage('L\'ID de l\'équipement doit être un nombre valide')
        .toInt(),
    body('conversationId')
        .optional()
        .isString()
        .trim()
];

// Validation pour la création de signalement
const validateCreateSignalement = [
    body('equipmentId')
        .notEmpty().withMessage('L\'ID de l\'équipement est requis')
        .isInt({ min: 1 }).withMessage('L\'ID de l\'équipement doit être un nombre valide')
        .toInt(),
    body('description')
        .notEmpty().withMessage('La description est requise')
        .isString().withMessage('La description doit être une chaîne de caractères')
        .trim()
        .isLength({ min: 5, max: 1000 }).withMessage('La description doit contenir entre 5 et 1000 caractères'),
    body('priorite')
        .optional()
        .isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide')
        .default('MOYENNE'),
    body('conversationId')
        .optional()
        .isString()
        .trim()
];

// Middleware de validation des erreurs
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Données invalides',
            details: errors.array().map(e => ({
                field: e.param,
                message: e.msg
            }))
        });
    }
    next();
};

// ============================================
# ROUTES
============================================

/**
 * @route   POST /api/chatbot/diagnostic
 * @desc    Diagnostic expert pour technicien
 * @access  Technicien
 * @body    { message, equipmentId?, conversationId? }
 */
router.post(
    '/diagnostic',
    chatbotLimiter,
    verifyToken,
    isTechnicien,
    validateDiagnostic,
    handleValidationErrors,
    chatbotDiagnostic
);

/**
 * @route   POST /api/chatbot/intervention
 * @desc    Créer une intervention depuis le diagnostic
 * @access  Technicien
 * @body    { equipmentId, diagnostic?, pieceSuggestion?, pieceId?, conversationId? }
 */
router.post(
    '/intervention',
    createLimiter,
    verifyToken,
    isTechnicien,
    validateIntervention,
    handleValidationErrors,
    chatbotCreerIntervention
);

/**
 * @route   POST /api/chatbot/signalement
 * @desc    Assistant signalement pour soignant
 * @access  Soignant
 * @body    { message, equipmentId?, conversationId? }
 */
router.post(
    '/signalement',
    chatbotLimiter,
    verifyToken,
    isSoignant,
    validateSignalement,
    handleValidationErrors,
    chatbotSignalement
);

/**
 * @route   POST /api/chatbot/signaler
 * @desc    Créer un signalement depuis le chatbot
 * @access  Soignant
 * @body    { equipmentId, description, priorite?, conversationId? }
 */
router.post(
    '/signaler',
    createLimiter,
    verifyToken,
    isSoignant,
    validateCreateSignalement,
    handleValidationErrors,
    chatbotCreerSignalement
);

// ============================================
# ROUTES OPTIONNELLES (Statistiques, etc.)
============================================

/**
 * @route   GET /api/chatbot/conversation/:conversationId
 * @desc    Récupérer l'historique d'une conversation
 * @access  Technicien ou Soignant
 * @param   conversationId - ID de la conversation
 */
router.get(
    '/conversation/:conversationId',
    verifyToken,
    param('conversationId')
        .isString()
        .notEmpty()
        .withMessage('ID de conversation invalide'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            
            // Ici, vous pouvez implémenter la récupération de l'historique
            // depuis une base de données ou un cache
            res.json({
                success: true,
                conversationId,
                messages: [] // À implémenter
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

/**
 * @route   DELETE /api/chatbot/conversation/:conversationId
 * @desc    Supprimer l'historique d'une conversation
 * @access  Technicien ou Soignant
 */
router.delete(
    '/conversation/:conversationId',
    verifyToken,
    param('conversationId').isString().notEmpty(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { conversationId } = req.params;
            // Ici, implémenter la suppression de la conversation
            res.json({
                success: true,
                message: `Conversation ${conversationId} supprimée`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
);

// ============================================
# EXPORTATION
============================================

// Log des routes enregistrées (développement)
if (process.env.NODE_ENV === 'development') {
    console.log('📡 Routes chatbot enregistrées:');
    console.log('   POST   /api/chatbot/diagnostic');
    console.log('   POST   /api/chatbot/intervention');
    console.log('   POST   /api/chatbot/signalement');
    console.log('   POST   /api/chatbot/signaler');
    console.log('   GET    /api/chatbot/conversation/:conversationId');
    console.log('   DELETE /api/chatbot/conversation/:conversationId');
}

export default router;
