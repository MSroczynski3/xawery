# Xawery - E-commerce Demo with Feature Flags

A full-stack e-commerce demo showcasing **parametrized products** and **feature-flag–driven behavior** using Angular, Node.js, PostgreSQL, and LaunchDarkly.

## Tech Stack

- **Frontend**: Angular with Material UI
- **Backend**: Node.js (Express/NestJS) + Prisma ORM
- **Database**: PostgreSQL 16
- **Feature Flags**: LaunchDarkly
- **Testing**: Playwright E2E
- **Monorepo**: pnpm workspaces

## Project Structure

```
/
├── apps/
│   ├── api/          # Node.js backend
│   └── web/          # Angular frontend
├── packages/
│   ├── shared/       # Shared DTOs and types
│   └── flag-stubs/   # Test flag server
├── prisma/           # Database schema and migrations
└── playwright/       # E2E tests
```

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- Docker Desktop (for local PostgreSQL)
- LaunchDarkly account (free tier available)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Create a `.env` file in the root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demo
JWT_SECRET=your-dev-secret
LD_SDK_KEY=your-launchdarkly-server-key
LD_CLIENT_KEY=your-launchdarkly-client-key
USE_FLAG_STUBS=false
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start development servers

```bash
# Start both API and web
pnpm dev

# Or separately:
pnpm dev:api
pnpm dev:web
```

## Available Scripts

- `pnpm dev` - Start all development servers
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run all tests
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:studio` - Open Prisma Studio

## Development Workflow

See [PLAN.md](./PLAN.md) for the detailed implementation plan and architecture.

## License

MIT
