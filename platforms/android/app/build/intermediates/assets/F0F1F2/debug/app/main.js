"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// this import should be first in order to load some required settings (like globals and reflect-metadata)
var platform_1 = require("nativescript-angular/platform");
var app_module_1 = require("./app.module");
var backend_service_1 = require("./services/backend.service");
var firebase = require("nativescript-plugin-firebase");
firebase.init({
    //persist should be set to false as otherwise numbers aren't returned during livesync
    persist: false,
    storageBucket: 'gs://giftler-f48c4.appspot.com',
    onAuthStateChanged: function (data) {
        console.log(JSON.stringify(data));
        if (data.loggedIn) {
            backend_service_1.BackendService.token = data.user.uid;
        }
        else {
            backend_service_1.BackendService.token = "";
        }
    }
}).then(function (instance) {
    console.log("firebase.init done");
}, function (error) {
    console.log("firebase.init error: " + error);
});
platform_1.platformNativeScriptDynamic().bootstrapModule(app_module_1.AppModule);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwwR0FBMEc7QUFDMUcsMERBQTRFO0FBRTVFLDJDQUF5QztBQUN6Qyw4REFBNEQ7QUFFNUQsdURBQTBEO0FBRTFELFFBQVEsQ0FBQyxJQUFJLENBQUM7SUFDWixxRkFBcUY7SUFDckYsT0FBTyxFQUFFLEtBQUs7SUFDZCxhQUFhLEVBQUUsZ0NBQWdDO0lBQy9DLGtCQUFrQixFQUFFLFVBQUMsSUFBUztRQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNsQixnQ0FBYyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUM7WUFDSixnQ0FBYyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDNUIsQ0FBQztJQUNILENBQUM7Q0FDRixDQUFDLENBQUMsSUFBSSxDQUNMLFVBQVUsUUFBUTtJQUNoQixPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDcEMsQ0FBQyxFQUNELFVBQVUsS0FBSztJQUNiLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsS0FBSyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUNBLENBQUM7QUFDSixzQ0FBMkIsRUFBRSxDQUFDLGVBQWUsQ0FBQyxzQkFBUyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0aGlzIGltcG9ydCBzaG91bGQgYmUgZmlyc3QgaW4gb3JkZXIgdG8gbG9hZCBzb21lIHJlcXVpcmVkIHNldHRpbmdzIChsaWtlIGdsb2JhbHMgYW5kIHJlZmxlY3QtbWV0YWRhdGEpXHJcbmltcG9ydCB7IHBsYXRmb3JtTmF0aXZlU2NyaXB0RHluYW1pYyB9IGZyb20gXCJuYXRpdmVzY3JpcHQtYW5ndWxhci9wbGF0Zm9ybVwiO1xyXG5cclxuaW1wb3J0IHsgQXBwTW9kdWxlIH0gZnJvbSBcIi4vYXBwLm1vZHVsZVwiO1xyXG5pbXBvcnQgeyBCYWNrZW5kU2VydmljZSB9IGZyb20gXCIuL3NlcnZpY2VzL2JhY2tlbmQuc2VydmljZVwiO1xyXG5cclxuaW1wb3J0IGZpcmViYXNlID0gcmVxdWlyZShcIm5hdGl2ZXNjcmlwdC1wbHVnaW4tZmlyZWJhc2VcIik7XHJcblxyXG5maXJlYmFzZS5pbml0KHtcclxuICAvL3BlcnNpc3Qgc2hvdWxkIGJlIHNldCB0byBmYWxzZSBhcyBvdGhlcndpc2UgbnVtYmVycyBhcmVuJ3QgcmV0dXJuZWQgZHVyaW5nIGxpdmVzeW5jXHJcbiAgcGVyc2lzdDogZmFsc2UsXHJcbiAgc3RvcmFnZUJ1Y2tldDogJ2dzOi8vZ2lmdGxlci1mNDhjNC5hcHBzcG90LmNvbScsXHJcbiAgb25BdXRoU3RhdGVDaGFuZ2VkOiAoZGF0YTogYW55KSA9PiB7XHJcbiAgICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShkYXRhKSlcclxuICAgIGlmIChkYXRhLmxvZ2dlZEluKSB7XHJcbiAgICAgIEJhY2tlbmRTZXJ2aWNlLnRva2VuID0gZGF0YS51c2VyLnVpZDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICBCYWNrZW5kU2VydmljZS50b2tlbiA9IFwiXCI7XHJcbiAgICB9XHJcbiAgfVxyXG59KS50aGVuKFxyXG4gIGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gICAgY29uc29sZS5sb2coXCJmaXJlYmFzZS5pbml0IGRvbmVcIik7XHJcbiAgfSxcclxuICBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiZmlyZWJhc2UuaW5pdCBlcnJvcjogXCIgKyBlcnJvcik7XHJcbiAgfVxyXG4gICk7XHJcbnBsYXRmb3JtTmF0aXZlU2NyaXB0RHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpO1xyXG4iXX0=