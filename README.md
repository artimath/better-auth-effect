# effect-better-auth

Effect.ts integration for [Better Auth](https://better-auth.com) with Kysely/Postgres support.

## Features

- 🎯 Type-safe Better Auth integration using Effect.ts
- 🗄️ Kysely database adapter for Postgres
- 🔄 Effect layers for dependency injection
- 🔐 HTTP middleware for authentication
- ⚡ Built for production use

## Installation

```bash
pnpm add effect-better-auth better-auth kysely pg
pnpm add -D @types/pg
```

## Quick Start

```typescript
import { Auth, BetterAuthRouter } from "effect-better-auth"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as NodeHttpServer from "@effect/platform-node/NodeHttpServer"
import * as Layer from "effect/Layer"
import { createServer } from "node:http"

// Merge BetterAuthRouter with your routes
const AllRoutes = Layer.mergeAll(
  YourApiRoutes,
  BetterAuthRouter  // Handles /api/auth/* endpoints
)

// Provide Auth.Default layer
const HttpLive = HttpLayerRouter.serve(AllRoutes).pipe(
  Layer.provide(
    NodeHttpServer.layer(createServer, { port: 3000 })
  ),
  Layer.provide(Auth.Default)
)

// Run server
NodeRuntime.runMain(
  Layer.launch(HttpLive).pipe(Effect.scoped)
)
```

## Authentication Middleware Pattern

### 1. Define AuthContext

Create a context tag to hold authenticated user information:

```typescript
import { Context } from "effect"

export class AuthContext extends Context.Tag("AuthContext")<
  AuthContext,
  { readonly user_id: string }
>() {}
```

### 2. Create Authorization Middleware

Build middleware that extracts session from Better Auth and provides AuthContext:

```typescript
import { HttpApiMiddleware, HttpServerRequest } from "@effect/platform"
import { Auth } from "effect-better-auth"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  { details: Schema.String }
) {}

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: Unauthorized,
    provides: AuthContext,
  }
) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const auth = yield* Auth

    return Effect.gen(function* () {
      // Extract headers from HTTP request
      const headers = yield* HttpServerRequest.schemaHeaders(
        Schema.Struct({
          cookie: Schema.optional(Schema.String),
          authorization: Schema.optional(Schema.String),
        })
      ).pipe(
        Effect.mapError(() =>
          new Unauthorized({ details: "Failed to parse headers" })
        )
      )

      // Forward to Better Auth
      const forwardedHeaders = new Headers()
      if (headers.cookie) {
        forwardedHeaders.set("cookie", headers.cookie)
      }
      if (headers.authorization) {
        forwardedHeaders.set("authorization", headers.authorization)
      }

      // Get session from Better Auth
      const session = yield* Effect.tryPromise({
        try: () => auth.api.getSession({ headers: forwardedHeaders }),
        catch: (cause) =>
          new Unauthorized({ details: String(cause) }),
      })

      if (!session) {
        return yield* Effect.fail(
          new Unauthorized({ details: "Missing or invalid authentication" })
        )
      }

      // Provide authenticated user context
      return AuthContext.of({ user_id: session.user.id })
    })
  })
)
```

### 3. Apply Middleware to API Endpoints

```typescript
import { HttpApiGroup, HttpApiEndpoint } from "@effect/platform"
import * as Schema from "effect/Schema"

export class MyApiGroup extends HttpApiGroup.make("myapi")
  .add(
    HttpApiEndpoint.get("getData", "/data")
      .addSuccess(Schema.Array(DataSchema))
  )
  .add(
    HttpApiEndpoint.post("createData", "/data")
      .setPayload(CreateDataPayload)
      .addSuccess(DataSchema)
  )
  .middleware(Authorization)  // Require auth for all endpoints
  .prefix("/api") {}
```

### 4. Access AuthContext in Handlers

```typescript
import { HttpApiBuilder } from "@effect/platform"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

const MyApiHandlers = HttpApiBuilder.group(MyApi, "myapi", (handlers) =>
  handlers
    .handle("getData", () =>
      Effect.gen(function* () {
        const auth = yield* AuthContext  // Get authenticated user
        const repo = yield* DataRepo

        // Use auth.user_id to scope queries
        return yield* repo.findAll(auth.user_id)
      })
    )
    .handle("createData", ({ payload }) =>
      Effect.gen(function* () {
        const auth = yield* AuthContext
        const repo = yield* DataRepo

        return yield* repo.create(payload, auth.user_id)
      })
    )
)

export const MyApiHandlersLive = Layer.provide(
  MyApiHandlers,
  Layer.mergeAll(
    DataRepo.Default,
    // Other dependencies
  )
)
```

### 5. Wire Everything Together

```typescript
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import * as Layer from "effect/Layer"

// Add your API with authorization middleware
const MyApiLive = HttpLayerRouter.addHttpApi(MyApi).pipe(
  Layer.provide(MyApiHandlersLive),
  Layer.provide(AuthorizationLive)  // Provide auth middleware
)

// Merge with Better Auth router
const AllRoutes = Layer.mergeAll(
  MyApiLive,
  BetterAuthRouter  // Handles /api/auth/*
)

// Serve with Auth.Default
const HttpLive = HttpLayerRouter.serve(AllRoutes).pipe(
  Layer.provide(
    NodeHttpServer.layer(createServer, { port: 3000 })
  ),
  Layer.provide(Auth.Default)  // Provides Auth service
)
```

## Environment Configuration

Required environment variables:

```bash
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your-secret-key-here
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
  // env.BETTER_AUTH_SECRET is Redacted type
  // env.DATABASE_URL is Redacted type
})
```

## Better Auth Configuration

The package automatically configures Better Auth with:

- **Email/Password authentication**: Enabled by default
- **Postgres database**: Via Kysely adapter
- **Automatic migrations**: Runs on startup
- **Camel case**: Database column naming

The Auth service exposes the full Better Auth API:

```typescript
import { Auth } from "effect-better-auth"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  const auth = yield* Auth

  // Access Better Auth API
  const session = yield* Effect.promise(() =>
    auth.api.getSession({ headers: request.headers })
  )

  // Other Better Auth methods available on auth.api
  // signIn, signUp, signOut, etc.
})
```

## Testing

Mock the Auth service for tests:

```typescript
import { Auth } from "effect-better-auth"
import * as Layer from "effect/Layer"

const TestAuthLayer = Layer.succeed(Auth, {
  api: {
    getSession: () => Promise.resolve({
      user: {
        id: "test-user",
        email: "test@example.com",
        emailVerified: false,
        name: "Test User",
        created_at: new Date(),
        updated_at: new Date()
      },
      session: {
        id: "test-session",
        user_id: "test-user",
        token: "test-token",
        expiresAt: new Date(Date.now() + 86400000),
        created_at: new Date(),
        updated_at: new Date()
      }
    })
  }
} as Auth)

// Mock authorization middleware for tests
const TestAuthorizationLayer = Layer.effect(
  Authorization,
  Effect.succeed(
    Effect.succeed(
      AuthContext.of({ user_id: "test-user" })
    )
  )
)

// Use in tests
const testProgram = yourProgram.pipe(
  Effect.provide(TestAuthorizationLayer),
  Effect.provide(TestAuthLayer)
)
```

## API Reference

### `Auth`

Effect service providing Better Auth instance.

**Type**: `Effect.Service<Auth>`
**Access**: `yield* Auth` in Effect.gen
**Layer**: `Auth.Default` - Reads from AuthEnv, creates Kysely connection, configures Better Auth
**Properties**:
- `api` - Better Auth API with methods like `getSession`, `signIn`, `signUp`, etc.

### `BetterAuthRouter`

Effect HTTP router layer that handles Better Auth endpoints.

**Type**: `Layer.Layer<never>`
**Routes**: Handles all requests to `/api/auth/*`
**Usage**: Merge with your application routes using `Layer.mergeAll`

### `AuthEnv`

Effect service providing typed environment configuration.

**Type**: `Effect.Service<AuthEnv>`
**Layer**: `AuthEnv.Default` - Reads from process.env
**Properties**:
- `BETTER_AUTH_URL` - Base URL for auth endpoints (string)
- `BETTER_AUTH_SECRET` - Secret for signing tokens (Redacted)
- `DATABASE_URL` - Postgres connection string (Redacted)
- `CLIENT_ORIGIN` - Allowed CORS origin (string, optional, defaults to http://localhost:5173)

### `AuthKysely`

Effect service providing Kysely database instance.

**Type**: `Effect.Service<AuthKysely>`
**Layer**: `AuthKysely.Default` - Creates Postgres connection pool
**Usage**: Internal to Auth service, provides database adapter to Better Auth

## How It Works

1. **BetterAuthRouter** handles `/api/auth/*` endpoints (sign-in, sign-up, etc.)
2. Better Auth sets session cookies on successful authentication
3. Your **Authorization middleware** extracts cookies/headers from requests
4. Middleware calls `auth.api.getSession()` to validate
5. On valid session, middleware provides **AuthContext** with `user_id`
6. Your **API handlers** access `AuthContext` via `yield* AuthContext`
7. Handlers use `user_id` to scope database queries per user

## License

Apache-2.0

## Author

Ryan Hunter ([@artimath](https://github.com/artimath))

## Links

- [Better Auth Documentation](https://better-auth.com)
- [Effect.ts Documentation](https://effect.website)
- [Kysely Documentation](https://kysely.dev)
