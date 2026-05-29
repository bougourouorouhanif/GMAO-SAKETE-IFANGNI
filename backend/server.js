// backend/server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { exec } from 'child_process';
import util from 'util';
import prisma from './config/database.js';

dotenv.config();

// Fail-fast: secrets requis en prod
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET manquant — refus de démarrer');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL manquant en production');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);

// Exécute les migrations PostgreSQL au démarrage (sur Render)
async function runMigrations() {
  if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true') {
    console.log('📦 Application des migrations Prisma...');
    try {
      const { stdout, stderr } = await execPromise('npx prisma migrate deploy');
      console.log('✅ Résultat:', stdout);
      if (stderr) console.warn('⚠️', stderr);
    } catch (error) {
      console.error('❌ Échec des migrations:', error.message);
      throw error;
    }
  }
}

// Attendre que les migrations soient faites avant de démarrer le serveur
await runMigrations();

const app = express();
const PORT = process.env.PORT || 10000;

// Render/Netlify proxy — requis pour rate-limit + IP réelle
app.set('trust proxy', 1);

// Configuration CORS — origines explicites + regex pour previews
const staticOrigins = [
    'https://gmao-sakete.netlify.app',
    'https://gmao-sakete.vercel.app',
    'https://gmao-sakete-ifangni.vercel.app',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost:5173'
];
if (process.env.FRONTEND_URL) staticOrigins.push(process.env.FRONTEND_URL);

