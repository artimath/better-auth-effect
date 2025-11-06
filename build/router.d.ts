import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Auth } from "./service.js";
export declare const betterAuthHandler: (req: HttpServerRequest.HttpServerRequest) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, Auth>;
export declare const BetterAuthRouter: Layer.Layer<never, never, HttpLayerRouter.HttpRouter | HttpLayerRouter.Request<"Requires", Auth>>;
export declare const BetterAuthRouterLive: Layer.Layer<never, import("effect/ConfigError").ConfigError, HttpLayerRouter.HttpRouter | HttpLayerRouter.Request<"Requires", Auth>>;
//# sourceMappingURL=router.d.ts.map