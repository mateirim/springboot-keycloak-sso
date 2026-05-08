# springboot-keycloak-sso (Light)

[![Kotlin](https://img.shields.io/badge/Kotlin-2.1-7F52FF?logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5-6DB33F?logo=springboot&logoColor=white)](https://spring.io)
[![Keycloak](https://img.shields.io/badge/Keycloak-26-4D9EB8?logo=keycloak&logoColor=white)](https://keycloak.org)
[![Status](https://img.shields.io/badge/Status-v1.1.0--Light-blue)](https://github.com/mateirim/springboot-keycloak-sso)

A **minimalist, Zero-Database SSO Template** featuring **Spring Boot 3.5**, **Kotlin 2.1**, and **Keycloak 26**. This branch provides a "plug-and-play" reference for core identity management and secure OIDC integration without any external database dependencies.

> [!NOTE]
> This is the **Light** version of the template. For the full-featured version (including GridFS file management, MongoDB persistence, and social discovery), switch to the [`main`](../../tree/main) branch.

## Features

- **Zero Database Dependency**: No MongoDB or SQL required. User identity is managed entirely via JWT claims.
- **Kotlin 2.1 & Spring Boot 3.5**: Type-safe, high-performance identity backend.
- **Keycloak 26 Integration**: Hardened OIDC / OAuth2 authentication.
- **BFF Pattern**: Secure session-based auth for Single Page Applications.
- **Modern UI**: Angular 18 Material dashboard focused on profile visualization.

## Quick Start

```bash
git clone https://github.com/mateirim/springboot-keycloak-sso
cd springboot-keycloak-sso

docker compose up
# Only Keycloak and the App will start.
```

**Access:**
- App: [http://localhost:8080](http://localhost:8080)
- Keycloak admin: [http://localhost:8180/admin](http://localhost:8180/admin) (admin/admin)

## API

All endpoints require authentication. Health check is public.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check (no auth) |
| `GET` | `/api/user/info` | Current user profile + roles (extracted from JWT) |

## Role-Based Access Control (RBAC)

Identity and roles are extracted directly from the Keycloak JWT:

| Role | Access |
|------|--------|
| **reader** | Standard profile access |
| **administrator** | Elevated identity permissions |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KEYCLOAK_CLIENT_ID` | `springboot-app` | OAuth2 client ID |
| `KEYCLOAK_CLIENT_SECRET` | - | OAuth2 client secret |
| `KEYCLOAK_ISSUER_URI` | - | Keycloak realm endpoint (public URL) |
| `CORS_ALLOWED_ORIGINS` | `https://app.example.com` | Production CORS origins |

## Deployment

### Docker
```bash
make build    # Build the minimal app image
make up       # Start Keycloak + App
```

### Kubernetes
See [k8s/](k8s/) for minimal manifests. The `light` version requires significantly fewer resources and no PersistentVolumeClaims.

## License
MIT — See [LICENSE](LICENSE) for details.

## Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Spring Boot 3.5, Kotlin 2.1 |
| **Frontend** | Angular 18, Angular Material |
| **Auth (IDP)** | Keycloak 26 (Hardened Config) |
| **DevOps** | Docker, Kubernetes (StatefulSet) |

## Contributing
Contributions welcome! See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## Security
For vulnerability reporting, see [SECURITY.md](docs/SECURITY.md).
