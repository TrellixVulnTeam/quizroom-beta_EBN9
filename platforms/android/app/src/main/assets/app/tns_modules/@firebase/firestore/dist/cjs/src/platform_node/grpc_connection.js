"use strict";
/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var grpc = require("grpc");
var app_1 = require("@firebase/app");
var SDK_VERSION = app_1.default.SDK_VERSION;
var grpcVersion = require('grpc/package.json').version;
var stream_bridge_1 = require("../remote/stream_bridge");
var rpc_error_1 = require("../remote/rpc_error");
var assert_1 = require("../util/assert");
var error_1 = require("../util/error");
var log = require("../util/log");
var node_api_1 = require("../util/node_api");
var promise_1 = require("../util/promise");
var LOG_TAG = 'Connection';
// TODO(b/38203344): The SDK_VERSION is set independently from Firebase because
// we are doing out-of-band releases. Once we release as part of Firebase, we
// should use the Firebase version instead.
var X_GOOG_API_CLIENT_VALUE = "gl-node/" + process.versions.node + " fire/" + SDK_VERSION + " grpc/" + grpcVersion;
function createHeaders(databaseInfo, token) {
    assert_1.assert(token === null || token.type === 'OAuth', 'If provided, token must be OAuth');
    var channelCredentials = databaseInfo.ssl
        ? grpc.credentials.createSsl()
        : grpc.credentials.createInsecure();
    var callCredentials = grpc.credentials.createFromMetadataGenerator(function (context, cb) {
        var metadata = new grpc.Metadata();
        if (token) {
            for (var header in token.authHeaders) {
                if (token.authHeaders.hasOwnProperty(header)) {
                    metadata.set(header, token.authHeaders[header]);
                }
            }
        }
        metadata.set('x-goog-api-client', X_GOOG_API_CLIENT_VALUE);
        // This header is used to improve routing and project isolation by the
        // backend.
        metadata.set('google-cloud-resource-prefix', "projects/" + databaseInfo.databaseId.projectId + "/" +
            ("databases/" + databaseInfo.databaseId.database));
        cb(null, metadata);
    });
    return grpc.credentials.combineChannelCredentials(channelCredentials, callCredentials);
}
/**
 * A Connection implemented by GRPC-Node.
 */
