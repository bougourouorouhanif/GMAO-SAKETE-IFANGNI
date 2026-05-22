// backend/routes/statistiquesRoutes.js
import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

// Contrôleurs temporaires
const getKPIs = async (req, res) => {
    try {
        res.json({
            disponibilite: 94.5,
            tauxPannes: 5.5,
            mtbf: 45,
            mttr: 2.5
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTendanceDisponibilite = async (req, res) => {
    try {
        res.json({
            labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
            values: [92, 93, 94, 95, 94, 96]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

router.get('/kpis', verifyToken, isTechnicien, getKPIs);
router.get('/tendance-disponibilite', verifyToken, isTechnicien, getTendanceDisponibilite);

export default router;
