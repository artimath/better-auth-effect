# effect-better-auth

Effect.ts integration for [Better Auth](https://better-auth.com) with Kysely/Postgres support.

## Features

- 🎯 Type-safe Better Auth integration using Effect.ts
- 🗄️ Kysely database adapter for Postgres
- 🔄 Effect layers for dependency injection
- ⚡ Built for production use

## Installation

```bash
pnpm add effect-better-auth better-auth kysely pg
pnpm add -D @types/pg
```

## Usage

### Basic Setup with @effect/platform HTTP Server

```typescript
import { Auth, BetterAuthRouter } from "effect-better-auth"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as Layer from "effect/Layer"
import { createServer } from "node:http"

// Merge BetterAuthRouter with your application routes
const AllRoutes = Layer.mergeAll(
  YourApiRoutes,
  BetterAuthRouter  // Handles /api/auth/* endpoints
)

// Provide the Auth service layer
const HttpLive = HttpLayerRouter.serve(AllRoutes).pipe(
  Layer.provide(
    NodeHttpServer.layer(createServer, { port: 3000 })
  ),
  Layer.provide(Auth.Default)  // Provides Auth service
)

// Run your server
NodeRuntime.runMain(
  Layer.launch(HttpLive).pipe(Effect.scoped)
)
```

### Using the Auth Service

Access Better Auth API in your application code:

```typescript
import { Auth } from "effect-better-auth"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  const auth = yield* Auth

  // Use Better Auth API
  const session = yield* Effect.promise(() =>
    auth.api.getSession({ headers: request.headers })
  )

  return session
})
```

### Environment Configuration

Required environment variables:

```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@localhost:5432/db
CLIENT_ORIGIN=http://localhost:5173  # Optional, defaults to this
```

Access environment config in code:

```typescript
import { AuthEnv } from "effect-better-auth"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  const env = yield* AuthEnv
  console.log(env.BETTER_AUTH_URL)
})
```

### Testing

Mock the Auth service for tests:

```typescript
import { Auth } from "effect-better-auth"
import * as Layer from "effect/Layer"

const TestAuthLayer = Layer.succeed(Auth, {
  api: {
    getSession: () => Promise.resolve({
      user: { id: "test-user", email: "test@example.com" },
      session: { id: "test-session", user_id: "test-user" }
    })
  }
} as Auth)

// Use in your tests
const testProgram = yourProgram.pipe(
  Effect.provide(TestAuthLayer)
)
```

## API

### `Auth`

Effect service providing Better Auth instance. Access via `yield* Auth` in Effect.gen.

**Layer**: `Auth.Default` - Default layer that reads from AuthEnv and creates Auth instance.

### `BetterAuthRouter`

Effect HTTP router layer that handles Better Auth endpoints at `/api/auth/*`.

### `AuthEnv`

Effect service providing typed environment configuration:
- `BETTER_AUTH_URL`: Base URL for auth endpoints
- `BETTER_AUTH_SECRET`: Secret for signing tokens (redacted)
- `DATABASE_URL`: Postgres connection string (redacted)
- `CLIENT_ORIGIN`: Allowed CORS origin (optional)

### `AuthKysely`

Effect service providing Kysely database instance with Postgres connection.

## License

Apache-2.0

## Author

Ryan Hunter ([@artimath](https://github.com/artimath))

## Links

- [Better Auth Documentation](https://better-auth.com)
- [Effect.ts Documentation](https://effect.website)
- [Kysely Documentation](https://kysely.dev)
