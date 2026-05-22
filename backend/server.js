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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execPromise = util.promisify(exec);

// Exécute les migrations PostgreSQL au démarrage (sur Render)
async function runMigrations() {
  if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true') {
    console.log('📦 Synchronisation du schéma avec la base de données...');
    try {
      const { stdout, stderr } = await execPromise('npx prisma db push --accept-data-loss');
      console.log('✅ Résultat:', stdout);
      if (stderr) console.warn('⚠️', stderr);
    } catch (error) {
      console.error('❌ Échec de la synchronisation:', error.message);
    }
  }
}

// Attendre que les migrations soient faites avant de démarrer le serveur
await runMigrations();

const app = express();
const PORT = process.env.PORT || 10000;

// Configuration CORS
const corsOptions = {
    origin: [
        'https://gmao-sakete.netlify.app', 
        'https://*.netlify.app', 
        'https://gmao-sakete.vercel.app', 
        'https://gmao-sakete-ifangni.vercel.app',
        'https://gmao-sakete-ifangni-hlmd03cpo.vercel.app',
        'https://*.vercel.app',
        'http://localhost:3000',
        'http://localhost:5000'
    ],
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

// Dossiers statiques
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/qrcodes', express.static(path.join(__dirname, 'uploads/qrcodes')));

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
import diagnosticRoutes from './routes/diagnostic.js';
import codirRoutes from './routes/codir.js';
import planningRoutes from './routes/planning.js';
import dashboardRoutes from './routes/dashboard.js';
import mobileRoutes from './routes/mobile.js';
import alerteRoutes from './routes/alertes.js';
import fournisseurRoutes from './routes/fournisseurs.js';
import technicienRoutes from './routes/techniciens.js';
import statistiquesRoutes from './routes/statistiques.js';
import documentRoutes from './routes/documents.js';
import signalementRoutes from './routes/signalements.js';

// ============ ROUTES API ============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipements', equipmentRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/preventif', preventiveRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/codir', codirRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/alertes', alerteRoutes);
app.use('/api/fournisseurs', fournisseurRoutes);
app.use('/api/techniciens', technicienRoutes);
app.use('/api/statistiques', statistiquesRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/signalements', signalementRoutes);

// ============ ROUTE DE SANTÉ ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(), 
    uptime: process.uptime(),
    cors: 'enabled',
    environment: process.env.NODE_ENV || 'development'
  });
});

// ============ ROUTES TEMPORAIRES DE DEBUG ============
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
