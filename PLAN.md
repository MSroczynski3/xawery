# E‑commerce Demo with Feature Flags — Architecture & Granular Implementation Plan

This document is the living blueprint for your demo (Angular + Node + Postgres) showcasing **parametrized products** and **feature-flag–driven behavior** with LaunchDarkly. It’s structured for **small, focused commits** so you can learn each layer deeply while keeping the repo tidy.

---

## 1) Visual Architecture Diagram

```mermaid
flowchart LR
  subgraph Client[Angular SPA]
    UI[Components\n(Material)]
    SVC[Services\nHttpClient]
    LDJS[LD JS SDK\n(non-sensitive flags)]
    SVC-->API
    UI-->LDJS
  end

  subgraph Server[Node Backend]
    direction TB
    A[API Layer\n(Express or NestJS)]
    AUTH[Auth & RBAC\n(JWT, roles)]
    VAL[Validation\n(Zod/Pipes)]
    LD[LaunchDarkly Node SDK\n(server-side gating)]
    SVCB[Domain Services]
    ORM[(Prisma Client)]

    A-->AUTH
    A-->VAL
    A-->LD
    A-->SVCB
    SVCB-->ORM
    LD-->A
  end

  subgraph DB[(Postgres)]
    T1[(users)]
    T2[(products)]
    T3[(product_options)]
    T4[(option_values)]
    T5[(variants)]
    JV[(variant_option_values)]
  end

  subgraph Test[Playwright]
    E2E[E2E Specs]
    STUB[Flag Stub Server\n(/features overrides)]
    E2E-->Client
    E2E-->Server
    E2E-->STUB
  end

  API{{/api/*}} --> Server
  Server --> DB
  Client -- JWT --> API
```

> **Key rule**: _All sensitive gating happens on the server via LaunchDarkly Node SDK_. The UI reads client-safe flags only for visibility/UX.

---

## 2) Repo Layout (Monorepo)

```
/ (root)
  package.json, pnpm-workspace.yaml
  /apps
    /api       # Node backend (Express or NestJS) + Prisma + Swagger
    /web       # Angular
  /packages
    /shared    # shared DTOs, types, Zod schemas
    /flag-stubs # tiny express server exposing /features for tests
  /prisma     # schema.prisma, migrations, seed.ts
  /playwright # e2e tests, fixtures, utils
  docker-compose.yml
```

> You can choose **Express** (minimal) or **NestJS** (deeper architecture). This plan calls out both where they differ.

---

## 3) Environments & Secrets

