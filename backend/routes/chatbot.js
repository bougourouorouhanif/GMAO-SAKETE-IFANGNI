import express from 'express';
import { chatbotMessage, chatbotCreateSignalement } from '../controllers/chatbotController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/chatbot/message — Accessible à TOUS les rôles connectés (technicien ET soignant)
router.post('/message', verifyToken, chatbotMessage);

// POST /api/chatbot/signaler — Accessible à TOUS les rôles connectés
router.post('/signaler', verifyToken, chatbotCreateSignalement);

export default router;
