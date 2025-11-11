# Xawery - E-commerce Demo with Feature Flags

A full-stack e-commerce demo showcasing **parametrized products** and **feature-flag–driven behavior** using Angular, Node.js, PostgreSQL, and LaunchDarkly.

## Tech Stack

- **Frontend**: Angular with Material UI _(coming soon)_
- **Backend**: Node.js (Express) + Prisma ORM
- **Database**: PostgreSQL 16
- **Authentication**: JWT with Argon2 password hashing
- **Validation**: Zod schemas
- **API Documentation**: Swagger/OpenAPI 3.0
- **Feature Flags**: LaunchDarkly
- **Testing**: Vitest (unit/integration), Playwright (E2E)
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
JWT_SECRET=your-jwt-secret-here
LD_SDK_KEY=your-launchdarkly-server-key
LD_CLIENT_KEY=your-launchdarkly-client-key
USE_FLAG_STUBS=false
```

#### Generating JWT_SECRET

**On Windows (PowerShell):**

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**On macOS/Linux:**

```bash
openssl rand -base64 32
```

Copy the output and use it as your `JWT_SECRET` value in `.env`.

#### Getting LaunchDarkly Keys

1. Sign up for a free account at [launchdarkly.com](https://launchdarkly.com)
2. Create a new project (e.g., "Xawery Demo")
3. Go to **Account settings → Projects → [Your Project] → Environments**
4. Select your **Development** environment
5. Copy the keys:
   - **SDK key** → use as `LD_SDK_KEY` (for server-side - keep secret!)
   - **Client-side ID** → use as `LD_CLIENT_KEY` (for frontend - safe to expose)

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
# Start API server
pnpm dev:api
```

The API will be available at:

- **API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **OpenAPI JSON**: http://localhost:3000/api-docs.json
- **Health Check**: http://localhost:3000/health

## Available Scripts

### Development

- `pnpm dev:api` - Start API server with hot reload
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all code
- `pnpm format` - Format code with Prettier

### Testing

- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:ui` - Open Vitest UI
- `pnpm test:coverage` - Generate coverage report

### Database

- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed database with sample data
- `pnpm db:studio` - Open Prisma Studio

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info (requires auth)

### Users (Admin only)

- `GET /users` - List all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create a new user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Products

- `GET /products` - Search and list products (public, with pagination)
- `GET /products/:id` - Get product by ID (public)
- `POST /products` - Create product (Manager/Admin only)
- `PUT /products/:id` - Update product (Manager/Admin only)
- `DELETE /products/:id` - Delete product (Admin only)

### Health

- `GET /health` - API health check with database status

Visit [http://localhost:3000/api-docs](http://localhost:3000/api-docs) for interactive API documentation.

## Development Workflow

1. Make focused changes
2. Write tests for new features
3. Add Swagger documentation for new endpoints
4. Run `pnpm test` to verify tests pass
5. Run `pnpm format` to format code
6. Commit with conventional commit messages

See [PLAN.md](./PLAN.md) for the detailed implementation plan and architecture.

## License

MIT
