import express from 'express';
import { register, login, validateUser, rejectUser, toggleUserStatus, refreshToken } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';
import { registerValidation, loginValidation, validate } from '../middleware/validation.js';

const router = express.Router();

// Routes publiques
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.post('/refresh', verifyToken, refreshToken);

// Routes protégées (technicien uniquement)
router.put('/users/:userId/validate', verifyToken, isTechnicien, validateUser);
router.delete('/users/:userId/reject', verifyToken, isTechnicien, rejectUser);
router.put('/users/:userId/toggle-status', verifyToken, isTechnicien, toggleUserStatus);

export default router;