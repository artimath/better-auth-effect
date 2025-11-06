Great catch — you’re right that putting a **generic** on a _service tag_ (or on a `Context.Tag`) is **not** how the Effect team generally writes libraries. Service tags in Effect are **singletons** that model _capabilities_, not “parameterized instances”. The recommended pattern is:

- keep tags **non‑generic** and stable (module‑level),
- carry any app‑specific types / shapes via **schemas and config** that you provide at composition time, and
- let `Effect.Service` supply the **default layer** that constructs the service (you provide its dependencies via other tags/layers). ([Effect][1])

Below is a **revised, idiomatic** design for `effect-better-auth` that removes generics from tags, uses **schemas** to give you strong types end‑to‑end, and wires Better Auth into `@effect/platform` HTTP, `@effect/rpc`, and `effect‑atom`.

I also show two ways to get **Effect Schemas** for `User` & `Session`:

1. **Type‑direct**: annotate an Effect Schema that _must_ satisfy `typeof auth.$Infer.User / Session` (compile‑time safety). ([Better Auth][2])
2. **Zod‑assisted (optional)**: if you already have **Zod 4** schemas, convert them to JSON Schema (via `z.toJSONSchema`) and then into Effect Schema using a small adapter (covers common cases). ([Zod][3])

---

## What this package provides

- **Auth service** (non‑generic tag) exposing:

  - the **Better Auth** fetch handler (mountable),
  - a **read‑only session accessor** `getSessionFromHeaders(headers)`,
  - your configured `basePath`.

- **HTTP integration** for `@effect/platform`:

  - `Http.mount()` — mount Better Auth’s handler at `basePath`,
  - `Http.injectSession()` — per‑request, decode session→user,
  - `Http.requireSession()` / `Http.requireRole()` guards.

- **RPC** (`@effect/rpc`) group for `getSession` (+ optional `signOut`).
- **effect‑atom** client atoms for `session` + `signOut` with reactivity.
- A **typed builder** that connects your **schemas** (User/Session) to the above so your HTTP, RPC, and atoms are all strongly typed, with _no_ generics on tags.

> **Why mount, not re‑implement?**
> Better Auth already exposes a **fetch‑style handler** and a server API. We mount the handler under Effect’s router (all cookie/CSRF/redirect logic is kept intact), and use `auth.api.getSession({ headers })` for fast, read‑only session checks. ([Better Auth][4])

---

## Package layout

```
effect-better-auth/
  src/
    server/
      Config.ts        // Tag for (ba, basePath)
      Auth.ts          // Auth service (non-generic tag, Default layer)
      Http.ts          // Router helpers: mount, injectSession, guards
      Rpc.ts           // Function to build a typed Rpc group from schemas
      Types.ts         // Helpers for Schema-first typing
      ZodInterop.ts    // (optional) zod→json schema→Effect Schema adapter
    client/
      rpcClient.ts     // RPC client tag (atom-rpc)
      atoms.ts         // session/signOut atoms
    builder.ts         // High-level “init” that returns a typed kit
  index.ts             // re-exports
```

Peer deps: `effect ^3.17`, `@effect/platform`, `@effect/rpc`, `@effect-atom/atom-react`, `better-auth`, and optionally `zod` (if you want the adapter).

---

## 1) Config as a Tag (no generics)

```ts
// server/Config.ts
import * as Context from "effect/Context";

export interface BetterAuthConfig {
  readonly ba: unknown; // the Better Auth instance
  readonly basePath: `/${string}`; // e.g. "/api/auth"
}

export const BetterAuthConfig = Context.Tag<BetterAuthConfig>(
  "effect-better-auth/BetterAuthConfig",
);
```

You’ll provide this once with `Layer.succeed(BetterAuthConfig, { ba, basePath })`. The `Auth` service (below) reads it to build itself. This aligns with the docs: the **service’s Default layer** is produced by `Effect.Service`, and **you** provide _its dependencies_ (config) via layers. ([Effect][1])

---

## 2) Auth service (stable tag, Default layer)

