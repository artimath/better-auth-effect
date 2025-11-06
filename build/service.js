import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db";
import * as Effect from "effect/Effect";
import { AuthEnv, getAuthSecret } from "./env.js";
import { AuthKysely } from "./kysely.js";
const makeAuth = Effect.gen(function* () {
    const env = yield* AuthEnv;
    const kysely = yield* AuthKysely;
    const options = {
        baseURL: env.BETTER_AUTH_URL,
        secret: getAuthSecret(env),
        emailAndPassword: {
            enabled: true,
        },
        database: {
            db: kysely,
            type: "postgres",
            casing: "camel",
        },
        trustedOrigins: [env.CLIENT_ORIGIN, env.BETTER_AUTH_URL],
    };
    const { runMigrations } = yield* Effect.promise(() => getMigrations(options));
    yield* Effect.promise(runMigrations);
    return betterAuth(options);
});
export class Auth extends Effect.Service()("Auth", {
    effect: makeAuth,
    dependencies: [AuthKysely.Default, AuthEnv.Default],
}) {
}
//# sourceMappingURL=service.js.map