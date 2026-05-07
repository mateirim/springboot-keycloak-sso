REGISTRY   := registry.example.com
IMAGE      := $(REGISTRY)/springboot-keycloak-sso
TAG        ?= latest

.PHONY: up down build logs push deploy restart test-smoke test-load clean

# Local dev
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build --no-cache

logs:
	docker compose logs -f app

# Registry
push:
	docker build -t $(IMAGE):$(TAG) .
	docker push $(IMAGE):$(TAG)

# Kubernetes (apps namespace, app.example.com)
deploy:
	kubectl apply -f k8s/
	kubectl rollout status statefulset/springboot-app -n apps

restart:
	kubectl rollout restart statefulset/springboot-app -n apps
	kubectl rollout status statefulset/springboot-app -n apps

# k6 tests — requires k6 installed: https://k6.io/docs/get-started/installation/
test-smoke:
	k6 run k6/smoke.js

test-load:
	@echo "Usage: make test-load K6_TOKEN=<bearer_token>"
	K6_TOKEN=$(K6_TOKEN) k6 run k6/load.js

clean:
	docker compose down -v --remove-orphans
