# Contributing to Smart Store POS

Thank you for your interest in contributing to Smart Store POS. This document outlines the process for proposing changes, reporting bugs, and submitting pull requests.

## Code of Conduct

All contributors and maintainers are expected to abide by our Code of Conduct. Please review `CODE_OF_CONDUCT.md` before participating in this project.

## How to Contribute

### 1. Reporting Bugs

Before reporting a new bug:
- Search existing GitHub issues to verify that the problem has not already been reported.
- Ensure that the problem is reproducible on current versions of the codebase.

When filing a bug report:
- Use the Bug Report issue template.
- Provide clear steps to reproduce, expected results, actual results, and relevant logs or screenshots.
- Mention your environment details (OS, browser, Node version, and printer model if relevant).

### 2. Suggesting Features

- Open an issue using the Feature Request template.
- Clearly describe the use case, the business workflow, and the proposed technical implementation.
- Discuss the feature with the maintainers before submitting large pull requests to ensure alignment with project roadmap.

### 3. Submitting Pull Requests

1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Adhere to the established branch naming conventions:
   - `feature/description` for new functionality
   - `fix/description` for bug fixes
   - `refactor/description` for code improvements
   - `docs/description` for documentation changes
3. Ensure all dependencies and builds pass without errors before pushing.
4. Open a pull request using the provided pull request template.

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Docker and Docker Compose (recommended for local PostgreSQL and Redis)
- Go >= 1.20 (only required if modifying `local-agent`)

### Local Environment with Docker

The fastest way to spin up the local environment:

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`
- Express Backend on port `5000`
- React Frontend on port `5173`

### Manual Component Setup

#### Backend

```bash
cd backend
npm install
cp .env.example .env # configure your DATABASE_URL and REDIS_URL
npm run db:migrate   # apply schema migrations
npm run dev          # starts server on port 5000 with nodemon
```

#### Frontend

```bash
cd frontend
npm install
npm run dev          # starts Vite development server on port 5173
```

#### Print Agent (Go)

```bash
cd local-agent
go run main.go print_other.go # on Linux/macOS
# or on Windows:
go run main.go print_windows.go
```

## Coding Standards

### TypeScript Guidelines

- Strict mode is enforced. Do not use implicit `any`.
- Avoid type assertions (`as any`). When escaping types is necessary, use `as unknown as T` with an explanatory comment.
- Prefer `interface` for extensible object structures and `type` for unions, intersections, and primitives.
- All function signatures must have explicit parameter and return types.

### Naming Conventions

- Files: `kebab-case` (e.g., `product-service.ts`, `receipt-modal.tsx`)
- Variables and functions: `camelCase` (e.g., `totalAmount`, `createSale`)
- Classes, interfaces, types, components: `PascalCase` (e.g., `SaleResponse`, `ProductCard`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_OTP_ATTEMPTS`)
- Database tables and columns: `snake_case` (e.g., `stock_movements`, `unit_price`)

### Architecture Rules

- Controllers only handle HTTP concerns: parse requests, call one service method, and respond.
- Services house business logic and transaction management.
- Repositories interact directly with Drizzle ORM and PostgreSQL.
- Frontend follows feature-based organization (`features/sales`, `features/inventory`, etc.) with TanStack Query managing server state.

## Commit Guidelines

Use descriptive commit messages following the Conventional Commits specification:

- `feat: add split payment support for walk-in sales`
- `fix: resolve spooler queue deadlock on thermal printer`
- `docs: update deployment and environment documentation`
- `refactor: extract receipt formatting logic to dedicated helper`
- `chore: update dependencies and Docker base images`

## Licensing

By contributing to Smart Store POS, you agree that your contributions will be licensed under the Apache License 2.0.