```ts
// server/Auth.ts
import { Effect, Layer } from "effect";
import * as ServerRequest from "@effect/platform/HttpServerRequest";
import { BetterAuthConfig } from "./Config";

export class Auth extends Effect.Service<Auth>()("effect-better-auth/Auth", {
  effect: Effect.gen(function* () {
    const { ba, basePath } = yield* BetterAuthConfig as BetterAuthConfig;
    // Minimal surface we need from Better Auth:
    const handler = (ba as any).handler as (req: Request) => Promise<Response>;
    const api = (ba as any).api as { getSession(args: { headers: Headers }): Promise<any> };

    const getSessionFromHeaders = (headers: Headers) =>
      Effect.fromPromise(() => api.getSession({ headers })).pipe(
        Effect.map((r) => ({
          session: r?.session ?? null,
          user: r?.user ?? null,
        })),
      );

    return { basePath, handler, getSessionFromHeaders } as const;
  }),
}) {}
```

No generics on the tag. The app’s **types** will be threaded in via **schemas** (next sections); the service itself just exposes capabilities.

---

## 3) HTTP integration (mount + per‑request session + guards)

```ts
// server/Http.ts
import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpApp from "@effect/platform/HttpApp";
import * as ServerRequest from "@effect/platform/HttpServerRequest";
import * as ServerResponse from "@effect/platform/HttpServerResponse";
import * as Context from "effect/Context";
import { Effect } from "effect";
import { Auth } from "./Auth";

/** Per-request holder. Values are `unknown` here; the typed builder refines them. */
export interface CurrentSession {
  readonly session: unknown | null;
  readonly user: unknown | null;
}
export const CurrentSession = Context.Tag<CurrentSession>("effect-better-auth/CurrentSession");

/** Mount Better Auth's fetch handler at Auth.basePath */
export const mount = <E, R>(router: HttpRouter.HttpRouter<E, R | Auth>) =>
  router.pipe(
    HttpRouter.mountApp(
      "/",
      // Build a tiny HttpApp that dispatches only when path starts with basePath
      HttpApp.make(
        Effect.gen(function* () {
          const { handler, basePath } = yield* Auth;
          const req = yield* ServerRequest.HttpServerRequest;

          // Rehydrate a Request for Better Auth
          const url = new URL(req.url, "http://localhost"); // host unused by BA
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            Array.isArray(v) ? v.forEach((vv) => headers.append(k, vv)) : v && headers.set(k, v);
          }
          if (!url.pathname.startsWith(basePath)) {
            return ServerResponse.empty({ status: 404 });
          }
          const webReq = new Request(url, { method: req.method, headers, body: req.body });
          const webRes = await handler(webReq);
          return ServerResponse.raw(webRes.body ?? null, {
            status: webRes.status,
            headers: Object.fromEntries(webRes.headers.entries()),
          });
        }),
      ),
    ),
  );

/** Provide CurrentSession for downstream routes. */
export const injectSession = <E, R>(router: HttpRouter.HttpRouter<E, R | Auth>) =>
  router.pipe(
    HttpRouter.provideServiceEffect(
      CurrentSession,
      Effect.gen(function* () {
        const req = yield* ServerRequest.HttpServerRequest;
        const { getSessionFromHeaders } = yield* Auth;
        const headers = new Headers(
          Object.entries(req.headers).flatMap(([k, v]) =>
            Array.isArray(v) ? v.map((vv) => [k, vv] as const) : v ? [[k, v] as const] : [],
          ),
        );
        return yield* getSessionFromHeaders(headers);
      }),
    ),
  );

/** 401 if not signed in. */
export const requireSession = HttpRouter.use((next) =>
  Effect.gen(function* () {
    const { session } = yield* CurrentSession;
    if (!session) return ServerResponse.empty({ status: 401 });
    return yield* next;
  }),
);

/** 403 if predicate(session, user) fails — to be specialized in the builder. */
export const requireRoleUnknown = (predicate: (s: unknown, u: unknown) => boolean) =>
  HttpRouter.use((next) =>
    Effect.gen(function* () {
      const { session, user } = yield* CurrentSession;
      if (!session || !user || !predicate(session, user)) {
        return ServerResponse.empty({ status: 403 });
      }
      return yield* next;
    }),
  );
```

