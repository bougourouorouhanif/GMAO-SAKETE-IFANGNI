# Guide d'installation — GMAO Sakété-Ifangni

## Prérequis

- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9
- Git

## Installation locale

```bash
git clone https://github.com/<owner>/GMAO-SAKETE-IFANGNI.git
cd GMAO-SAKETE-IFANGNI

# Backend
cd backend
cp .env.example .env
# Éditer .env : DATABASE_URL, JWT_SECRET (obligatoires)
npm install
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js   # données initiales (optionnel)
npm run dev
```

Backend écoute sur `http://localhost:10000`.

## Frontend

Static — servir avec n'importe quel serveur HTTP :

```bash
cd frontend
npx serve .   # ou: python -m http.server 3000
```

Ouvrir `http://localhost:3000`.

## Variables d'environnement critiques

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne PostgreSQL |
| `JWT_SECRET` | oui | ≥ 64 caractères aléatoires |
| `NODE_ENV` | oui | `development` / `production` / `test` |
| `PORT` | non | Défaut 10000 |
| `FRONTEND_URL` | recommandé | Pour CORS strict |
| `CLOUDINARY_*` | si upload | Stockage images |
| `RESEND_API_KEY` / `SMTP_*` | si email | Notifications |
| `TWILIO_*` | si SMS | Alertes critiques |
| `ENABLE_DEBUG_ROUTES` | non | `true` en dev uniquement |

Génération JWT_SECRET sécurisé :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Scripts disponibles (backend)

| Commande | Action |
|---|---|
| `npm run dev` | Hot-reload nodemon |
| `npm start` | Démarrage prod |
| `npm test` | Vitest |
| `npm run test:coverage` | Couverture |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run prisma:migrate` | Crée migration |
| `npm run prisma:seed` | Seed DB |

## Déploiement Render (backend)

1. Connecter le repo GitHub
2. Render lit [render.yaml](../render.yaml)
3. Configurer variables d'env dans le dashboard Render : `JWT_SECRET`, `CLOUDINARY_*`, `RESEND_API_KEY`, `TWILIO_*`
4. `DATABASE_URL` injecté auto par Postgres add-on
5. `NODE_ENV=production` déclenche `prisma migrate deploy` au boot

## Déploiement Netlify (frontend)

1. Connecter le repo
2. Netlify lit [netlify.toml](../netlify.toml)
3. Publish directory: `frontend/`
4. Redirects `/api/*` → backend Render configurés

## Tests post-déploiement

```bash
curl https://<render-url>/api/health
# attendre: status OK, db.status OK
```

## Backup base de données

Script manuel : [scripts/backup_db.sh](../scripts/backup_db.sh)

Automatisation recommandée : cron Render quotidien → upload Cloudinary/S3.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `JWT_SECRET manquant` au boot | env mal chargé | Vérifier `.env` présent |
| `403 CORS` côté front | Origin non autorisée | Ajouter à `staticOrigins` ou `FRONTEND_URL` |
| Migrations échouent | DB inaccessible | Vérifier `DATABASE_URL` et réseau |
| `429 Too Many Requests` sur login | Rate-limit | Attendre 15 min ou whitelist IP |
| Socket.IO ne se connecte pas | Token absent/invalide | Vérifier `localStorage.token` |
