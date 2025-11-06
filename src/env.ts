import * as Config from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

export type AuthEnvValues = {
  readonly BETTER_AUTH_URL: string;
  readonly BETTER_AUTH_SECRET: Redacted.Redacted<string>;
  readonly DATABASE_URL: Redacted.Redacted<string>;
  readonly CLIENT_ORIGIN: string;
};

const authEnvConfig: Config.Config<AuthEnvValues> = Config.all({
  BETTER_AUTH_URL: Config.string("BETTER_AUTH_URL"),
  BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
  DATABASE_URL: Config.redacted("DATABASE_URL"),
  CLIENT_ORIGIN: Config.option(Config.string("CLIENT_ORIGIN")).pipe(
    Config.map(Option.getOrElse(() => "http://localhost:5173")),
  ),
});

export class AuthEnv extends Effect.Service<AuthEnv>()("AuthEnv", {
  effect: authEnvConfig,
  dependencies: [Layer.setConfigProvider(ConfigProvider.fromEnv())],
}) {}

export const getDatabaseUrl = (env: AuthEnvValues) => Redacted.value(env.DATABASE_URL);
export const getAuthSecret = (env: AuthEnvValues) => Redacted.value(env.BETTER_AUTH_SECRET);
