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
```

## Usage

### Basic Setup

```typescript
import { BetterAuthService, KyselyLayer } from "effect-better-auth"
import { Effect } from "effect"

// Create Kysely layer with your database config
const DatabaseLayer = KyselyLayer({
  host: "localhost",
  port: 5432,
  database: "myapp",
  user: "postgres",
  password: "postgres"
})

// Use BetterAuthService in your application
const program = Effect.gen(function* () {
  const auth = yield* BetterAuthService
  // Use auth methods...
})

// Run with layers
Effect.runPromise(
  program.pipe(
    Effect.provide(DatabaseLayer)
  )
)
```

### Environment Configuration

```typescript
import { BetterAuthEnv } from "effect-better-auth"
import { Config } from "effect"

// Define your environment
const env = Config.all({
  databaseUrl: Config.string("DATABASE_URL"),
  authSecret: Config.secret("AUTH_SECRET")
})
```

## API

### `BetterAuthService`

Effect service providing Better Auth functionality with type-safe Effect integration.

### `KyselyLayer`

Creates an Effect Layer for Kysely database connection with Postgres support.

### `BetterAuthRouter`

Effect-based router integration for Better Auth endpoints.

## License

Apache-2.0

## Author

Ryan Hunter ([@artimath](https://github.com/artimath))

## Links

- [Better Auth Documentation](https://better-auth.com)
- [Effect.ts Documentation](https://effect.website)
- [Kysely Documentation](https://kysely.dev)
