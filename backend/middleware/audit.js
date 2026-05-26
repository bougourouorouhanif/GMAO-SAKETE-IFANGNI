import prisma from '../config/database.js';
import logger from '../config/logger.js';

const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SKIP_PATHS = [/^\/api\/health/, /^\/api\/auth\/login/, /^\/api\/auth\/refresh/, /^\/api\/debug\//];

function resourceFromPath(originalUrl) {
  const m = originalUrl.match(/^\/api\/(?:v\d+\/)?([^\/?]+)(?:\/([^\/?]+))?/);
  if (!m) return { entite: null, entiteId: null };
  const entite = m[1];
  const id = m[2] && /^\d+$/.test(m[2]) ? parseInt(m[2], 10) : null;
  return { entite, entiteId: id };
}

export const auditMiddleware = (req, res, next) => {
  if (!AUDIT_METHODS.has(req.method)) return next();
  if (SKIP_PATHS.some((rx) => rx.test(req.originalUrl))) return next();

  res.on('finish', async () => {
    if (res.statusCode >= 400) return;
    const userId = req.user?.id;
    if (!userId) return;

    const { entite, entiteId } = resourceFromPath(req.originalUrl);

    try {
      await prisma.log.create({
        data: {
          utilisateurId: userId,
          action: `${req.method} ${req.originalUrl}`,
          entite,
          entiteId,
          details: req.body ? JSON.stringify(req.body).slice(0, 2000) : null,
          adresseIp: req.ip,
          userAgent: req.get('user-agent')?.slice(0, 255)
        }
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'audit log écriture échouée');
    }
  });

  next();
};
