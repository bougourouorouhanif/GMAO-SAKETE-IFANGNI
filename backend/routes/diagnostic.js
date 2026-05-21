// routes/diagnosticRoutes.js - Routes pour le diagnostic GMAO Sakété

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { 
    diagnosticMessage, 
    getDiagnosticHistory,
    getDiagnosticById,
    deleteDiagnosticHistory
} from '../controllers/diagnosticController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// ============================================
// CONFIGURATION RATE LIMITING
// ============================================

// Limite pour les messages de diagnostic (15 requêtes par minute)
const diagnosticLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 15,
    message: {
        success: false,
        error: 'Trop de requêtes de diagnostic, veuillez patienter quelques secondes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ============================================
// VALIDATION DES REQUÊTES
// ============================================

// Validation pour l'envoi d'un message de diagnostic
const validateDiagnosticMessage = [
    body('message')
        .notEmpty().withMessage('Le message est requis')
        .isString().withMessage('Le message doit être une chaîne de caractères')
        .trim()
        .isLength({ min: 2, max: 1000 }).withMessage('Le message doit contenir entre 2 et 1000 caractères'),
    body('equipmentId')
        .optional()
        .isInt({ min: 1 }).withMessage('L\'ID de l\'équipement doit être un nombre valide')
        .toInt(),
    body('conversationId')
        .optional()
        .isString().withMessage('L\'ID de conversation doit être une chaîne')
        .trim()
];

// Validation pour la récupération de l'historique
const validateGetHistory = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('La limite doit être entre 1 et 100')
        .toInt()
        .default(50),
    query('offset')
        .optional()
        .isInt({ min: 0 }).withMessage('L\'offset doit être un nombre positif')
        .toInt()
        .default(0),
    query('conversationId')
        .optional()
        .isString().trim()
];

// Validation pour la récupération d'un diagnostic par ID
const validateGetById = [
    param('id')
        .notEmpty().withMessage('L\'ID du diagnostic est requis')
        .isInt({ min: 1 }).withMessage('L\'ID doit être un nombre valide')
        .toInt()
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
 * @route   POST /api/diagnostic/message
 * @desc    Envoyer un message pour le diagnostic
 * @access  Technicien
 * @body    { message, equipmentId?, conversationId? }
 */
router.post(
    '/message',
    diagnosticLimiter,
    verifyToken,
    isTechnicien,
    validateDiagnosticMessage,
    handleValidationErrors,
    diagnosticMessage
);

/**
 * @route   GET /api/diagnostic/history
 * @desc    Récupérer l'historique des diagnostics
 * @access  Technicien
 * @query   limit, offset, conversationId
 */
router.get(
    '/history',
    verifyToken,
    isTechnicien,
    validateGetHistory,
    handleValidationErrors,
    getDiagnosticHistory
);

/**
 * @route   GET /api/diagnostic/:id
 * @desc    Récupérer un diagnostic spécifique par ID
 * @access  Technicien
 * @param   id - ID du diagnostic
 */
router.get(
    '/:id',
    verifyToken,
    isTechnicien,
    validateGetById,
    handleValidationErrors,
    getDiagnosticById
);

/**
 * @route   DELETE /api/diagnostic/history/:conversationId
 * @desc    Supprimer l'historique d'une conversation
 * @access  Technicien
 * @param   conversationId - ID de la conversation
 */
router.delete(
    '/history/:conversationId',
    verifyToken,
    isTechnicien,
    param('conversationId')
        .notEmpty().withMessage('L\'ID de la conversation est requis')
        .isString().trim(),
    handleValidationErrors,
    deleteDiagnosticHistory
);

// ============================================
# LOGS DE DÉVELOPPEMENT
============================================

if (process.env.NODE_ENV === 'development') {
    console.log('📡 Routes diagnostic enregistrées:');
    console.log('   POST   /api/diagnostic/message');
    console.log('   GET    /api/diagnostic/history');
    console.log('   GET    /api/diagnostic/:id');
    console.log('   DELETE /api/diagnostic/history/:conversationId');
}

// ============================================
# EXPORTATION
============================================

export default router;
