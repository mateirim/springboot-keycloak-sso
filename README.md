# springboot-keycloak-sso

[![Kotlin](https://img.shields.io/badge/Kotlin-2.1-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io)
[![Keycloak](https://img.shields.io/badge/Keycloak-26-4D9EB8?logo=keycloak&logoColor=white)](https://keycloak.org)
[![Status](https://img.shields.io/badge/Status-v1.0.0--Stable-blue)](https://github.com/mateirim/springboot-keycloak-sso)

A high-performance, **Production-Grade SSO Template** featuring **Spring Boot 3.5**, **Kotlin 2.1**, and **Keycloak 26**. This repository provides a reference architecture for a full-stack dashboard with real-time user discovery, GridFS file sharing, and hardened IDP integration.

![Showcase](docs/media/showcase.webp)

> [!TIP]
> **Looking for a minimal template?** Check out the [`light`](../../tree/light) branch for a streamlined version featuring only core SSO / Identity management (zero-database dependency).

> **Evaluation Mode**: `docker compose up` → [http://localhost:8080](http://localhost:8080)

## Features

- **Kotlin 2.1 & Spring Boot 3.5**: Type-safe, high-performance backend.
- **Keycloak 26 Integration**: Hardened OIDC / OAuth2 identity management.
- **BFF Pattern**: Secure session-based auth for the SPA.
- **Dual Auth Flows**: Browser (Session) and API (Stateless JWT) support.
- **GridFS Storage**: Scalable, multi-user file sharing and permissions.
- **Modern UI**: Angular 18 Material dashboard with MapLibre.

## Quick Start

```bash
git clone https://github.com/mateirim/springboot-keycloak-sso
cd springboot-keycloak-sso

docker compose up
# Wait ~30s for all services to be healthy
```

**Access:**
- App: [http://localhost:8080](http://localhost:8080)
- Keycloak admin: [http://localhost:8180/admin](http://localhost:8180/admin) (admin/admin)
- MongoDB: `mongodb://admin:password@localhost:27017`

**Test login:**
1. Go to Keycloak admin → master realm → Users → Create user
2. Set username (e.g., `testuser`), enable user
3. Credentials tab → set password (temporary: off)
4. Open [http://localhost:8080](http://localhost:8080) → login
5. App auto-initializes with sample locations

## Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — OAuth2 flows, token lifecycle, security chains
- **[SECURITY.md](docs/SECURITY.md)** — Vulnerability reporting, hardening gaps, best practices
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** — How to contribute, code style, testing

## API

All endpoints require authentication (Bearer token or session cookie). Health check is public.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/user/info` | Current user profile + roles |
| `POST` | `/api/user/reset` | Delete all user data |
| `GET` | `/api/locations` | List locations |
| `GET` | `/api/favourites` | User's favorite locations |
| `POST` | `/api/favourites` | Add favorite |
| `DELETE` | `/api/favourites/{id}` | Remove favorite |
| `GET` | `/api/files` | List user's files (GridFS) |
| `POST` | `/api/files` | Upload file (max 500MB) |
| `GET` | `/api/files/{id}` | Download file |
| `POST` | `/api/files/{id}/share` | Share file with another user |
| `DELETE` | `/api/files/{id}` | Delete file |
| `GET` | `/api/social/users` | App users (excluding self) |
| `GET` | `/api/social/friends` | User's friends |
| `POST` | `/api/social/friends` | Add friend |
| `DELETE` | `/api/social/friends/{id}` | Remove friend |

## Role-Based Access Control (RBAC)

Three roles control what users can do in the app:

| Role | Permissions | Keycloak Setup |
|------|-------------|-----------------|
| **reader** | Login, view locations, download files | Add `reader` role in Keycloak realm |
| **contributor** | Upload files, add favorites, share files, add friends | Add `contributor` role |
| **administrator** | Full access including delete files and reset user data | Add `administrator` role |

**Backend enforcement**: Role checks on `/api/files` POST (upload) and DELETE endpoints return `403 Forbidden` for unauthorized roles.

**Frontend UX**: Upload button disabled for readers, delete button hidden for non-admins.

**Setup**: In Keycloak admin console:
1. Realm → Roles → Create role (`reader`, `contributor`, `administrator`)
2. Users → Select user → Role Mappings → Assign role from dropdown

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_CLIENT_ID` | `springboot-app` | OAuth2 client ID |
| `KEYCLOAK_CLIENT_SECRET` | - | OAuth2 client secret |
| `KEYCLOAK_ISSUER_URI` | - | Keycloak realm endpoint (public URL) |
| `KEYCLOAK_SERVER_URL` | `http://keycloak.keycloak.svc.cluster.local` | Internal Keycloak URL (Port 80) |
| `KEYCLOAK_REALM` | `master` | Keycloak realm for authentication |
| `MONGO_URI` | `mongodb://localhost:27017/app_db` | MongoDB connection string |
| `CORS_ALLOWED_ORIGINS` | `https://app.example.com` | Production CORS origins |

See `.env.example` for the full template.

### Storage

**MongoDB collections:**
- `users` — Synced from Keycloak on login
- `locations` — Sample data (auto-loads if empty)
- `favourites` — User's favorite locations (indexed by userId)
- `friends` — User connections
- `fs.files` / `fs.chunks` — GridFS file storage

Sample data auto-initializes on first run if collections are empty.

## Load Testing

```bash
# Run with k6 (auto-generates tokens, 10 VUs, 2 min)
k6 run k6/load.js
```

**Expected results (docker-compose):**
```
p(95): 16.66ms ✓
p(99): 17.78ms ✓
Error rate: 0% ✓
Requests: 1,536 / 1,536 ✓
```

## Development

### Backend

```bash
cd app
mvn clean package -DskipTests
java -jar target/springboot-keycloak-sso-1.0.jar
```

Requires: MongoDB 7, Keycloak 26 running, `KEYCLOAK_*` env vars set.

### Frontend

```bash
cd frontend
npm ci
ng serve
# Open http://localhost:4200
```

## Deployment

### Docker

**Local Build & Run**:
```bash
make build    # Build the app image (multi-stage)
make up       # Start the full stack
```

**Registry Push**:
```bash
# Builds and pushes to registry.example.com by default
make push REGISTRY=your-registry.com TAG=v1.0.0
```

### Kubernetes (Production)
See [k8s/](k8s/) for StatefulSet, Ingress, and secret management manifests.

For a full GitOps deployment with Helm/Kustomize, refer to the [homelab-infra](https://github.com/mateirim/homelab-infra) repository.


## Troubleshooting

### 502 Bad Gateway
**Check:** Is the app healthy?
```bash
docker compose logs app
# or
kubectl logs -f statefulset/springboot-app -n apps
```

**Fix:** Verify `KEYCLOAK_ISSUER_URI` is reachable, increase `startupProbe.initialDelaySeconds`

### Login redirect loop
**Check:** Does issuer URL match Keycloak realm?
```bash
curl -s https://keycloak.example.com/realms/master/.well-known/openid-configuration | jq .issuer
```

**Fix:** Ensure trailing slash, realm name matches exactly

### Files not uploading
**Check:** Is `proxy-body-size` large enough?
```yaml
# ingress.yaml
nginx.ingress.kubernetes.io/proxy-body-size: "500m"
```

**Fix:** Also ensure pod memory is 2Gi+ (see `k8s/statefulset.yaml`)

## Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Spring Boot 3.5, Kotlin 2.1 |
| **Frontend** | Angular 18, Angular Material |
| **Auth (IDP)** | Keycloak 26 (Hardened Config) |
| **Database** | MongoDB 7, GridFS Storage |
| **DevOps** | Docker, Kubernetes (StatefulSet) |

## License

MIT — See [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## Security

For vulnerability reporting, see [SECURITY.md](docs/SECURITY.md).
