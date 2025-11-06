import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { Effect } from "effect";
import { Auth } from "../src/service.js";

const migrate = Effect.gen(function* () {
  yield* Auth;
  yield* Effect.logInfo("Better Auth migrations completed");
});

NodeRuntime.runMain(migrate.pipe(Effect.provide(NodeContext.layer), Effect.provide(Auth.Default)));
