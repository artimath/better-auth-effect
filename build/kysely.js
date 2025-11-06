import * as Effect from "effect/Effect";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { AuthEnv, getDatabaseUrl } from "./env.js";
const { Pool } = pg;
const makeKysely = Effect.acquireRelease(Effect.gen(function* () {
    const env = yield* AuthEnv;
    const connectionString = getDatabaseUrl(env);
    const pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
    const dialect = new PostgresDialect({ pool });
    const kysely = new Kysely({ dialect });
    return { kysely, pool };
}), ({ kysely }) => Effect.promise(async () => {
    await kysely.destroy();
})).pipe(Effect.map(({ kysely }) => kysely));
export class AuthKysely extends Effect.Service()("AuthKysely", {
    scoped: makeKysely,
    dependencies: [AuthEnv.Default],
}) {
}
//# sourceMappingURL=kysely.js.map