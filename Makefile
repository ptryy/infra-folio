-include .env
export

.PHONY: dev minio-up minio-down tunnel \
        media-upload media-pull og-gen og-purge \
        build preview \
        deploy deploy-site deploy-og deploy-api rollback \
        promote logs status r2-sync \
        _dev-astro _dev-og _dev-api \
        _logs-site _logs-og _logs-api

# ── Dev ──────────────────────────────────────────────────────────────────────────────
dev: minio-up
	$(MAKE) -j3 _dev-astro _dev-og _dev-api

_dev-astro:
	pnpm dev

_dev-og:
	cd workers/og && pnpm exec wrangler dev --port 8788

_dev-api:
	cd workers/api && pnpm exec wrangler dev --port 8787

minio-up:
	docker compose -f infra/docker-compose.yml up -d
	bash infra/minio-init.sh

minio-down:
	docker compose -f infra/docker-compose.yml down

tunnel:
	pnpm exec wrangler tunnel run

# ── Media ────────────────────────────────────────────────────────────────────────────
media-upload:
	mc cp --recursive $(SRC) $(MINIO_ALIAS)/infra-folio-media/

media-pull:
	mc cp --recursive $(MINIO_ALIAS)/infra-folio-media/ $(SRC)

og-gen:
	@echo "Pre-warming OG images..."
	@find src/content/blog src/content/projects -name "*.mdx" 2>/dev/null | while read f; do \
		slug=$$(basename "$$f" .mdx); \
		dir=$$(basename $$(dirname "$$f")); \
		type=$$([ "$$dir" = "blog" ] && echo blog || echo project); \
		curl -sf "https://og.$(DOMAIN)/og?type=$$type&slug=$$slug" > /dev/null && echo "Warmed $$type/$$slug"; \
	done

og-purge:
	pnpm exec wrangler r2 object delete infra-folio-media "og/blog-$(SLUG).png" 2>/dev/null || true
	pnpm exec wrangler r2 object delete infra-folio-media "og/project-$(SLUG).png" 2>/dev/null || true
	@echo "Purged OG cache for slug: $(SLUG)"

# ── Build & Preview ──────────────────────────────────────────────────────────────────────────
build:
	pnpm build

preview: minio-up build
	pnpm exec wrangler dev

# ── Deploy ────────────────────────────────────────────────────────────────────────────
deploy: deploy-og deploy-api deploy-site

deploy-site: build
	pnpm exec wrangler deploy

deploy-og:
	cd workers/og && pnpm exec wrangler deploy

deploy-api:
	cd workers/api && pnpm exec wrangler deploy

rollback:
	pnpm exec wrangler rollback || true
	cd workers/og && pnpm exec wrangler rollback || true
	cd workers/api && pnpm exec wrangler rollback || true

# ── Promote ───────────────────────────────────────────────────────────────────────────
promote:
	@if [ "$(ENV)" = "prod" ]; then \
		$(MAKE) deploy && $(MAKE) og-gen && $(MAKE) status; \
	elif [ "$(ENV)" = "staging" ]; then \
		WRANGLER_ENV=staging $(MAKE) deploy; \
	else \
		echo "Usage: make promote ENV=staging|prod"; exit 1; \
	fi

# ── Ops ──────────────────────────────────────────────────────────────────────────────
logs:
	$(MAKE) -j3 _logs-site _logs-og _logs-api

_logs-site:
	pnpm exec wrangler tail

_logs-og:
	cd workers/og && pnpm exec wrangler tail

_logs-api:
	cd workers/api && pnpm exec wrangler tail

status:
	@curl -sf "https://api.$(DOMAIN)/status" | python3 -m json.tool

r2-sync:
	mc mirror $(MINIO_ALIAS)/infra-folio-media/ r2/infra-folio-media/
