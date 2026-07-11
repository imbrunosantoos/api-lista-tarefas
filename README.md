# Task List API

A REST API for managing personal to-do lists, built with NestJS, Prisma and SQLite.

I built this project to practice what a real backend needs beyond the basic CRUD: authentication, data isolation between users, request validation, automated tests and proper API documentation.

[![CI](https://github.com/imbrunosantoos/api-lista-tarefas/actions/workflows/ci.yml/badge.svg)](https://github.com/imbrunosantoos/api-lista-tarefas/actions/workflows/ci.yml)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

Users create an account and log in to receive a pair of tokens: a short-lived access token and a refresh token that can be exchanged for a new pair (with rotation — a used refresh token is immediately revoked). With the access token they manage their own task list: create tasks with priority and due date, search by title, filter by status or priority, sort, paginate, update and delete. A user can never see or touch another user's tasks — the API returns 404 even if the task id exists.

Tasks move between three statuses (`PENDING`, `IN_PROGRESS`, `DONE`) and carry a priority (`LOW`, `MEDIUM`, `HIGH`).

On the security side: passwords are hashed with bcrypt, auth endpoints are rate limited against brute force, and the app ships with helmet and configurable CORS.

## Documentation

The whole API is documented with Swagger. Run the project and open `http://localhost:3000/docs`:

![Swagger UI overview](docs/screenshots/swagger-overview.png)

Log in through `POST /auth/login`, copy the `accessToken` and click the Authorize button to use the protected endpoints directly from the browser:

![Login endpoint](docs/screenshots/swagger-login.png)

## Endpoints

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/` | Health check | No |
| POST | `/auth/register` | Create an account | No |
| POST | `/auth/login` | Log in and receive access + refresh tokens | No |
| POST | `/auth/refresh` | Exchange a refresh token for a new pair | No |
| POST | `/auth/logout` | Revoke a refresh token | No |
| GET | `/users/me` | Current user profile | Yes |
| POST | `/tasks` | Create a task | Yes |
| GET | `/tasks` | List tasks (`?status=&priority=&search=&sortBy=&order=&page=&limit=`) | Yes |
| GET | `/tasks/:id` | Get a task | Yes |
| PATCH | `/tasks/:id` | Update a task | Yes |
| DELETE | `/tasks/:id` | Delete a task | Yes |

Example with curl:

```bash
# create an account
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bruno","email":"bruno@example.com","password":"secret123"}'

# log in
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bruno@example.com","password":"secret123"}' | jq -r .accessToken)

# create and list tasks
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Buy groceries","priority":"HIGH","dueDate":"2026-08-01T12:00:00.000Z"}'

curl "http://localhost:3000/tasks?search=groceries&sortBy=dueDate&order=asc" \
  -H "Authorization: Bearer $TOKEN"
```

## How the data is organized

Three tables cover everything. A `users` table with name, unique email and the bcrypt-hashed password; a `tasks` table where each task has a title, optional description, status, priority and optional due date; and a `refresh_tokens` table that stores only the SHA-256 hash of each refresh token, with its expiry and revocation timestamps. Every task and token belongs to a user, and deleting a user removes them along with it.

## Running locally

You only need Node.js 20+. I chose SQLite on purpose so the project runs with zero setup — no Docker, no database server.

```bash
git clone https://github.com/imbrunosantoos/api-lista-tarefas.git
cd api-lista-tarefas
npm install

cp .env.example .env   # set your own JWT_SECRET

npx prisma migrate dev
npm run start:dev
```

The API starts at `http://localhost:3000` and the docs at `http://localhost:3000/docs`.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | SQLite connection string | `file:./dev.sqlite` |
| `JWT_SECRET` | Secret used to sign access tokens | required |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Refresh token lifetime in days | `7` |
| `CORS_ORIGIN` | Allowed CORS origin | `*` |
| `PORT` | HTTP port | `3000` |

### Running with Docker

```bash
JWT_SECRET=your-secret docker compose up --build
```

The compose file builds the image, applies the migrations on startup and keeps the SQLite file on a named volume, so data survives container restarts.

## Tests

Over 50 tests in two layers, and both run on every push through GitHub Actions (along with lint, build and a Docker image build).

The 31 end-to-end tests cover registration, login, token refresh and rotation, logout, the whole task CRUD and the edge cases that matter: invalid payloads, missing tokens, duplicated emails and one user trying to access another user's tasks. They run against a separate SQLite database recreated on every run. The 22 unit tests exercise the auth and tasks services in isolation with a mocked database layer.

```bash
npm test          # unit tests
npm run test:e2e  # end-to-end tests
```

## Stack

- [NestJS](https://nestjs.com/) with TypeScript
- [Prisma](https://www.prisma.io/) as the ORM, with SQLite
- [Passport](https://www.passportjs.org/) + JWT for authentication, bcrypt for password hashing
- class-validator for request validation
- @nestjs/throttler for rate limiting, helmet for security headers
- Swagger (OpenAPI) for documentation
- Jest + Supertest for the test suite
- GitHub Actions for CI, Docker for containerized runs

## Project structure

```
src/
├── auth/          # register, login, refresh/logout, JWT strategy and guard
├── users/         # user service and profile endpoint
├── tasks/         # task CRUD: controller, service, DTOs
├── prisma/        # PrismaService + global module
├── docs/          # custom Swagger UI theme
├── app.module.ts
└── main.ts        # bootstrap, security, validation pipe, Swagger setup
prisma/            # schema and migrations
test/              # e2e suites (auth, users, tasks)
.github/workflows/ # CI: lint, build, tests and Docker image
Dockerfile         # multi-stage production build
docker-compose.yml
```

## License

[MIT](LICENSE) — Bruno Santos