**.env (dev)**

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/demo
JWT_SECRET=devsecret
LD_SDK_KEY=your-ld-server-key
LD_CLIENT_KEY=your-ld-client-key
USE_FLAG_STUBS=false
```

**docker-compose.yml**

- Postgres 16 with healthcheck and volume
- (Optional later) LD Relay

---

## 4) Granular Implementation Plan (Commit-by-Commit)

Each step below is a **single, focused commit** (or a tiny set). Suggested conventional commit headers are included.

### Milestone A — Project Scaffolding & Tooling

1. **chore(repo): init pnpm workspace + root config**
   - Add `pnpm-workspace.yaml`, root `package.json` with scripts.
   - Configure ESLint + Prettier (root-level ignore files).

2. **chore(db): docker-compose for Postgres 16 + healthcheck**
   - `docker-compose.yml` with port 5432, named volume.

3. **chore(prisma): add schema.prisma + generator + datasource**
   - Minimal models: `User`, `Product` (no variants yet).
   - Run `prisma migrate dev --name init`.

4. **docs: add ADR-0001 choose Express vs NestJS**
   - Short Architecture Decision Record. If you pick NestJS: note DI, modules, testing benefits.

### Milestone B — Backend Core (Auth + Users + Products)

> **Choose your backend flavor:**
>
> - **Express**: create `apps/api/src/index.ts`, route files, DI via simple factories.
> - **NestJS**: `nest new api`, create Modules (Auth, Users, Products, Flags), Providers, Controllers.

5. **feat(api): bootstrap server & health endpoint**
   - `/health` returns `{status:"ok"}`.
   - Add request logging (morgan or Nest interceptor).

6. **feat(api): prisma client + db connection lifecycle**
   - Add a singleton Prisma client, graceful shutdown hooks.

7. **feat(api): Zod validation + error mapper**
   - Central error handler → `400` for validation, `401/403` for auth, `409` for conflicts.

8. **feat(auth): password hashing + JWT issue/verify**
   - `POST /auth/register`, `POST /auth/login`, `GET /auth/me`.
   - Use `argon2` or `bcrypt`.

9. **feat(users): user CRUD (ADMIN only)**
   - `GET /users`, `GET /users/:id`, `POST`, `PUT`, `DELETE`.
   - Add `requireRole('ADMIN')` guard (Express middleware or Nest Guard).

10. **feat(products): product CRUD + basic search**
    - `GET /products?q=&active=&page=`.
    - Unique `slug`, indexes on `(active, name)`.

11. **docs(openapi): swagger for all MVP routes**
    - Express: `swagger-ui-express` + `openapi.json`.
    - Nest: `@nestjs/swagger` decorators.

12. **chore(seed): seed users (ADMIN/MANAGER/VIEWER) + sample products**
    - `prisma db seed` script.

### Milestone C — Feature Flags Infrastructure

13. **feat(flags): integrate LaunchDarkly Node SDK**
    - Initialize SDK with `LD_SDK_KEY`.
    - Build per-request LD context from JWT (`{ key: userId, email, role }`).

14. **feat(flags): server-side gating helper + middleware**
    - `requireFlag('product-variants')` → 403 with error shape.

15. **feat(flags): GET /features (server-evaluated)**
    - Returns a map of evaluated flags for current user.

16. **test(flags): flag stub server for e2e**
    - `/features` returns overrides from JSON or env.
    - Toggle with `USE_FLAG_STUBS=true`.

### Milestone D — Parametrized Products Domain (Variants)

17. **feat(db): add ProductOption, OptionValue, Variant, VariantOptionValue**
    - Migrations: composite unique constraints enforcing unique combination per variant.

18. **feat(api): routes for options & option values**
    - `POST /products/:id/options`, `POST /options/:id/values`, `GET` endpoints.
    - **Gated** by `product-variants` (server-side).

19. **feat(api): variant routes**
    - `GET /products/:id/variants`, `POST`, `PUT`, `DELETE`.
    - SKU unique; enforce combination uniqueness.

20. **test(api): unit tests for services with LD mocked**
    - Include negative cases where flag is OFF.

### Milestone E — Angular MVP

21. **feat(web): Angular workspace + Material + layout shell**
    - Standalone components; routing; auth pages.

22. **feat(web): auth flow + JWT interceptor**
    - Login/Register, guard protected routes.

23. **feat(web): products list/detail/edit**
    - Reusable DataService; optimistic updates optional.

24. **feat(web): show server-evaluated /features**
    - Small admin-visible panel; useful during demos.

25. **feat(web): LD JS SDK for UI gating (non-sensitive)**
    - Mirror `product-variants` for visibility only; never rely on it for security.

26. **feat(web): variant UI (when flag ON)**
    - Simple matrix editor (limit to 1–2 options: Color, Size).

### Milestone F — Playwright E2E Suite

27. **test(e2e): setup Playwright + storage states (admin/manager/viewer)**
    - Programmatically log in and save `*.json` states.

28. **test(e2e): CRUD flows and role authorization**
    - Products CRUD; ensure VIEWER cannot mutate; MANAGER cannot delete users.

29. **test(e2e): feature-flagged behavior**
    - With flag OFF: no variant UI; API calls blocked (403).
    - With flag ON: create options/values/variants; SKU uniqueness enforced.

30. **test(e2e): negative & visual sanity**
    - 403 assertions; optional screenshot snapshots.

### Milestone G — Quality & CI

31. **chore(ci): GitHub Actions with jobs (lint, build, api\*\***:test\***\*, e2e)**
    - Start Postgres service; run migrations; run e2e with `USE_FLAG_STUBS=true`.

32. **perf(api): indices and N+1 review**
    - Add Prisma `include/select` where beneficial; DB indices for common queries.

33. **docs: README with local dev steps + demo script**
    - Include curl examples, list of user roles, and flag toggling instructions.

---

## 5) Prisma — Initial Schema (MVP → Variants later)

Start small, then extend.

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  MANAGER
  VIEWER
}

model User {
  id         String   @id @default(uuid())
  email      String   @unique
  password   String
  role       Role
  createdAt  DateTime @default(now())
}

model Product {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  basePrice   Decimal  @db.Decimal(10,2)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  options     ProductOption[]
  variants    ProductVariant[]
}

model ProductOption {
  id        String  @id @default(uuid())
  product   Product @relation(fields: [productId], references: [id])
  productId String
  name      String
  values    OptionValue[]

  @@unique([productId, name])
}

model OptionValue {
  id       String        @id @default(uuid())
  option   ProductOption @relation(fields: [optionId], references: [id])
  optionId String
  value    String

  @@unique([optionId, value])
}

model ProductVariant {
  id        String   @id @default(uuid())
  product   Product  @relation(fields: [productId], references: [id])
  productId String
  sku       String   @unique
  price     Decimal  @db.Decimal(10,2)
  active    Boolean  @default(true)

  optionLinks VariantOptionValue[]
}

model VariantOptionValue {
  variant   ProductVariant @relation(fields: [variantId], references: [id])
  variantId String
  value     OptionValue    @relation(fields: [valueId], references: [id])
  valueId   String

  @@id([variantId, valueId])
}
```

