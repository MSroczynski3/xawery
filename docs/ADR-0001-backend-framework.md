# ADR-0001: Choose Express as Backend Framework

**Status**: Accepted  
**Date**: 2025-11-11  
**Deciders**: Development Team

## Context

We need to choose a Node.js backend framework for our e-commerce demo application. The application requires:
- RESTful API endpoints
- JWT authentication with role-based access control
- Integration with LaunchDarkly SDK
- Zod validation
- Prisma ORM integration

The two main candidates are **Express** and **NestJS**.

## Decision

We will use **Express** as our backend framework.

## Rationale

### Why Express?

1. **Simplicity**: Minimal learning curve, straightforward to understand
2. **Flexibility**: No opinionated structure, we control the architecture
3. **Lightweight**: Fewer abstractions, easier to debug
4. **Perfect for learning**: See exactly how middleware, routing, and DI work
5. **Demo-appropriate**: Sufficient for showcasing feature flags and RBAC

### What we considered about NestJS

**Advantages** (not chosen):
- Built-in dependency injection
- Modular architecture out-of-the-box
- TypeScript decorators for routing and validation
- More enterprise-ready patterns

**Why we didn't choose it**:
- Steeper learning curve
- More boilerplate for a demo project
- Overkill for our scope
- Can be harder to debug initially

## Consequences

### Positive
- Faster initial development
- More control over architecture
- Easier to understand for learners
- Lighter bundle size

### Negative
- Need to implement our own DI pattern (simple factories)
- Manual setup for routing structure
- Less built-in type safety for routes

### Mitigation
- Use clear folder structure (`routes/`, `services/`, `middleware/`)
- Implement simple dependency injection via factory functions
- Use Zod for request validation
- Document patterns clearly for consistency

## Implementation Notes

```
apps/api/src/
  ├── index.ts           # Server bootstrap
  ├── routes/            # Route handlers
  ├── services/          # Business logic
  ├── middleware/        # Auth, validation, error handling
  ├── utils/             # Helpers
  └── types/             # TypeScript types
```

## References
- [Express Documentation](https://expressjs.com/)
- [NestJS Documentation](https://nestjs.com/) (for future reference)

