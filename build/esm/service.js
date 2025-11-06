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
exports.Auth = void 0;
var better_auth_1 = require("better-auth");
var db_1 = require("better-auth/db");
var Effect = require("effect/Effect");
var env_js_1 = require("./env.js");
var kysely_js_1 = require("./kysely.js");
var makeAuth = Effect.gen(function () {
    var env, kysely, options, runMigrations;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [5 /*yield**/, __values(env_js_1.AuthEnv)];
            case 1:
                env = _a.sent();
                return [5 /*yield**/, __values(kysely_js_1.AuthKysely)];
            case 2:
                kysely = _a.sent();
                options = {
                    baseURL: env.BETTER_AUTH_URL,
                    secret: (0, env_js_1.getAuthSecret)(env),
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
                return [5 /*yield**/, __values(Effect.promise(function () { return (0, db_1.getMigrations)(options); }))];
            case 3:
                runMigrations = (_a.sent()).runMigrations;
                return [5 /*yield**/, __values(Effect.promise(runMigrations))];
            case 4:
                _a.sent();
                return [2 /*return*/, (0, better_auth_1.betterAuth)(options)];
        }
    });
});
var Auth = /** @class */ (function (_super) {
    __extends(Auth, _super);
    function Auth() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Auth;
}(Effect.Service()("Auth", {
    effect: makeAuth,
    dependencies: [kysely_js_1.AuthKysely.Default, env_js_1.AuthEnv.Default],
})));
exports.Auth = Auth;
//# sourceMappingURL=service.js.map