- `mount` relies on `HttpRouter.mountApp` and bridges to/from **fetch** — exactly the intended direction for `@effect/platform`. ([Effect TS][5])
- `injectSession` uses **headers only** with `auth.api.getSession`, which is what Better Auth documents. ([Better Auth][6])

---

## 4) RPC (built from your schemas)

We generate a typed RPC group from **Effect Schemas** you provide:

```ts
// server/Rpc.ts
import { Schema as S, Effect, Layer } from "effect";
import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as ServerRequest from "@effect/platform/HttpServerRequest";
import * as HttpClient from "@effect/platform/HttpClient";
import { Auth } from "./Auth";

export function makeAuthRpc<UserS extends S.Schema.Any, SessS extends S.Schema.Any>(opts: {
  User: UserS;
  Session: SessS;
}) {
  const { User, Session } = opts;
  const NullUser = S.Union(S.Null, User);
  const NullSession = S.Union(S.Null, Session);

  class Group extends RpcGroup.make(
    Rpc.make("getSession", {
      success: S.Struct({ user: NullUser, session: NullSession }),
    }),
    Rpc.make("signOut"),
  ) {}

  const layer = Group.toLayer({
    getSession: () =>
      Effect.gen(function* () {
        const req = yield* ServerRequest.HttpServerRequest;
        const headers = new Headers(Object.entries(req.headers) as any);
        const { getSessionFromHeaders } = yield* Auth;
        return yield* getSessionFromHeaders(headers);
      }),
    signOut: () =>
      Effect.gen(function* () {
        const { basePath } = yield* Auth;
        const client = yield* HttpClient.HttpClient;
        yield* client
          .post(new URL(`${basePath}/sign-out`, "http://localhost"))
          .pipe(HttpClient.execute, Effect.asUnit);
      }),
  });

  return { Group, layer };
}
```

`RpcGroup` / `Rpc.make` is the standard pattern in the current RPC library. ([npm][7])

---

## 5) effect‑atom client

```ts
// client/rpcClient.ts
import { AtomRpc } from "@effect-atom/atom-react";

export function makeAuthClient(Group: any) {
  return class AuthClient extends AtomRpc.Tag<AuthClient>()("effect-better-auth/AuthClient", {
    group: Group,
    protocol: undefined as any,
  }) {};
}
```

```ts
// client/atoms.ts
export const sessionAtom = (ClientTag: any) =>
  ClientTag.query("getSession", undefined, { reactivityKeys: ["auth:session"] });

export const signOutAtom = (ClientTag: any) =>
  ClientTag.mutation("signOut", { reactivityKeys: ["auth:session"] });
```

---

## 6) **Builder** — one call makes the whole kit _typed_ (no generic tags)

This is the piece that ties your **Better Auth instance** and your **schemas** into a typed kit (router guards, RPC, atoms). All tags remain non‑generic; the typing flows from the _values_ you pass in.

