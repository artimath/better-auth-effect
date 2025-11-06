import * as Effect from "effect/Effect";
import { Kysely } from "kysely";
import { AuthEnv } from "./env.js";
declare const AuthKysely_base: Effect.Service.Class<AuthKysely, "AuthKysely", {
    readonly scoped: Effect.Effect<Kysely<unknown>, unknown, unknown>;
    readonly dependencies: readonly [import("effect/Layer").Layer<AuthEnv, import("effect/ConfigError").ConfigError, never>];
}>;
export declare class AuthKysely extends AuthKysely_base {
}
export {};
