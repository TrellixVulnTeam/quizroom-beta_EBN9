"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var auth_guard_service_1 = require("./auth-guard.service");
exports.authProviders = [
    auth_guard_service_1.AuthGuard
];
exports.appRoutes = [
    { path: "", redirectTo: "/login", pathMatch: "full" }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLnJvdXRlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcC5yb3V0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyREFBaUQ7QUFFcEMsUUFBQSxhQUFhLEdBQUc7SUFDM0IsOEJBQVM7Q0FDVixDQUFDO0FBRVcsUUFBQSxTQUFTLEdBQUc7SUFDdkIsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRTtDQUN0RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXV0aEd1YXJkIH0gZnJvbSBcIi4vYXV0aC1ndWFyZC5zZXJ2aWNlXCI7XHJcblxyXG5leHBvcnQgY29uc3QgYXV0aFByb3ZpZGVycyA9IFtcclxuICBBdXRoR3VhcmRcclxuXTtcclxuXHJcbmV4cG9ydCBjb25zdCBhcHBSb3V0ZXMgPSBbXHJcbiAgeyBwYXRoOiBcIlwiLCByZWRpcmVjdFRvOiBcIi9sb2dpblwiLCBwYXRoTWF0Y2g6IFwiZnVsbFwiIH1cclxuXTtcclxuIl19