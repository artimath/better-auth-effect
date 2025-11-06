import { betterAuth } from "better-auth";
import * as Effect from "effect/Effect";
import { AuthEnv } from "./env.js";
import { AuthKysely } from "./kysely.js";
export type AuthInstance = ReturnType<typeof betterAuth>;
declare const Auth_base: Effect.Service.Class<Auth, "Auth", {
    readonly effect: Effect.Effect<import("better-auth").Auth<{
        baseURL: string;
        secret: string;
        emailAndPassword: {
            enabled: boolean;
        };
        database: {
            db: AuthKysely;
            type: "postgres";
            casing: "camel";
        };
        trustedOrigins: string[];
    }>, never, AuthEnv | AuthKysely>;
    readonly dependencies: readonly [import("effect/Layer").Layer<AuthKysely, import("effect/ConfigError").ConfigError, never>, import("effect/Layer").Layer<AuthEnv, import("effect/ConfigError").ConfigError, never>];
}>;
export declare class Auth extends Auth_base {
}
export {};
//# sourceMappingURL=service.d.ts.map