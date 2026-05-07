# Contributing

Contributions are welcome. This project focuses on essential SSO patterns — fix real problems, keep the footprint small.

## Quick start

```bash
git clone https://github.com/{GITHUB_USER}/springboot-keycloak-sso
cd springboot-keycloak-sso
cp .env.example .env   # fill in your values
make up                # starts MongoDB + Keycloak + app
```

The app is at `http://localhost:8080`. The Keycloak admin console is at `http://localhost:8080/keycloak` (admin/admin in dev mode).

## Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Spring Boot 3.5, Java 21          |
| Frontend   | Angular 18, Angular Material      |
| Auth       | Keycloak 26, OAuth2 + JWT         |
| Database   | MongoDB 7                         |
| Map        | MapLibre GL JS + OpenStreetMap    |
| Container  | Docker (multi-stage), Kubernetes  |

## What belongs here

- Bug fixes for the SSO/auth flow
- Improvements to the location map or data table
- Security hardening (see [SECURITY.md](SECURITY.md))
- Documentation improvements
- Kubernetes/deployment patterns (see [homelab-infra](https://github.com/mateirim/homelab-infra) for full k8s setup)

## What doesn't belong

- New application features unrelated to demonstrating SSO patterns
- Third-party auth providers beyond Keycloak (open an issue to discuss first)
- Breaking changes to the public API contract without a migration path

## Workflow

1. Fork and create a branch: `git checkout -b fix/my-fix`
2. Make your change. Keep commits focused — one logical change per commit.
3. Test locally with `make up` and verify the auth flow end-to-end.
4. Open a pull request with a clear description of the problem and solution.

## Code style

- **Kotlin**: standard Spring Boot conventions, no Lombok
- **TypeScript**: strict mode, `takeUntil(destroy$)` for all subscriptions, no `window.location.reload()`
- **No inline comments** explaining what code does — rename instead

## Running tests

```bash
# Smoke test (requires running stack + k6)
make test-smoke

# Load test (requires a valid bearer token)
make test-load K6_TOKEN=<token>
```

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting and known hardening gaps.
