# GMAO Sakété-Ifangni — Documentation API

Base URL prod: `https://gmao-sakete.onrender.com`
Base URL dev: `http://localhost:10000`

Toutes routes JSON. Préfixe `/api/`. Auth par JWT Bearer sauf `/auth/login`, `/auth/register`, `/health`.

## Authentification

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Inscription (rate-limit 5/h) |
| POST | `/api/auth/login` | — | Connexion (rate-limit 10/15min) |
| POST | `/api/auth/refresh` | JWT | Renouvelle token |
| PUT  | `/api/auth/users/:userId/validate` | TECHNICIEN | Valide compte |
| DELETE | `/api/auth/users/:userId/reject` | TECHNICIEN | Rejette compte |
| PUT  | `/api/auth/users/:userId/toggle-status` | TECHNICIEN | Active/désactive |

### Login

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "tech@gmao.bj", "password": "..." }
```

Réponse `200`:
```json
{ "token": "eyJ...", "user": { "id": 1, "email": "...", "role": "TECHNICIEN" } }
```

Réponse `429` (rate-limit dépassé): `{ "message": "Trop de tentatives. Réessayez dans 15 minutes." }`

### Header Authorization
```
Authorization: Bearer eyJ...
```

## Équipements

| Méthode | Endpoint | Description |
|---|---|---|
| GET | `/api/equipements` | Liste (pagination: `?page=1&limit=50`) |
| GET | `/api/equipements/:id` | Détail |
| POST | `/api/equipements` | Créer (TECHNICIEN) |
| PUT | `/api/equipements/:id` | Modifier (TECHNICIEN) |
| DELETE | `/api/equipements/:id` | Supprimer (TECHNICIEN) |

## Signalements / Interventions

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/signalements` | Créer panne (SOIGNANT) |
| GET | `/api/signalements` | Liste |
| GET | `/api/maintenances` | Interventions correctives |
| POST | `/api/maintenances` | Démarrer intervention (TECHNICIEN) |
| PUT | `/api/maintenances/:id` | Cloturer |

## Maintenance préventive

| Méthode | Endpoint |
|---|---|
| GET | `/api/preventif` |
| POST | `/api/preventif` |
| GET | `/api/preventif/calendrier` |

## Stock / Pièces

| Méthode | Endpoint |
|---|---|
| GET | `/api/stock` |
| POST | `/api/stock` |
| POST | `/api/stock/:id/mouvement` |
| GET | `/api/stock/alertes` |

## CoDIR / Rapports

| Méthode | Endpoint |
|---|---|
| GET | `/api/codir` |
| POST | `/api/codir/generer` |
| GET | `/api/codir/:id/export?format=xlsx\|pdf` |

## Dashboard & statistiques

| Méthode | Endpoint |
|---|---|
| GET | `/api/dashboard` |
| GET | `/api/statistiques/kpis` |
| GET | `/api/statistiques/tendance-disponibilite` |

## Alertes / Notifications

| Méthode | Endpoint |
|---|---|
| GET | `/api/alertes` |
| PUT | `/api/alertes/:id/resoudre` |

## Logs d'audit (ADMIN)

| Méthode | Endpoint |
|---|---|
| GET | `/api/logs?page=1&limit=50&entite=equipements&utilisateurId=3` |

## Healthcheck

```http
GET /api/health
```

```json
{
  "status": "OK",
  "uptime": 3422.1,
  "version": "2.1.0",
  "db": { "status": "OK", "latencyMs": 12 },
  "memory": { "rssMb": 142.3, "heapUsedMb": 88.7 }
}
```

## Codes erreur

| Code | Signification |
|---|---|
| 400 | Validation échouée |
| 401 | Token manquant/invalide |
| 403 | Rôle insuffisant |
| 404 | Ressource introuvable |
| 429 | Rate-limit dépassé |
| 500 | Erreur serveur |
| 503 | DB indisponible |

## Socket.IO (temps réel)

URL: même que API. Auth par `socket.handshake.auth.token`.

Events émis serveur → client:
- `notification` (privé via room `user_:id`)
- `alert:critical`, `alert:new` (room `role_TECHNICIEN`)
- `intervention:updated`, `intervention:completed`
- `stock:alert`
- `signalement:received`

Events client → serveur:
- `join-room`, `leave-room`
- `intervention:start`, `intervention:complete`
- `signalement:new`
- `message:private`, `message:room`