var GrpcConnection = /** @class */ (function () {
    function GrpcConnection(protos, databaseInfo) {
        this.databaseInfo = databaseInfo;
        // We cache stubs for the most-recently-used token.
        this.cachedStub = null;
        this.firestore = protos['google']['firestore']['v1beta1'];
    }
    GrpcConnection.prototype.sameToken = function (tokenA, tokenB) {
        var valueA = tokenA && tokenA.authHeaders['Authorization'];
        var valueB = tokenB && tokenB.authHeaders['Authorization'];
        return valueA === valueB;
    };
    // tslint:disable-next-line:no-any
    GrpcConnection.prototype.getStub = function (token) {
        if (!this.cachedStub || !this.sameToken(this.cachedStub.token, token)) {
            log.debug(LOG_TAG, 'Creating Firestore stub.');
            var credentials = createHeaders(this.databaseInfo, token);
            this.cachedStub = {
                stub: new this.firestore.Firestore(this.databaseInfo.host, credentials),
                token: token
            };
        }
        return this.cachedStub.stub;
    };
    GrpcConnection.prototype.getRpc = function (rpcName, token) {
        var stub = this.getStub(token);
        // RPC Methods have the first character lower-cased
        // (e.g. Listen => listen(), BatchGetDocuments => batchGetDocuments()).
        var rpcMethod = rpcName.charAt(0).toLowerCase() + rpcName.slice(1);
        var rpc = stub[rpcMethod];
        assert_1.assert(rpc != null, 'Unknown RPC: ' + rpcName);
        return rpc.bind(stub);
    };
    GrpcConnection.prototype.invokeRPC = function (rpcName, request, token) {
        var rpc = this.getRpc(rpcName, token);
        return node_api_1.nodePromise(function (callback) {
            log.debug(LOG_TAG, "RPC '" + rpcName + "' invoked with request:", request);
            return rpc(request, function (grpcError, value) {
                if (grpcError) {
                    log.debug(LOG_TAG, "RPC '" + rpcName + "' failed with error:", grpcError);
                    callback(new error_1.FirestoreError(rpc_error_1.mapCodeFromRpcCode(grpcError.code), grpcError.message));
                }
                else {
                    log.debug(LOG_TAG, "RPC '" + rpcName + "' completed with response:", value);
                    callback(undefined, value);
                }
            });
        });
    };
    GrpcConnection.prototype.invokeStreamingRPC = function (rpcName, request, token) {
        var rpc = this.getRpc(rpcName, token);
        var results = [];
        var responseDeferred = new promise_1.Deferred();
        log.debug(LOG_TAG, "RPC '" + rpcName + "' invoked (streaming) with request:", request);
        var stream = rpc(request);
        stream.on('data', function (response) {
            log.debug(LOG_TAG, "RPC " + rpcName + " received result:", response);
            results.push(response);
        });
        stream.on('end', function () {
            log.debug(LOG_TAG, "RPC '" + rpcName + "' completed.");
            responseDeferred.resolve(results);
        });
        stream.on('error', function (grpcError) {
            log.debug(LOG_TAG, "RPC '" + rpcName + "' failed with error:", grpcError);
            var code = rpc_error_1.mapCodeFromRpcCode(grpcError.code);
            responseDeferred.reject(new error_1.FirestoreError(code, grpcError.message));
        });
        return responseDeferred.promise;
    };
    // TODO(mikelehen): This "method" is a monster. Should be refactored.
    GrpcConnection.prototype.openStream = function (rpcName, token) {
        var rpc = this.getRpc(rpcName, token);
        var grpcStream = rpc();
        var closed = false;
        var close;
        var remoteEnded = false;
        var stream = new stream_bridge_1.StreamBridge({
            sendFn: function (msg) {
                if (!closed) {
                    log.debug(LOG_TAG, 'GRPC stream sending:', msg);
                    try {
                        grpcStream.write(msg);
                    }
                    catch (e) {
                        // This probably means we didn't conform to the proto.  Make sure to
                        // log the message we sent.
                        log.error('Failure sending:', msg);
                        log.error('Error:', e);
                        throw e;
                    }
                }
                else {
                    log.debug(LOG_TAG, 'Not sending because gRPC stream is closed:', msg);
                }
            },
            closeFn: function () {
                log.debug(LOG_TAG, 'GRPC stream closed locally via close().');
                close();
            }
        });
        close = function (err) {
            if (!closed) {
                closed = true;
                stream.callOnClose(err);
                grpcStream.end();
            }
        };
        grpcStream.on('data', function (msg) {
            if (!closed) {
                log.debug(LOG_TAG, 'GRPC stream received:', msg);
                stream.callOnMessage(msg);
            }
        });
        grpcStream.on('end', function () {
            log.debug(LOG_TAG, 'GRPC stream ended.');
            close();
        });
        grpcStream.on('finish', function () {
            // TODO(mikelehen): I *believe* this assert is safe and we can just remove
            // the 'finish' event if we don't see the assert getting hit for a while.
            assert_1.assert(closed, 'Received "finish" event without close() being called.');
        });
        grpcStream.on('error', function (grpcError) {
            log.debug(LOG_TAG, 'GRPC stream error. Code:', grpcError.code, 'Message:', grpcError.message);
            var code = rpc_error_1.mapCodeFromRpcCode(grpcError.code);
            close(new error_1.FirestoreError(code, grpcError.message));
        });
        grpcStream.on('status', function (status) {
            // TODO(mikelehen): I *believe* this assert is safe and we can just remove
            // the 'status' event if we don't see the assert getting hit for a while.
            assert_1.assert(closed, "status event received before \"end\" or \"error\". " +
                ("code: " + status.code + " details: " + status.details));
        });
        log.debug(LOG_TAG, 'Opening GRPC stream');
        // TODO(dimond): Since grpc has no explicit open status (or does it?) we
        // simulate an onOpen in the next loop after the stream had it's listeners
        // registered
        setTimeout(function () {
            stream.callOnOpen();
        }, 0);
        return stream;
    };
    return GrpcConnection;
}());
exports.GrpcConnection = GrpcConnection;

//# sourceMappingURL=grpc_connection.js.map