```ts
// builder.ts
import { Layer } from "effect";
import * as HttpRouter from "@effect/platform/HttpRouter";
import { BetterAuthConfig } from "./server/Config";
import { Auth } from "./server/Auth";
import * as Http from "./server/Http";
import { makeAuthRpc } from "./server/Rpc";
import { makeAuthClient } from "./client/rpcClient";
import { sessionAtom, signOutAtom } from "./client/atoms";
import { Schema as S } from "effect";

export function createEffectBetterAuth<
  UserS extends S.Schema.Any,
  SessS extends S.Schema.Any,
>(options: {
  /** Your Better Auth instance */
  ba: unknown;
  /** Where the BA handler should live (defaults to "/api/auth") */
  basePath?: `/${string}`;
  /** Required effect Schemas for your shapes (see §7) */
  schemas: { User: UserS; Session: SessS };
}) {
  const basePath = options.basePath ?? "/api/auth";

  // Layers
  const ConfigLive = Layer.succeed(BetterAuthConfig, { ba: options.ba, basePath });
  const AuthLive = Auth.Default;

  // HTTP helpers (typed guard)
  const requireRole = (pred: (s: S.Schema.Type<SessS>, u: S.Schema.Type<UserS>) => boolean) =>
    Http.requireRoleUnknown(pred as any);

  // RPC
  const rpc = makeAuthRpc(options.schemas);
  const RpcLive = rpc.layer;

  // Client
  const AuthClient = makeAuthClient(rpc.Group);

  return {
    // layers to merge into your runtime
    layers: { ConfigLive, AuthLive, RpcLive },

    // http helpers
    http: {
      mount: Http.mount,
      injectSession: Http.injectSession,
      requireSession: Http.requireSession,
      requireRole,
    },

    // rpc group class (share between server & client)
    rpc: rpc.Group,

    // client helpers
    client: {
      AuthClient,
      sessionAtom: () => sessionAtom(AuthClient),
      signOutAtom: () => signOutAtom(AuthClient),
    },

    // typed schemas you passed in
    types: options.schemas,
  } as const;
}
```

This keeps tags **non‑generic**, while giving you **typed** route guards, RPC, and atoms.

---

## 7) **Getting Effect Schemas** for Better Auth types

### 7.1 The **type‑direct** (recommended) path

Better Auth exposes `$Infer` properties on the server and client — so you can tie your schemas to _exactly_ those types (no `any`). ([Better Auth][2])

```ts
// auth.ts in your app
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  /* ...providers, db, plugins... */
});

// Get the TS *types* straight from Better Auth
export type BAUser = typeof auth.$Infer.User;
export type BASession = typeof auth.$Infer.Session;
```

Now define Effect Schemas that **must** conform to those types:

```ts
// schemas.ts
import { Schema as S } from "effect";
import type { BAUser, BASession } from "./auth";

// Minimal example; reflect your real fields (plugins may extend User/Session)
export const UserSchema: S.Schema<BAUser> = S.Struct({
  id: S.String,
  name: S.optional(S.String),
  email: S.optional(S.String),
  image: S.optional(S.String),
  // ...add extra fields (role/tenant/etc.) if you configured them in BA
});

export const SessionSchema: S.Schema<BASession> = S.Struct({
  id: S.String,
  userId: S.String,
  expiresAt: S.String, // or S.DateFromString if you normalize
  // ...add your custom session fields if any
});
```

Because the annotation is `S.Schema<BAUser>`, TypeScript will error if the schema shape diverges — giving you **compile‑time** safety across HTTP, RPC, and atoms. (Effect Schema’s docs cover `Struct`, `Union`, `OptionFrom*`, etc.) ([Effect][8])

### 7.2 **Zod‑assisted** (optional)

If you already have Zod 4 schemas (some Better Auth plugins use Zod), you can convert them to JSON Schema natively (`z.toJSONSchema`) and then into a basic Effect Schema with a simple adapter (objects, strings, numbers, booleans, arrays, enums, nullable). ([Zod][3])

