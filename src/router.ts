import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Readable } from "node:stream";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { Auth } from "./service.js";

export const betterAuthHandler = (req: HttpServerRequest.HttpServerRequest) =>
  Effect.gen(function* () {
    const auth = yield* Auth;

    const headers = new Headers(req.headers as Record<string, string>);
    const host = headers.get("host") ?? "localhost:3000";
    const protocol = headers.get("x-forwarded-proto") ?? "http";
    const url =
      req.url.startsWith("http://") || req.url.startsWith("https://")
        ? req.url
        : `${protocol}://${host}${req.url.startsWith("/") ? req.url : `/${req.url}`}`;

    let bodyInit: BodyInit | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const arrayBuffer = yield* req.arrayBuffer;
      if (arrayBuffer.byteLength > 0) {
        bodyInit = new Uint8Array(arrayBuffer);
      } else {
        bodyInit = new Uint8Array(0);
      }
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      redirect: "manual",
      body: bodyInit,
    });

    const webResponse = yield* Effect.promise(() => auth.handler(request));

    const responseHeaders: Record<string, string> = {};
    webResponse.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    const stream = webResponse.body
      ? Readable.fromWeb(webResponse.body as WebReadableStream)
      : null;

    return HttpServerResponse.raw(stream).pipe(
      HttpServerResponse.setStatus(webResponse.status),
      HttpServerResponse.setHeaders(responseHeaders),
    );
  }).pipe(
    Effect.catchAll((error) =>
      Effect.logError(error).pipe(
        Effect.zipRight(HttpServerResponse.text("Auth handler error", { status: 500 })),
      ),
    ),
  );

export const BetterAuthRouter = HttpLayerRouter.addAll([
  HttpLayerRouter.route("*", "/api/auth/*", betterAuthHandler),
]);

export const BetterAuthRouterLive = BetterAuthRouter.pipe(Layer.provide(Auth.Default));
