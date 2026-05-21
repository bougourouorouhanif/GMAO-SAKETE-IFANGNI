import express from 'express';
import { chatbotDiagnostic, chatbotCreerIntervention } from '../controllers/chatbotDiagnosticController.js';
import { chatbotSignalement, chatbotCreerSignalement } from '../controllers/chatbotSignalementController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien, isSoignant } from '../middleware/roleCheck.js';

const router = express.Router();

// ── TECHNICIEN ────────────────────────────────────────────
// POST /api/chatbot/diagnostic    → chatbot diagnostic expert
// POST /api/chatbot/intervention  → créer une intervention depuis le diagnostic
router.post('/diagnostic',    verifyToken, isTechnicien, chatbotDiagnostic);
router.post('/intervention',  verifyToken, isTechnicien, chatbotCreerIntervention);

// ── SOIGNANT ──────────────────────────────────────────────
// POST /api/chatbot/signalement   → chatbot signalement soignant
// POST /api/chatbot/signaler      → créer un signalement depuis le chatbot
router.post('/signalement',   verifyToken, isSoignant, chatbotSignalement);
router.post('/signaler',      verifyToken, isSoignant, chatbotCreerSignalement);

export default router;