---

## 6) API Contracts (DTOs) in /packages/shared

Keep DTOs versioned and shared across backend, Angular, and tests.

```ts
export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface AuthMeDTO {
  id: string;
  email: string;
  role: Role;
}

export interface ProductDTO {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePrice: number;
  active: boolean;
}

export type CreateProductDTO = Omit<ProductDTO, 'id'>;
export type UpdateProductDTO = Partial<CreateProductDTO>;

export interface OptionDTO {
  id: string;
  productId: string;
  name: string;
}
export interface OptionValueDTO {
  id: string;
  optionId: string;
  value: string;
}

export interface VariantDTO {
  id: string;
  productId: string;
  sku: string;
  price: number;
  active: boolean;
  optionValueIds: string[];
}

export type FeaturesDTO = Record<string, boolean>;
```

---

## 7) Testing Notes & Patterns

- **Server as authority**: All e2e tests assert server-side enforcement of flags (403 on gated routes when OFF).
- **Flag stubs**: For Playwright, start the `flag-stubs` server and point Angular to it in test env.
- **Storage states**: Pre-generate `admin.json`, `manager.json`, `viewer.json` via programmatic login step.
- **Deterministic data**: Before each e2e spec, run a DB reset script (truncate tables, reseed).

---

## 8) Demo Script (for your blog)

1. Show **MVP CRUD** working.
2. Toggle `product-variants` **OFF** → UI hidden, API blocked.
3. Toggle **ON** → add Color/Size options, create variants; see server and UI align.
4. Run Playwright with two jobs: `flag OFF` vs `flag ON`; compare outcomes.

---

## 9) Open Points & Choices

- **Express vs NestJS**: NestJS gives you DI, Modules, Guards, and interceptors out of the box — better for learning architecture. Express is simplest. _Both are compatible with this plan._
- **JWT refresh tokens**: Add if you want production-like auth flows.
- **LD privacy**: Keep sensitive targeting only on server contexts.
- **Pagination**: Cursor-based in API later; keep page/limit for now.
- **Pricing precision**: Using `Decimal(10,2)`; if you want multi-currency, add a money library.

```}

```
