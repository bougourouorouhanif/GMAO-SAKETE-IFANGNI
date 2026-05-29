import prisma from '../config/database.js';
import { notifyNewAlert, sendNotificationToRole } from '../config/socket.js';
import { sendEmail } from '../config/email.js';
import { sendSMS } from '../config/sms.js';
import logger from '../config/logger.js';

const DAYS_AHEAD = parseInt(process.env.PREVENTIVE_ALERT_DAYS || '7', 10);
const CRITICAL_DAYS = parseInt(process.env.PREVENTIVE_CRITICAL_DAYS || '2', 10);

export async function checkPreventiveDeadlines() {
  const now = new Date();
  const limit = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);

  const dues = await prisma.maintenancePreventive.findMany({
    where: {
      statut: 'PREVU',
      prochaineRealisation: { lte: limit }
    },
    include: { equipement: true, responsable: { select: { id: true, email: true, telephone: true, prenom: true, nom: true } } }
  });

  let created = 0;
  for (const m of dues) {
    const daysLeft = Math.ceil((m.prochaineRealisation - now) / (24 * 60 * 60 * 1000));
    const niveau = daysLeft <= 0 ? 'CRITIQUE' : daysLeft <= CRITICAL_DAYS ? 'CRITIQUE' : 'ATTENTION';

    // Idempotent: skip si alerte déjà créée ces 24h pour ce préventif
    const recent = await prisma.alerte.findFirst({
      where: {
        type: 'MAINTENANCE_PREVENTIVE',
        message: { contains: `#${m.id}` },
        dateCreation: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      }
    });
    if (recent) continue;

    const msg = `Maintenance préventive #${m.id} ${niveau === 'CRITIQUE' ? 'EN RETARD' : 'à venir'} (${daysLeft}j) — ${m.equipement?.nom || 'équipement'} (${m.type})`;
    const alerte = await prisma.alerte.create({
      data: {
        type: 'MAINTENANCE_PREVENTIVE',
        niveau,
        message: msg,
        equipementId: m.equipementId
      }
    });
    created++;

    try { notifyNewAlert(alerte); } catch (_) {}
    try { sendNotificationToRole('TECHNICIEN', { type: 'PREVENTIVE_DUE', title: '🔧 Maintenance préventive', body: msg, data: { maintenanceId: m.id, daysLeft } }); } catch (_) {}

    if (m.responsable?.email) {
      sendEmail(m.responsable.email, `🔧 Maintenance préventive ${niveau === 'CRITIQUE' ? 'EN RETARD' : 'à venir'}`,
        `<p>${msg}</p><p>Équipement: ${m.equipement?.nom}</p><p>Échéance: ${m.prochaineRealisation.toISOString().slice(0, 10)}</p>`)
        .catch(() => {});
    }
    if (m.responsable?.telephone && niveau === 'CRITIQUE') {
      sendSMS(m.responsable.telephone, `GMAO: maintenance préventive ${m.equipement?.nom} en retard`).catch(() => {});
    }
  }

  logger.info({ checked: dues.length, alertesCreated: created }, 'preventive scheduler tick');
  return { checked: dues.length, alertesCreated: created };
}

export function startPreventiveScheduler({ intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  if (process.env.DISABLE_SCHEDULER === 'true') {
    logger.info('Scheduler préventif désactivé (DISABLE_SCHEDULER)');
    return null;
  }
  // Premier tick après 30s (laisser app démarrer)
  setTimeout(() => {
    checkPreventiveDeadlines().catch((err) => logger.error({ err: err.message }, 'preventive scheduler erreur'));
  }, 30000);
  // Récurrent
  const handle = setInterval(() => {
    checkPreventiveDeadlines().catch((err) => logger.error({ err: err.message }, 'preventive scheduler erreur'));
  }, intervalMs);
  logger.info(`Scheduler préventif démarré (tick ${intervalMs / 1000 / 60}min)`);
  return handle;
}
