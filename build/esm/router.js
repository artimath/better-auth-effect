"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetterAuthRouterLive = exports.BetterAuthRouter = exports.betterAuthHandler = void 0;
var HttpLayerRouter = require("@effect/platform/HttpLayerRouter");
var HttpServerResponse = require("@effect/platform/HttpServerResponse");
var Effect = require("effect/Effect");
var Layer = require("effect/Layer");
var node_stream_1 = require("node:stream");
var service_js_1 = require("./service.js");
var betterAuthHandler = function (req) {
    return Effect.gen(function () {
        var auth, headers, host, protocol, url, bodyInit, arrayBuffer, request, webResponse, responseHeaders, stream;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [5 /*yield**/, __values(service_js_1.Auth)];
                case 1:
                    auth = _c.sent();
                    headers = new Headers(req.headers);
                    host = (_a = headers.get("host")) !== null && _a !== void 0 ? _a : "localhost:3000";
                    protocol = (_b = headers.get("x-forwarded-proto")) !== null && _b !== void 0 ? _b : "http";
                    url = req.url.startsWith("http://") || req.url.startsWith("https://")
                        ? req.url
                        : "".concat(protocol, "://").concat(host).concat(req.url.startsWith("/") ? req.url : "/".concat(req.url));
                    bodyInit = null;
                    if (!(req.method !== "GET" && req.method !== "HEAD")) return [3 /*break*/, 3];
                    return [5 /*yield**/, __values(req.arrayBuffer)];
                case 2:
                    arrayBuffer = _c.sent();
                    if (arrayBuffer.byteLength > 0) {
                        bodyInit = new Uint8Array(arrayBuffer);
                    }
                    else {
                        bodyInit = new Uint8Array(0);
                    }
                    _c.label = 3;
                case 3:
                    request = new Request(url, {
                        method: req.method,
                        headers: headers,
                        redirect: "manual",
                        body: bodyInit,
                    });
                    return [5 /*yield**/, __values(Effect.promise(function () { return auth.handler(request); }))];
                case 4:
                    webResponse = _c.sent();
                    responseHeaders = {};
                    webResponse.headers.forEach(function (value, key) {
                        responseHeaders[key] = value;
                    });
                    stream = webResponse.body
                        ? node_stream_1.Readable.fromWeb(webResponse.body)
                        : null;
                    return [2 /*return*/, HttpServerResponse.raw(stream).pipe(HttpServerResponse.setStatus(webResponse.status), HttpServerResponse.setHeaders(responseHeaders))];
            }
        });
    }).pipe(Effect.catchAll(function (error) {
        return Effect.logError(error).pipe(Effect.zipRight(HttpServerResponse.text("Auth handler error", { status: 500 })));
    }));
};
exports.betterAuthHandler = betterAuthHandler;
exports.BetterAuthRouter = HttpLayerRouter.addAll([
    HttpLayerRouter.route("*", "/api/auth/*", exports.betterAuthHandler),
]);
exports.BetterAuthRouterLive = exports.BetterAuthRouter.pipe(Layer.provide(service_js_1.Auth.Default));
//# sourceMappingURL=router.js.map