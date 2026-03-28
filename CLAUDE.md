# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Meta-rule: Challenge Bad Outcomes

If a user request, combined with the rules in this file, would lead to something clearly wrong, ugly, or
nonsensical — **push back**. Don't blindly follow rules when the result is obviously bad. Instead, explain the
conflict and propose a better approach. The rules here are guidelines, not dogma — they exist to produce good
code, and when they'd produce bad code in a specific situation, that's a bug in the rules, not a reason to
write bad code.

## Project Overview

PWA todo application with React 19 frontend and NestJS backend. Supports local-only mode (IndexedDB) and
cloud mode (server storage with Google OAuth). Polish language UI.

## Build & Run Commands

The project uses **npm workspaces** — root `package.json` orchestrates `client/` and `server/`.

```bash
# From root — workspace shortcuts
npm run dev                    # Start frontend (Vite)
npm run dev:server             # Start backend (NestJS --watch)
npm run build                  # Build both workspaces
npm run lint                   # Lint all workspaces
npm run test                   # Run server tests

# Direct workspace commands
npm run build -w client        # Build frontend only
npm run build -w server        # Build backend only
npm run test:e2e -w server     # E2E tests
npm run preview -w client      # Preview production build
```

## Tech Stack

### Frontend
- **Framework:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS 4
- **Storage:** IndexedDB (via `idb`) for local mode, REST API for cloud mode
- **PWA:** Service worker, manifest, offline-first

### Backend
- **Framework:** NestJS with TypeScript
- **ORM:** TypeORM with SQLite (designed for easy swap to PostgreSQL)
- **Auth:** Passport.js with Google OAuth 2.0, JWT sessions
- **Real-time:** Socket.io via `@nestjs/websockets`

## Architecture (Backend)

The backend uses ports & adapters pattern **within NestJS modules**. Unlike Java where hexagonal layers live
in separate Gradle/Maven modules, in NestJS the module already **is** the domain boundary — one module per
domain concept (e.g. `todo`, `sharing`, `auth`). Layers are just directories inside the module, not separate
compilation units. There's no enforced compile-time isolation between layers — discipline comes from the
dependency rule and code review, not from the build system.

### Layer structure per module

```
src/
├── todo/
│   ├── domain/
│   │   ├── todo.model.ts                 — domain model (plain class, no decorators)
│   │   ├── todo.repository.port.ts       — repository port (abstract class)
│   │   └── todo.service.ts               — business logic (uses port, not implementation)
│   ├── infrastructure/
│   │   ├── todo.entity.ts                — TypeORM entity (@Entity, @Column)
│   │   ├── todo.repository.adapter.ts    — implements repository port, uses TypeORM repo
│   │   └── todo.typeorm.repository.ts    — TypeORM repository (if custom queries needed)
│   ├── web/
│   │   ├── todo.controller.ts            — thin controller, delegates to service
│   │   └── dto/                          — request/response DTOs with class-validator
│   └── todo.module.ts                    — wires providers, exports service
```

**Dependency rule:** Domain imports nothing from infrastructure or web. Infrastructure implements domain ports.
Web depends on domain. The module file wires it all together via NestJS DI (`provide`/`useClass`).

### Rules for each layer

**Domain model** (in `domain/`):
- Plain TypeScript class — no NestJS decorators, no TypeORM decorators
- Readonly properties, constructor-based initialization
- `update(dto)` method for mutation logic — takes the request DTO directly
- `toResponse()` method returning the response DTO
- Business logic lives here, not in controllers or ORM entities

**Port interfaces** (in `domain/`):
- **RepositoryPort** — abstract class defining data access methods (`findById()`, `save()`, `findByDate()`, etc.)
  Abstract classes are used instead of interfaces so they can serve as NestJS injection tokens.
- **Service** — concrete class injected in controllers. Depends only on ports, never on infrastructure.

**TypeORM Entity** (in `infrastructure/`):
- `@Entity()` decorated class with TypeORM column decorators
- Named `<Concept>Entity` (e.g. `TodoEntity`) to distinguish from domain model
- `toDomain()` — maps entity to domain model
- `static fromDomain(model)` — creates entity from domain model for persistence. Static factory is justified
  here because TypeORM requires a parameterless constructor, so a regular constructor can't enforce required fields.

**Repository Adapter** (in `infrastructure/`):
- `@Injectable()` class implementing the abstract `RepositoryPort`
- Injects TypeORM `Repository<Entity>` via `@InjectRepository()`
- Thin mapping layer: calls TypeORM repo, converts entity <-> domain model

**Controller** (in `web/`):
- Injects the **Service** (which depends on ports, not implementations)
- Thin — only HTTP concerns: decorators, status codes, validation pipes
- Uses DTOs with `class-validator` decorators for request validation

**Module** (wiring):
- Provides the repository port with `{ provide: TodoRepositoryPort, useClass: TodoRepositoryAdapter }`
- This is the NestJS equivalent of the factory/bootstrap pattern — dependency inversion via the DI container
- Exports only what other modules need (typically the service)

### Naming conventions

