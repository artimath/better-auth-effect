import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
export type AuthEnvValues = {
    readonly BETTER_AUTH_URL: string;
    readonly BETTER_AUTH_SECRET: Redacted.Redacted<string>;
    readonly DATABASE_URL: Redacted.Redacted<string>;
    readonly CLIENT_ORIGIN: string;
};
declare const AuthEnv_base: Effect.Service.Class<AuthEnv, "AuthEnv", {
    readonly effect: Config.Config<AuthEnvValues>;
    readonly dependencies: readonly [Layer.Layer<never, never, never>];
}>;
export declare class AuthEnv extends AuthEnv_base {
}
export declare const getDatabaseUrl: (env: AuthEnvValues) => string;
export declare const getAuthSecret: (env: AuthEnvValues) => string;
export {};
