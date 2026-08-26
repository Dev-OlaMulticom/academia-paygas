.PHONY: build run up pull down logs

build:
	docker build -t academia-paygas:latest .

run:
	docker run -p 3001:3001 --env-file .env --rm academia-paygas:latest

up:
	docker compose up -d

# Deploy en el servidor: trae la imagen publicada por CI (GHCR)
pull:
	docker compose pull && docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f app
