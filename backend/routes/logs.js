import express from 'express';
import prisma from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', verifyToken, isAdmin, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;

  const where = {};
  if (req.query.entite) where.entite = req.query.entite;
  if (req.query.utilisateurId) where.utilisateurId = parseInt(req.query.utilisateurId, 10);

  try {
    const [items, total] = await Promise.all([
      prisma.log.findMany({
        where,
        orderBy: { dateAction: 'desc' },
        skip,
        take: limit,
        include: { utilisateur: { select: { id: true, nom: true, prenom: true, email: true, role: true } } }
      }),
      prisma.log.count({ where })
    ]);
    res.json({ data: items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lecture logs', error: err.message });
  }
});

export default router;
