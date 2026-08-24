.PHONY: build run up down logs

build:
	docker build -t academia-paygas:latest .

run:
	docker run -p 3001:3001 --env-file .env --rm academia-paygas:latest

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f app
