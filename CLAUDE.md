# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Meta-rule: Challenge Bad Outcomes

If a user request, combined with the rules in this file, would lead to something clearly wrong, ugly, or
nonsensical — **push back**. Don't blindly follow rules when the result is obviously bad. Instead, explain the
conflict and propose a better approach. The rules here are guidelines, not dogma — they exist to produce good
code, and when they'd produce bad code in a specific situation, that's a bug in the rules, not a reason to
write bad code.

## Project Overview

PWA todo application with React 19 frontend and NestJS backend. Runs in local-only mode (IndexedDB) or cloud
mode (server storage with Google OAuth). **Local mode covers the todo module only** — Posiłki, Serwis domu,
Finanse and Czat require an account and a household, so they are cloud-only. Polish language UI.

## Feature Documentation

Non-trivial feature algorithms are documented under `docs/`. **When you change how a feature works, update its
doc in the same commit** — the docs are the source of truth for the intent behind the code.

- `docs/meals.md` — Posiłki module: pantry-aware shopping (`computeNeeds` + package rounding), loop closers
  (cooked → subtract from pantry, bought → add to pantry), and shopping-list export to a todo list. Cloud-only,
  per household: the algorithms live **only** in `server/src/meal/domain/meal.service.ts`, and
  `client/src/lib/meals.ts` holds just types, constants and presentation helpers.
- `docs/nutrition.md` — wartości odżywcze: jednostka odniesienia (100 g/ml vs 1 szt), zasada „komplet albo nic"
  dla kcal + makroskładników, i (docelowo) liczenie makro przepisu oraz bilansu domowników.
- `docs/home-service.md` — Serwis domu module: home assets + cyclic maintenance, `nextDueAt` derivation
  (`addMonths`), date-relative status (`overdue`/`soon`/`ok`/`none` with a 30-day soon threshold), and the
  "mark done" loop closer that rolls the next due date forward. Cloud-only, per household.
- `docs/finance.md` — Finanse module (ported from the standalone `finansowy-notatnik` app): wallets +
  transactions (positive = income, negative = expense, rounded to grosze), recurring-transaction catch-up
  (`materialiseDue`, idempotent, capped) and server-side stats. Also records why the category breakdown is
  single-hue bars rather than a 9-colour donut.
- `docs/api-tokens.md` — machine tokens for agent/MCP access: `api_token` model (SHA-256 hashed secret,
  scopes, household binding, expiry), the `<module>:<read|write>` scope grammar with `write⇒read`, and the
  `MachineOrJwtAuthGuard` that accepts a session cookie OR a `Bearer lz_…` token and enforces `@RequireScopes`.
- `docs/mcp-setup.md` — MCP server: JSON-RPC over Streamable HTTP at `POST /api/mcp`, OAuth **or**
  bearer-token auth, the tool registry (`server/src/mcp/domain/tools/`), per-tool scope gating, and how
  to connect an agent (Cowork). Tools reuse the domain services, so UI permissions apply unchanged.
- `docs/mcp-oauth.md` — MCP OAuth 2.1 authorization server (`server/src/oauth/`): the app is both
  Resource Server (`/api/mcp`) and Authorization Server. Dynamic client registration (RFC 7591), PKCE
  `S256` authorize/consent (reusing Google login), and a token endpoint that mints an ordinary `lz_…`
  machine token — so the MCP guard and scope gating are unchanged. Discovery docs live at
  `/.well-known/*` (excluded from the global `api` prefix); the MCP 401 carries `WWW-Authenticate`.
- `docs/google-oauth-setup.md`, `docs/push-setup.md` — deployment/config guides.

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
  concerns (decorators, status codes, validation binding). **This includes WebSocket notifications** — they
  belong in the service, so every path into it (REST, MCP tools, future integrations) notifies open clients
  identically. Emitting from a controller silently breaks realtime for MCP callers.
