"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthSecret = exports.getDatabaseUrl = exports.AuthEnv = void 0;
var Config = require("effect/Config");
var ConfigProvider = require("effect/ConfigProvider");
var Effect = require("effect/Effect");
var Layer = require("effect/Layer");
var Option = require("effect/Option");
var Redacted = require("effect/Redacted");
var authEnvConfig = Config.all({
    BETTER_AUTH_URL: Config.string("BETTER_AUTH_URL"),
    BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
    DATABASE_URL: Config.redacted("DATABASE_URL"),
    CLIENT_ORIGIN: Config.option(Config.string("CLIENT_ORIGIN")).pipe(Config.map(Option.getOrElse(function () { return "http://localhost:5173"; }))),
});
var AuthEnv = /** @class */ (function (_super) {
    __extends(AuthEnv, _super);
    function AuthEnv() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AuthEnv;
}(Effect.Service()("AuthEnv", {
    effect: authEnvConfig,
    dependencies: [Layer.setConfigProvider(ConfigProvider.fromEnv())],
})));
exports.AuthEnv = AuthEnv;
var getDatabaseUrl = function (env) { return Redacted.value(env.DATABASE_URL); };
exports.getDatabaseUrl = getDatabaseUrl;
var getAuthSecret = function (env) { return Redacted.value(env.BETTER_AUTH_SECRET); };
exports.getAuthSecret = getAuthSecret;
//# sourceMappingURL=env.js.map