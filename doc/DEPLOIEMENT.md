# Déploiement automatique — GMAO Sakété-Ifangni

Workflow CI/CD : [.github/workflows/deploy.yml](../.github/workflows/deploy.yml)

## Déclencheurs

- **Push sur `main`** : déploie backend + frontend
- **Manuel** (`workflow_dispatch`) : choisir cible (`all` / `backend` / `frontend`)

## Pipeline

```
gate (tests Postgres) → deploy-backend (Render) ┐
                     └→ deploy-frontend (Netlify) ┤→ notify (Slack)
```

Si `gate` (lint + vitest) échoue, aucun déploiement.

## Secrets GitHub à configurer

Repo → Settings → Secrets and variables → Actions → New repository secret

| Secret | Source | Description |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook | URL POST qui déclenche redeploy backend |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create | Token CLI Vercel |
| `VERCEL_ORG_ID` | `vercel link` local → `.vercel/project.json` (`orgId`) | ID organisation Vercel |
| `VERCEL_PROJECT_ID` | `vercel link` local → `.vercel/project.json` (`projectId`) | ID projet Vercel |
| `SLACK_WEBHOOK_URL` | Slack → Apps → Incoming Webhooks | Notif post-deploy (optionnel) |

## Variables (non sensibles)

Repo → Settings → Secrets and variables → Actions → Variables

| Variable | Défaut | Description |
|---|---|---|
| `BACKEND_URL` | `https://gmao-sakete-ifangni-1.onrender.com` | URL prod pour smoke test |

## Configuration côté Render

1. Service → Settings → Auto-Deploy : **OFF** (laisser GitHub Actions piloter)
2. Settings → Deploy Hook → copier URL → ajouter en secret `RENDER_DEPLOY_HOOK_URL`
3. Environment :
   - `JWT_SECRET` (≥64 chars random)
   - `NODE_ENV=production`
   - `DATABASE_URL` (injecté par add-on Postgres)
   - `FRONTEND_URL=https://gmao-sakete-ifangni.vercel.app`
   - `CLOUDINARY_*`, `RESEND_API_KEY`, `TWILIO_*` selon besoins

## Configuration côté Vercel

Setup initial (1 fois, en local) :
```bash
cd <repo>
npm i -g vercel
vercel login
vercel link            # rattache repo à projet Vercel
cat .vercel/project.json   # récupérer orgId + projectId
```

Puis ajouter en secrets GitHub :
- `VERCEL_TOKEN` (Vercel → Settings → Tokens → Create)
- `VERCEL_ORG_ID` (depuis `project.json`)
- `VERCEL_PROJECT_ID` (depuis `project.json`)

**Désactiver Auto-Deploy Git Vercel** : Vercel → Project → Settings → Git → Production Branch → décocher "Auto Deploy" pour éviter double déploiement (sinon GitHub Actions + Vercel Git triggers se cumulent).

Variables env Vercel (Project → Settings → Environment Variables) :
- `BACKEND_URL=https://gmao-sakete-ifangni-1.onrender.com` (si frontend en a besoin)

Config racine : [vercel.json](../vercel.json) — sert `frontend/`, rewrite `/api/*` → backend Render, headers sécurité + cache.

## Smoke test post-deploy

Le job `deploy-backend` poll `/api/health` pendant 6 min après le hook Render.
Critère succès : HTTP 200 avec `{ "status": "OK", "db": { "status": "OK" } }`.
Échec → job rouge → notif Slack.

## Rollback manuel

Render :
1. Dashboard → Service → Events → choisir deploy précédent → "Rollback"

Vercel :
1. Project → Deployments → choisir version précédente → "..." → "Promote to Production"

## Déclenchement manuel

```bash
gh workflow run deploy.yml -f target=backend
gh workflow run deploy.yml -f target=frontend
gh workflow run deploy.yml -f target=all
```

## Dépannage

| Erreur | Cause | Fix |
|---|---|---|
| `Secret RENDER_DEPLOY_HOOK_URL manquant` | Pas configuré | Ajouter le secret |
| Healthcheck KO après 6 min | DB Render en panne / migrations échouent | Voir logs Render |
| 401 sur Vercel deploy | Token expiré | Régénérer `VERCEL_TOKEN` |
| Vercel ignore changes | Auto-deploy Git activé | Désactiver dans Project → Settings → Git |
| `gate` échoue sur tests | Code cassé | Voir `Actions → CI → backend job` |
