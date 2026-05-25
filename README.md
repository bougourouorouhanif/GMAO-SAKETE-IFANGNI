# GMAO Sakete-Ifangni

Application de Gestion de Maintenance Assistee par Ordinateur pour l'Hopital de Zone Sakete-Ifangni.

Le projet contient:

- un backend Node.js / Express / Prisma;
- une base de donnees cible PostgreSQL en production;
- un frontend statique HTML, CSS et JavaScript;
- des espaces Technicien, Soignant et Mobile;
- des modules inventaire, interventions, maintenance preventive, stock, alertes, documents, planning et rapports CoDIR.

## Arborescence

```text
backend/      API Express, Prisma, routes, controleurs, services
frontend/     Pages HTML statiques et assets
doc/          Guides utilisateur et technicien
scripts/      Scripts de sauvegarde et de deploiement
render.yaml   Configuration backend Render
netlify.toml  Configuration frontend Netlify
```

## Prerequis

- Node.js 18 ou plus recent
- npm
- PostgreSQL pour un fonctionnement complet du backend

## Installation

Depuis la racine du projet:

```bash
npm install
npm --prefix backend install
```

## Variables d'environnement backend

Creer un fichier `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
JWT_SECRET="change-me"
FRONTEND_URL="http://localhost:5500"
NODE_ENV="development"
```

Variables optionnelles:

```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER=""
EMAIL_PASS=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

## Base de donnees

Generer Prisma:

```bash
npm --prefix backend run prisma:generate
```

Appliquer les migrations:

```bash
npm --prefix backend run prisma:migrate
```

Le dossier actif `backend/prisma/migrations` contient une baseline PostgreSQL. Les anciennes migrations SQLite ont ete conservees dans `backend/prisma/migrations_sqlite_archive` pour reference, mais elles ne sont plus executees par Prisma.

Initialiser les donnees de demo:

```bash
npm --prefix backend run prisma:seed
```

Comptes de demo prevus par le seed:

```text
Technicien: tech.biomedical@hopital.bj / admin123
Soignant:   infirmier.urgences@hopital.bj / admin123
```

## Lancement local

Backend:

```bash
npm start
```

ou directement:

```bash
npm --prefix backend start
```

Sous Windows, un script de lancement local est aussi disponible:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-backend-dev.ps1
```

Frontend statique:

```bash
cd frontend
python -m http.server 5500
```

Ouvrir ensuite:

```text
http://localhost:5500/login.html
```

API de sante:

```text
http://localhost:10000/api/health
```

## Deploiement

- Le frontend est prevu pour Netlify via `netlify.toml`.
- Le backend est prevu pour Render via `render.yaml`.
- Render doit utiliser le dossier `backend` comme racine du service backend.

## Modules principaux

- Authentification et validation des comptes
- Gestion des utilisateurs et techniciens
- Inventaire des equipements et QR codes
- Signalements de pannes
- Interventions correctives
- Maintenance preventive
- Gestion du stock et mouvements de pieces
- Alertes
- Planning de garde
- Documents techniques
- Rapports CoDIR
- Interfaces mobiles et PWA

## Notes techniques

Le projet a ete remis en etat pour charger les routes principales et corriger les incoherences prioritaires de lancement:

- le backend n'execute plus de `prisma db push --accept-data-loss` au demarrage;
- les migrations automatiques passent par `prisma migrate deploy` uniquement avec `RUN_MIGRATIONS=true`;
- les endpoints critiques appeles par le frontend sont exposes;
- les anciennes requetes SQLite des rapports principaux ont ete remplacees;
- `JWT_SECRET` est obligatoire.

Pour un fonctionnement complet en local, PostgreSQL doit etre lance et accessible via `DATABASE_URL`.