const originRegex = [
    /^https:\/\/.*\.netlify\.app$/,
    /^https:\/\/.*\.vercel\.app$/
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (staticOrigins.includes(origin)) return callback(null, true);
        if (originRegex.some(rx => rx.test(origin))) return callback(null, true);
        return callback(new Error(`Origin ${origin} non autorisée`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middlewares
app.use(cors(corsOptions));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate-limit global API (auth a son propre limiter plus strict)
import { apiLimiter } from './middleware/rateLimit.js';
import { auditMiddleware } from './middleware/audit.js';
app.use('/api/', apiLimiter);
app.use('/api/', auditMiddleware);

// Dossiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/qrcodes', express.static(path.join(__dirname, 'uploads/qrcodes')));

// Frontend statique (sert /, /login.html, /assets/*, etc.)
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath, { extensions: ['html'] }));

// Créer les dossiers uploads
const uploadDirs = ['uploads', 'uploads/photos', 'uploads/documents', 'uploads/qrcodes', 'uploads/rapports'];
uploadDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// ============ IMPORTS ROUTES ============
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import equipmentRoutes from './routes/equipements.js';
import maintenanceRoutes from './routes/maintenances.js';
import preventiveRoutes from './routes/preventive.js';
import stockRoutes from './routes/stocks.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
// import diagnosticRoutes from './routes/diagnostic.js'; // TODO: controller manquant
import codirRoutes from './routes/codir.js';
import planningRoutes from './routes/planning.js';
import dashboardRoutes from './routes/dashboard.js';
import mobileRoutes from './routes/mobile.js';
import alerteRoutes from './routes/alertes.js';
import fournisseurRoutes from './routes/fournisseurs.js';
import technicienRoutes from './routes/techniciens.js';
import statistiquesRoutes from './routes/statistiquesRoutes.js';
// import documentRoutes from './routes/documents.js'; // TODO: fichier manquant
// import signalementRoutes from './routes/signalements.js'; // TODO: fichier manquant
import logsRoutes from './routes/logs.js';
import exportsRoutes from './routes/exports.js';
import { startPreventiveScheduler, checkPreventiveDeadlines } from './jobs/preventiveScheduler.js';
import { verifyToken } from './middleware/auth.js';
import { isAdmin } from './middleware/roleCheck.js';

// ============ ROUTES API ============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipements', equipmentRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/preventif', preventiveRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/chatbot', chatbotRoutes);
// app.use('/api/diagnostic', diagnosticRoutes); // TODO: controller manquant
app.use('/api/codir', codirRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/alertes', alerteRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/techniciens', technicienRoutes);
app.use('/api/statistiques', statistiquesRoutes);
// app.use('/api/documents', documentRoutes); // TODO: fichier manquant
// app.use('/api/signalements', signalementRoutes); // TODO: fichier manquant
app.use('/api/logs', logsRoutes);
app.use('/api/exports', exportsRoutes);

// Trigger manuel scheduler préventif (ADMIN)
app.post('/api/jobs/preventive-check', verifyToken, isAdmin, async (req, res) => {
  try {
    const result = await checkPreventiveDeadlines();
    res.json({ message: 'Scheduler exécuté', ...result });
  } catch (err) {
    res.status(500).json({ message: 'Erreur scheduler', error: err.message });
  }
});

// ============ ALIAS /api/v1/* (versionnage) ============
const v1Routes = express.Router();
v1Routes.use('/auth', authRoutes);
v1Routes.use('/users', userRoutes);
v1Routes.use('/equipements', equipmentRoutes);
v1Routes.use('/maintenances', maintenanceRoutes);
v1Routes.use('/preventif', preventiveRoutes);
v1Routes.use('/stock', stockRoutes);
v1Routes.use('/chatbot', chatbotRoutes);
// v1Routes.use('/diagnostic', diagnosticRoutes); // TODO: controller manquant
v1Routes.use('/codir', codirRoutes);
v1Routes.use('/planning', planningRoutes);
v1Routes.use('/dashboard', dashboardRoutes);
v1Routes.use('/mobile', mobileRoutes);
v1Routes.use('/alertes', alerteRoutes);
v1Routes.use('/fournisseurs', fournisseurRoutes);
v1Routes.use('/techniciens', technicienRoutes);
v1Routes.use('/statistiques', statistiquesRoutes);
// v1Routes.use('/documents', documentRoutes); // TODO: fichier manquant
// v1Routes.use('/signalements', signalementRoutes); // TODO: fichier manquant
v1Routes.use('/logs', logsRoutes);
v1Routes.use('/exports', exportsRoutes);
app.use('/api/v1', v1Routes);

// ============ ROUTE DE SANTÉ ============
app.get('/api/health', async (req, res) => {
  const mem = process.memoryUsage();
  let dbStatus = 'unknown';
  let dbLatencyMs = null;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbStatus = 'OK';
  } catch (err) {
    dbStatus = `ERROR: ${err.message}`;
  }
  res.status(dbStatus === 'OK' ? 200 : 503).json({
    status: dbStatus === 'OK' ? 'OK' : 'DEGRADED',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '2.1.0',
    db: { status: dbStatus, latencyMs: dbLatencyMs },
    memory: {
      rssMb: +(mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(1)
    }
  });
});

// ============ DEBUG ENDPOINTS — DEV ONLY ============
if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEBUG_ROUTES === 'true') {
  console.warn('⚠️  Debug endpoints activés (dev uniquement)');

  app.post('/api/debug/activate/:email', async (req, res) => {
    const { email } = req.params;
    try {
      const user = await prisma.user.update({
        where: { email },
        data: { statut: 'ACTIF' }
      });
      res.json({ message: 'Compte activé', user: { email: user.email, statut: user.statut } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/debug/set-technician/:email', async (req, res) => {
    const { email } = req.params;
    try {
      const user = await prisma.user.update({
        where: { email },
        data: { role: 'TECHNICIEN', statut: 'ACTIF' }
      });
      res.json({ success: true, user: { email: user.email, role: user.role, statut: user.statut } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// ============ PAGE D'ACCUEIL API ============
app.get('/', (req, res) => {
  res.json({ 
    message: 'API GMAO Sakété-Ifangni est en ligne',
    version: '2.1.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      equipements: '/api/equipements',
      maintenances: '/api/maintenances',
      stock: '/api/stock',
      chatbot: '/api/chatbot',
      statistiques: '/api/statistiques'
    }
  });
});

// ============ GESTION DES ERREURS 404 ============
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// ============ GESTION DES ERREURS GLOBALES ============
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============ DÉMARRAGE DU SERVEUR ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📱 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Base de données: PostgreSQL`);
  startPreventiveScheduler();
  console.log(`\n📡 Routes disponibles:`);
  console.log(`   POST   /api/auth/login`);
  console.log(`   POST   /api/auth/register`);
  console.log(`   GET    /api/equipements`);
  console.log(`   GET    /api/maintenances`);
  console.log(`   POST   /api/chatbot/diagnostic`);
  console.log(`   GET    /api/statistiques/kpis`);
  console.log(`   GET    /api/statistiques/tendance-disponibilite`);
  console.log(`   GET    /api/health`);
});