```ts
// server/ZodInterop.ts  (simple, non-exhaustive)
import { Schema as S } from "effect";
import * as z from "zod";

type J = any;

export function fromZod(zod: z.ZodTypeAny): S.Schema.Any {
  const json: J = (z as any).toJSONSchema?.() ?? (z as any)._def?.json ?? null;
  if (!json) return S.Unknown;
  return fromJsonSchema(json);
}

export function fromJsonSchema(j: J): S.Schema.Any {
  if (j.$ref) return S.Unknown; // keep simple
  if (j.anyOf) return S.Union(...(j.anyOf.map(fromJsonSchema) as any));
  if (j.type === "null") return S.Null;
  if (Array.isArray(j.type)) {
    // e.g. ["string","null"]
    const parts = j.type.map((t: string) => fromJsonSchema({ type: t }));
    return S.Union(...(parts as any));
  }
  switch (j.type) {
    case "object": {
      const props = Object.entries(j.properties ?? {}).reduce(
        (acc, [k, v]) => {
          // mark missing from "required" as optional
          const isReq = (j.required ?? []).includes(k);
          const s = fromJsonSchema(v);
          acc[k] = isReq ? s : S.optional(s as any);
          return acc;
        },
        {} as Record<string, S.Schema.Any>,
      );
      return S.Struct(props as any);
    }
    case "string":
      return S.String;
    case "number":
      return S.Number;
    case "integer":
      return S.Number; // coarse
    case "boolean":
      return S.Boolean;
    case "array":
      return S.Array(fromJsonSchema(j.items ?? {}));
    default:
      if (j.enum) return S.Union(...((j.enum as ReadonlyArray<any>).map(S.Literal) as any));
      return S.Unknown;
  }
}
```

> This is intentionally small; if you need full fidelity, keep your **Effect Schemas** as the source of truth and optionally export JSON Schema via `JSONSchema.make`. ([Effect][9])

---

## 8) Putting it all together (end‑to‑end)

### 8.1 Server bootstrap (Node / Bun / Deno / Workers)

```ts
// server/main.ts
import { Layer, Effect } from "effect";
import * as NodeServer from "@effect/platform-node/NodeHttpServer";
import * as HttpServer from "@effect/platform/HttpServer";
import * as HttpRouter from "@effect/platform/HttpRouter";

import { betterAuth } from "better-auth";
import { createEffectBetterAuth } from "effect-better-auth/builder";
import { UserSchema, SessionSchema } from "./schemas";

const ba = betterAuth({
  /* your config */
});

// Create the fully-typed kit
const EBA = createEffectBetterAuth({
  ba,
  basePath: "/api/auth",
  schemas: { User: UserSchema, Session: SessionSchema },
});

// Define your app
const routes = HttpRouter.empty.pipe(
  EBA.http.mount, // mount Better Auth endpoints at /api/auth
  EBA.http.injectSession, // provide CurrentSession for the rest
  HttpRouter.get(
    "/me",
    Effect.gen(function* () {
      yield* EBA.http.requireSession; // 401 if not logged in
      // Use CurrentSession if you want the raw value (unknown), or make a typed guard:
      return HttpServer.response.json({ ok: true });
    }),
  ),
);

const AppLive = Layer.mergeAll(
  NodeServer.layer,
  HttpServer.serve(HttpRouter.toHttpApp(routes)),
  EBA.layers.ConfigLive,
  EBA.layers.AuthLive,
  EBA.layers.RpcLive,
);

Effect.runFork(Layer.launch(AppLive));
```

- Using `HttpRouter.mountApp` / `toHttpApp` and Effect’s fetch conversions is the **documented** way to integrate with platform servers. ([Effect TS][5])

### 8.2 React client

```tsx
// client/App.tsx
import React from "react";
import { useAtomValue, useAtomSet } from "@effect-atom/atom-react";
import { EBA } from "./eba-singleton"; // re-exported builder result
// Wire your RPC protocol layer once somewhere (e.g., HTTP or WS)

const SessionAtom = EBA.client.sessionAtom();
const SignOutAtom = EBA.client.signOutAtom();

export function UserBadge() {
  const session = useAtomValue(SessionAtom);
  const signOut = useAtomSet(SignOutAtom);

  const data = "ok" in session ? session.ok : { user: null, session: null };
  if (!data.user) {
    return <a href="/api/auth/sign-in">Sign in</a>;
  }
  return (
    <div>
      Hello {data.user.name ?? "user"}
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

---

## 9) Public API (clean surface)

```ts
// server
export { BetterAuthConfig } from "./server/Config";
export { Auth } from "./server/Auth";
export * as Http from "./server/Http";
export { makeAuthRpc } from "./server/Rpc";

// client
export { makeAuthClient } from "./client/rpcClient";
export { sessionAtom, signOutAtom } from "./client/atoms";