- **Subdirectories only when earned**: use `domain/`, `infrastructure/`, `web/` subdirectories when a module
  has 6+ files. For smaller modules, keep files flat in the module directory. The layer structure in the
  architecture section above is the target for mature modules, not a requirement from day one.
- **Separate module per domain concept**: each concept (todo, auth, sharing) gets its own NestJS module.
  Don't dump everything into one mega-module.
- **Repositories never leak outside their module**: if another module needs data, it imports the module and
  injects the public service, not the repository. Services that are used cross-module are exported from the
  module.
- **A module owns every way into its domain**: REST controller, WebSocket gateway and **MCP tools** are all
  entry points to the same logic, so they live in the module that owns that logic — `<module>/mcp/<module>.tools.ts`,
  next to the service they wrap. Shared infrastructure (`mcp/`) keeps only the protocol: the `McpTool` contract,
  JSON-RPC handling, scope gating and the registry that collects contributions. Nothing under `mcp/` may import
  `todo/`, `meal/`, `home/`, `finance/` or `sharing/`; a new module with tools must not require touching `mcp/`.
  ⚠️ **Not true yet** — tools currently sit in `server/src/mcp/domain/tools/`; the move is tracked in
  [#115](https://github.com/pantalejmon/lista-zadan/issues/115). Write new tools where the rule says, or extend
  the existing file if the move hasn't happened yet — but don't deepen the coupling.
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
- **Named static factories over all-args constructors**: don't call `new Model(arg1, arg2, ..., arg7)` in
  services — positional arguments are unreadable. Domain models expose static factory methods that describe
  *what* is being created and *from what*: `Todo.createFromDto(dto)`, `Todo.createRecurring(dto, groupId, ...)`.
  The raw constructor stays for internal use (entity `toDomain()`, `update()` returning new instance).
- **Constructor injection (NestJS)**: NestJS uses constructor-based DI — there is no `inject()` function like
  in Angular. Always inject dependencies via constructor parameters.
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
5. **MCP parity** — if the change adds, removes, or alters a capability reachable from the UI (a new endpoint,
   a new service method, a changed argument), mirror it in the MCP tools. See "MCP Tool Parity" below.

## MCP Tool Parity

The app is fully controllable by agents through the MCP server (`server/src/mcp/`), and it must **stay** that
way. The rule: **every user-facing capability has an equivalent MCP tool.** When you touch the API surface,
update MCP in the *same commit*.

- **New domain-service method / REST endpoint that exposes a capability** → add a matching tool in that module's
  own tool file (`<module>/mcp/<module>.tools.ts` — see the ownership rule above; until #115 lands, the existing
  `server/src/mcp/domain/tools/<module>.tools.ts`). Read-only capability → a `:read`-scoped tool; mutation →
  a `:write`-scoped tool. Reuse the domain service (never re-implement logic in the tool) so permissions and
  validation apply unchanged.
- **New module** → add the module's own tool file, a `finance`-style scope module in
  `server/src/api-token/domain/api-scope.ts` (`SCOPE_MODULES` + the regex), and a consent label in
  `OAuthController`'s `SCOPE_LABELS` (the `Record<ApiScope, string>` type enforces this). The module registers its
  own tools; only until #115 lands does this also mean wiring the builder into `McpModule`.
- **Changed method signature / DTO field** → update the tool's `inputSchema` and handler to match.
- **Removed capability** → remove the corresponding tool.
- Always update `docs/mcp-setup.md` (tool catalogue) and, for scope changes, `docs/api-tokens.md`.
- Tools carry no business logic of their own — they translate JSON-RPC args into a domain-service call. If a tool
  needs logic the service doesn't have, add it to the service, not the tool.

## Git Workflow

- **Delete branches after merge**: once a pull request is merged, delete its branch — both the remote branch
  and the local one. Don't leave merged branches lingering. (If the environment's git proxy blocks remote
  branch deletion, enable "Automatically delete head branches" in the repo settings or delete it from the
  merged PR page — and still clean up the local branch.)
