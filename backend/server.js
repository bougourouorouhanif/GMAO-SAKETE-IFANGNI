import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { exec } from 'child_process';
import util from 'util';
const execPromise = util.promisify(exec);

// Exécute les migrations PostgreSQL au démarrage (sur Render)
async function runMigrations() {
  // Ne migre que si on est en production (Render) ou si c'est forcé
  if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true') {
    console.log('📦 Vérification et application des migrations...');
    try {
      const { stdout, stderr } = await execPromise('npx prisma migrate deploy');
      console.log('✅ Résultat des migrations:', stdout);
      if (stderr) console.warn('⚠️', stderr);
    } catch (error) {
      console.error('❌ Échec des migrations:', error.message);
      // Ne pas bloquer le démarrage du serveur, mais l'erreur sera loggée
    }
  } else {
    console.log('⏩ Mode développement, migrations non exécutées automatiquement.');
  }
}

// Attendre que les migrations soient faites avant de démarrer le serveur
await runMigrations();

const app = express();
const PORT = process.env.PORT || 5000;

// ============ CONFIGURATION CORS ============
const corsOptions = {
    origin: ['https://gmao-sakete.netlify.app', 'https://*.netlify.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
import chatbotRoutes from './routes/chatbot.js';
import diagnosticRoutes from './routes/diagnostic.js';
import codirRoutes from './routes/codir.js';
import planningRoutes from './routes/planning.js';
import dashboardRoutes from './routes/dashboard.js';
import mobileRoutes from './routes/mobile.js';
import alerteRoutes from './routes/alertes.js';
import fournisseurRoutes from './routes/fournisseurs.js';
import technicienRoutes from './routes/techniciens.js';

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

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(), 
    uptime: process.uptime(),
    cors: 'enabled'
  });
});

// ============ NE PAS SERVIR LE FRONTEND SUR RENDER ============
// Sur Render, on sert uniquement l'API
// Le frontend est sur Netlify

app.get('/', (req, res) => {
  res.json({ message: 'API GMAO Sakété-Ifangni est en ligne' });
});

// Gestion erreurs 404 pour les routes API
app.use((req, res) => {
  res.status(404).json({ message: 'Route non trouvée' });
});

// Gestion erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.stack);
  res.status(500).json({
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
  console.log(`📱 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️ Base de données: PostgreSQL`);
});