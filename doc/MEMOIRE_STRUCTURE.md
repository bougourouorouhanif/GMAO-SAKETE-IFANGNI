# Structure du projet GMAO Sakété-Ifangni

## Vue d'ensemble

```
GMAO-SAKETE-IFANGNI/
├── backend/              API Node/Express + Prisma
│   ├── config/           DB, socket.io, logger pino
│   ├── controllers/      Logique métier (15 contrôleurs)
│   ├── middleware/       auth JWT, rateLimit, audit, roleCheck, validation, upload
│   ├── prisma/           schema.prisma + migrations + seed
│   ├── routes/           17+ fichiers routes Express
│   ├── tests/            Vitest
│   ├── uploads/          Photos, documents, qrcodes (gitignore)
│   └── utils/            Helpers (paginate, export)
├── frontend/             HTML/JS/CSS statique + PWA
│   ├── js/               api.js (env-aware), auth.js, ...
│   ├── css/
│   ├── sw.js             Service worker (offline)
│   ├── technicien/       App technicien
│   ├── soignant/         App soignant
│   └── mobile/           Vue mobile
├── doc/                  Documentation
├── scripts/              backup_db, deploy
├── .github/workflows/    CI GitHub Actions
├── render.yaml           Déploiement backend Render
├── netlify.toml          Déploiement frontend Netlify
└── README.md
```

## Modèle de données (Prisma)

```mermaid
erDiagram
  User ||--o{ Signalement : "signale"
  User ||--o{ Intervention : "réalise"
  User ||--o{ Log : "génère"
  Equipement ||--o{ Signalement : "concerné par"
  Equipement ||--o{ Intervention : "subit"
  Equipement ||--o{ MaintenancePreventive : "planifiée pour"
  Signalement ||--o| Intervention : "résolu par"
  Intervention ||--o{ PieceUtilisee : "consomme"
  Piece ||--o{ PieceUtilisee : "utilisée dans"
  Piece ||--o{ MouvementStock : "tracée"
  Fournisseur ||--o{ Equipement
  Fournisseur ||--o{ Piece
  Fournisseur ||--o{ ContratMaintenance
  Equipement }o--o| ContratMaintenance
  User ||--o{ PlanningGarde
  Equipement ||--o{ Alerte
  Conversation ||--o{ Message
  User ||--o{ Conversation
```

## Rôles métier

| Rôle | Capacités |
|---|---|
| `SOIGNANT` | Crée signalements, consulte état équipements, chatbot diagnostic |
| `TECHNICIEN` | Tout SOIGNANT + gère équipements/stock/interventions/préventif + valide comptes + rapports CoDIR |
| `ADMIN` | Tout TECHNICIEN + consulte `/api/logs` + gère utilisateurs |

## Flux métier principal

1. **Signalement** : SOIGNANT signale panne (`POST /api/signalements`) — événement socket `signalement:new` → notifie tous TECHNICIEN
2. **Diagnostic** : chatbot `/api/chatbot/diagnostic` propose causes probables
3. **Intervention** : TECHNICIEN démarre (`POST /api/maintenances`) — statut `EN_COURS`, événement `intervention:start`
4. **Pièces** : utilisation décrémente stock + crée `MouvementStock` ; déclenche alerte si `quantiteStock < seuilAlerte`
5. **Clôture** : `PUT /api/maintenances/:id` avec rapport + photos après → recalcul MTBF/MTTR équipement → notifie SOIGNANT
6. **CoDIR** : agrégation mensuelle KPIs → rapport PDF/Excel

## Couches transversales

- **Auth** : JWT 7j, middleware `verifyToken` injecte `req.user`
- **Audit** : middleware `audit.js` log toute mutation réussie → table `Log`
- **Rate-limit** : `/api/auth/login` 10/15min, `/api/auth/register` 5/h, global 300/15min
- **Socket.IO** : rooms `user_:id` et `role_:role` pour notifications ciblées
- **Logger** : pino JSON en prod (Render parse), pino-pretty en dev

## Décisions architecturales

| Choix | Raison |
|---|---|
| Prisma migrate deploy (pas `db push`) | Évite perte données en prod |
| JWT fail-fast au boot | Évite secret par défaut leakage |
| CORS allowlist + regex | Wildcard simple ne marche pas en CORS standard |
| Pino vs Winston | Perf + JSON natif pour Render log drain |
| HTML statique (pas SPA) | Compatibilité connexion faible, PWA-friendly |