| Layer              | File name pattern                  | Class name pattern             |
|--------------------|------------------------------------|--------------------------------|
| Domain model       | `<concept>.model.ts`               | `Todo`                         |
| Repository port    | `<concept>.repository.port.ts`     | `TodoRepositoryPort`           |
| Service            | `<concept>.service.ts`             | `TodoService`                  |
| TypeORM entity     | `<concept>.entity.ts`              | `TodoEntity`                   |
| Repository adapter | `<concept>.repository.adapter.ts`  | `TodoRepositoryAdapter`        |
| Controller         | `<concept>.controller.ts`          | `TodoController`               |
| Request DTO        | `create-<concept>.dto.ts`          | `CreateTodoDto`                |
| Response DTO       | `<concept>.response.ts`            | `TodoResponse`                 |

## Code Style & Design Rules

- **Logic in services, not controllers**: controllers are thin — they delegate to a service. All business
  logic, entity creation, repository calls, and relation lookups live in services. Controllers only handle HTTP
  concerns (decorators, status codes, validation binding).
- **Subdirectories only when earned**: use `domain/`, `infrastructure/`, `web/` subdirectories when a module
  has 6+ files. For smaller modules, keep files flat in the module directory. The layer structure in the
  architecture section above is the target for mature modules, not a requirement from day one.
- **Separate module per domain concept**: each concept (todo, auth, sharing) gets its own NestJS module.
  Don't dump everything into one mega-module.
- **Repositories never leak outside their module**: if another module needs data, it imports the module and
  injects the public service, not the repository. Services that are used cross-module are exported from the
  module.
- **No unnecessary abstractions**: don't create helpers, utilities, or abstractions for one-time operations.
  Three similar lines of code is better than a premature abstraction.
- **Immutable where possible**: prefer `readonly` fields. Mutation happens through explicit methods, not
  reassignment. Use domain model methods like `update(dto)` instead of direct field assignment.
- **One class per file**: every class, interface, or type gets its own file — keeps things readable and easy
  to find. Exception: small related types (e.g. an enum used only by one DTO) can share a file.
- **No `any`**: always use explicit types. `any` hides intent and breaks type safety. Use `unknown` when the
  type is genuinely unknown, then narrow it.
- **Always use braces**: even for single-line `if`/`else`/`for`/`while` bodies. No braceless one-liners.
- **No tutorial-style code**: no gratuitous layers, no `export` on everything, no getter/setter antipattern.
  Write clean TypeScript, not enterprise boilerplate.
- **Table names in singular**: `@Entity('todo')`, not `'todos'`. Entity = one row = singular noun.
- **DTOs use `class-validator`**: request DTOs are classes with validation decorators (`@IsString()`,
  `@IsOptional()`, etc.). Response DTOs can be plain classes or interfaces.
- **Domain models are decorator-free**: no NestJS, TypeORM, or class-validator decorators on domain model
  classes. They are plain TypeScript — portable and testable without framework dependencies.
- **`toResponse()` on domain models**: domain models have a `toResponse()` method returning the response DTO.
  Controllers and services call `model.toResponse()` instead of manually constructing response objects.
  Related entities are flattened to IDs (e.g. `listId` instead of nested `TodoList`).
- **Explicit null handling**: use nullish coalescing (`??`) and optional chaining (`?.`) instead of ternary
  null checks. For complex chains, prefer early returns over deep nesting.
- **No barrel files**: don't create `index.ts` re-export files. Import directly from the source file.
  Barrel files cause circular dependencies and slow down IDE resolution.
- **Use NestJS built-in exceptions**: use `NotFoundException`, `ForbiddenException`, `BadRequestException` etc.
  Don't create custom exception classes unless the built-in ones genuinely don't fit the semantics.
  Custom exception filters only when you need non-standard error response shapes.

### Frontend Code Style

- **Interfaces for simple data, classes when behavior justifies it**: plain data (todo, list) uses TypeScript
  interfaces. Classes with constructors, `readonly` fields, and behavior methods (`withField()`, `static empty()`)
  are for models with real logic. Interfaces for React props and generic configs.
- **Immutable updates**: prefer returning new objects/instances over mutating in place. For simple data use
  spread (`{ ...todo, completed: true }`), for classes use methods like `withField()`.

## Database Schema

Schema is managed by **TypeORM migrations** (`server/src/migrations/`). TypeORM `synchronize` is **off** in
production — it does NOT generate DDL. When adding, removing, or altering entities or fields, you MUST create
a new migration (`npm run migration:generate -- -n DescriptiveName`) with the corresponding schema changes.
Without a migration, the app will fail on startup with a schema mismatch.

## Change Verification Checklist

**Before committing any change, always verify:**

1. **Existing tests still pass** — if you add/remove a constructor parameter, field, or change a method signature,
   check all test files that instantiate or mock the affected class. Update them to match the new signature.
2. **Frontend type-checks** — after touching `.ts`/`.tsx` files, mentally verify imports, prop types, and hook return
   types are consistent with existing code. Check that referenced components, classes, and hooks actually exist.
3. **Cross-module callers** — when changing a public service API, grep for usages across the codebase. Other modules
   or test files may depend on the old signature.
4. **DTO validation** — when adding new endpoints, ensure request DTOs have proper `class-validator` decorators.
   Missing validation is a security hole.
