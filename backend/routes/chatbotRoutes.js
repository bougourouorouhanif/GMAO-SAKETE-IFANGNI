// backend/routes/chatbotRoutes.js
// Routes complètes pour le chatbot - GMAO Sakété

import express from 'express';
import { body, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien, isSoignant } from '../middleware/roleCheck.js';
import { 
    chatbotDiagnostic, 
    chatbotCreerIntervention 
} from '../controllers/ChatbotDiagnosticController.js';
import { 
    chatbotSignalement, 
    chatbotCreerSignalement 
} from '../controllers/ChatbotSignalementController.js';

const router = express.Router();

// ============================================
// CONFIGURATION RATE LIMITING
// ============================================

const chatbotLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Trop de requêtes, veuillez patienter'
    }
});

const createLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Trop de tentatives, veuillez patienter'
    }
});

// ============================================
// VALIDATIONS
// ============================================

const validateDiagnostic = [
    body('message').notEmpty().withMessage('Le message est requis').trim(),
    body('equipmentId').optional().isInt(),
    body('conversationId').optional().isString()
];

const validateSignalement = [
    body('message').notEmpty().withMessage('Le message est requis').trim(),
    body('equipmentId').optional().isInt(),
    body('conversationId').optional().isString()
];

const validateIntervention = [
    body('equipmentId').notEmpty().isInt(),
    body('diagnostic').optional().trim(),
    body('pieceSuggestion').optional().trim(),
    body('pieceId').optional().isInt(),
    body('conversationId').optional().isString()
];

const validateCreateSignalement = [
    body('equipmentId').notEmpty().isInt(),
    body('description').notEmpty().trim(),
    body('priorite').optional().isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']),
    body('conversationId').optional().isString()
];

const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg
        });
    }
    next();
};

// ============================================
// ROUTES TECHNICIEN - DIAGNOSTIC
// ============================================

/**
 * POST /api/chatbot/diagnostic
 * Diagnostic expert pour technicien
 */
router.post(
    '/diagnostic',
    chatbotLimiter,
    verifyToken,
    isTechnicien,
    validateDiagnostic,
    handleErrors,
    chatbotDiagnostic
);

/**
 * POST /api/chatbot/intervention
 * Créer une intervention depuis le diagnostic
 */
router.post(
    '/intervention',
    createLimiter,
    verifyToken,
    isTechnicien,
    validateIntervention,
    handleErrors,
    chatbotCreerIntervention
);

// ============================================
// ROUTES SOIGNANT - SIGNALEMENT
// ============================================

/**
 * POST /api/chatbot/signalement
 * Assistant signalement pour soignant
 */
router.post(
    '/signalement',
    chatbotLimiter,
    verifyToken,
    isSoignant,
    validateSignalement,
    handleErrors,
    chatbotSignalement
);

/**
 * POST /api/chatbot/signaler
 * Créer un signalement depuis le chatbot
 */
router.post(
    '/signaler',
    createLimiter,
    verifyToken,
    isSoignant,
    validateCreateSignalement,
    handleErrors,
    chatbotCreerSignalement
);

// ============================================
// EXPORTATION
// ============================================

export default router;