// builder
export { createEffectBetterAuth } from "./builder";

// zod interop (optional)
export { fromZod, fromJsonSchema } from "./server/ZodInterop";
```

No tag generics. All typing flows from **schemas** you provide to the **builder**.

---

## 10) Why this is idiomatic (and what we changed)

- **Non‑generic service/Tag** — We keep `Auth` as a stable capability; your app’s data _shapes_ travel as **schemas** and typed helper functions. This matches Effect’s guidance on services/layers and avoids “parametric tags”. ([Effect][1])
- **`Effect.Service` for construction** — the service defines its **Default** layer and reads its deps (here: `BetterAuthConfig`), instead of hand‑rolled factories. ([Effect][1])
- **Platform‑native mounting** — use `HttpRouter.mountApp` + fetch bridging (`HttpApp` / `HttpServerRequest` conversions) to adapt BA’s handler. ([Effect TS][5])
- **Session accessor aligned with BA** — `auth.api.getSession({ headers })` is how the docs show server‑side session lookup. ([Better Auth][6])
- **Type flow leverages `$Infer`** — you derive `User` / `Session` types from _your_ Better Auth instance, then bind runtime schemas to those types. ([Better Auth][2])
- **RPC & effect‑atom** — we use the canonical `RpcGroup` and `AtomRpc.Tag` patterns to expose typed queries/mutations. ([npm][7])

---

## 11) FAQ / Gotchas

- **“Can you auto‑generate Effect Schemas from Better Auth?”**
  Not reliably at runtime; Better Auth’s types are TypeScript‑only. If you have **Zod 4** shapes, you can convert to JSON Schema and then to Effect Schema (see `ZodInterop.ts`) for many common constructs, but for full fidelity prefer writing **Effect Schemas** directly and keeping them single‑source (you can also emit JSON Schema from them for docs). ([Zod][3])

- **“Why not make `CurrentSession` generic?”**
  Because tags are _global capabilities_, not parameterized. We keep the tag stable and push typing to the **builder** (guards, RPC success schema) so you still get strong types at the edges without generic tags.

- **“Does this work across Node / Bun / Deno / Workers?”**
  Yes — `@effect/platform` is designed for that, and we mount a web‑handler‑compatible app. ([Effect][10])

---

### Wrap‑up

This revision removes the non‑idiomatic generic tags and “dynamic import types”, centralizes the **types** in **Effect Schemas**, and wires them through **HTTP**, **RPC**, and **atoms**, while letting Better Auth’s **handler** and **getSession** do the heavy lifting exactly as their docs intend. If you share your concrete Better Auth config (extra user/session fields, plugins), I can sketch the precise `UserSchema` / `SessionSchema` that _satisfy_ `typeof auth.$Infer.*` and plug them into the builder so everything is 100% typed end‑to‑end.

[1]: https://effect.website/docs/requirements-management/layers/?utm_source=chatgpt.com "Managing Layers | Effect Documentation"
[2]: https://www.better-auth.com/docs/concepts/typescript?utm_source=chatgpt.com "TypeScript"
[3]: https://zod.dev/json-schema?utm_source=chatgpt.com "JSON Schema"
[4]: https://www.better-auth.com/docs/concepts/api?utm_source=chatgpt.com "API"
[5]: https://effect-ts.github.io/effect/platform/HttpRouter.ts.html?utm_source=chatgpt.com "HttpRouter.ts - effect"
[6]: https://www.better-auth.com/docs/basic-usage?utm_source=chatgpt.com "Basic Usage"
[7]: https://www.npmjs.com/package/%40effect/rpc?utm_source=chatgpt.com "effect/rpc"
[8]: https://effect.website/docs/schema/getting-started/?utm_source=chatgpt.com "Getting Started"
[9]: https://effect.website/docs/schema/json-schema/?utm_source=chatgpt.com "Schema to JSON Schema | Effect Documentation"
[10]: https://effect.website/docs/platform/introduction/?utm_source=chatgpt.com "Introduction to Effect Platform | Effect Documentation"
