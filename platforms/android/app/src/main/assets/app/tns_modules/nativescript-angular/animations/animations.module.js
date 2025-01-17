Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var animations_1 = require("@angular/animations");
var browser_1 = require("@angular/animations/browser");
var animations_2 = require("@angular/platform-browser/animations");
var nativescript_module_1 = require("../nativescript.module");
var renderer_1 = require("../renderer");
var animation_driver_1 = require("./animation-driver");
var InjectableAnimationEngine = (function (_super) {
    __extends(InjectableAnimationEngine, _super);
    function InjectableAnimationEngine(driver, normalizer) {
        return _super.call(this, driver, normalizer) || this;
    }
    InjectableAnimationEngine.decorators = [
        { type: core_1.Injectable },
    ];
    /** @nocollapse */
    InjectableAnimationEngine.ctorParameters = function () { return [
        { type: browser_1.AnimationDriver, },
        { type: browser_1.ɵAnimationStyleNormalizer, },
    ]; };
    return InjectableAnimationEngine;
}(browser_1.ɵAnimationEngine));
exports.InjectableAnimationEngine = InjectableAnimationEngine;
function instantiateSupportedAnimationDriver() {
    return new animation_driver_1.NativeScriptAnimationDriver();
}
exports.instantiateSupportedAnimationDriver = instantiateSupportedAnimationDriver;
function instantiateRendererFactory(renderer, engine, zone) {
    return new animations_2.ɵAnimationRendererFactory(renderer, engine, zone);
}
exports.instantiateRendererFactory = instantiateRendererFactory;
function instantiateDefaultStyleNormalizer() {
    return new browser_1.ɵWebAnimationsStyleNormalizer();
}
exports.instantiateDefaultStyleNormalizer = instantiateDefaultStyleNormalizer;
exports.NATIVESCRIPT_ANIMATIONS_PROVIDERS = [
    { provide: browser_1.AnimationDriver, useFactory: instantiateSupportedAnimationDriver },
    { provide: animations_1.AnimationBuilder, useClass: animations_2.ɵBrowserAnimationBuilder },
    { provide: browser_1.ɵAnimationStyleNormalizer, useFactory: instantiateDefaultStyleNormalizer },
    { provide: browser_1.ɵAnimationEngine, useClass: InjectableAnimationEngine },
    {
        provide: core_1.RendererFactory2,
        useFactory: instantiateRendererFactory,
        deps: [renderer_1.NativeScriptRendererFactory, browser_1.ɵAnimationEngine, core_1.NgZone]
    }
];
var NativeScriptAnimationsModule = (function () {
    function NativeScriptAnimationsModule() {
    }
    NativeScriptAnimationsModule.decorators = [
        { type: core_1.NgModule, args: [{
                    imports: [nativescript_module_1.NativeScriptModule],
                    providers: exports.NATIVESCRIPT_ANIMATIONS_PROVIDERS,
                },] },
    ];
    /** @nocollapse */
    NativeScriptAnimationsModule.ctorParameters = function () { return []; };
    return NativeScriptAnimationsModule;
}());
exports.NativeScriptAnimationsModule = NativeScriptAnimationsModule;
//# sourceMappingURL=animations.module.js.map