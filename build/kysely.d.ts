import * as Effect from "effect/Effect";
import { Kysely } from "kysely";
import { AuthEnv } from "./env.js";
declare const AuthKysely_base: Effect.Service.Class<AuthKysely, "AuthKysely", {
    readonly scoped: Effect.Effect<Kysely<unknown>, never, AuthEnv | import("effect/Scope").Scope>;
    readonly dependencies: readonly [import("effect/Layer").Layer<AuthEnv, import("effect/ConfigError").ConfigError, never>];
}>;
export declare class AuthKysely extends AuthKysely_base {
}
export {};
//# sourceMappingURL=kysely.d.ts.map