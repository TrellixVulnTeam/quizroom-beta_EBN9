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
import * as api from '../protos/firestore_proto_api';
import { CredentialsProvider, Token } from '../api/credentials';
import { DatabaseInfo } from '../core/database_info';
import { SnapshotVersion } from '../core/snapshot_version';
import { ProtoByteString, TargetId } from '../core/types';
import { QueryData } from '../local/query_data';
import { Mutation, MutationResult } from '../model/mutation';
import { AsyncQueue } from '../util/async_queue';
import { FirestoreError } from '../util/error';
import { ExponentialBackoff } from './backoff';
import { Connection, Stream } from './connection';
import { JsonProtoSerializer } from './serializer';
import { WatchChange } from './watch_change';
export interface WriteRequest extends api.WriteRequest {
    database?: string;
}
/**
 * Provides a common interface that is shared by the listeners for stream
 * events by the concrete implementation classes.
 */
export interface PersistentStreamListener {
    /**
     * Called after the stream was established and can accept outgoing
     * messages
     */
    onOpen: () => Promise<void>;
    /**
     * Called after the stream has closed. If there was an error, the
     * FirestoreError will be set.
     */
    onClose: (err?: FirestoreError) => Promise<void>;
}
/**
 * A PersistentStream is an abstract base class that represents a streaming RPC
 * to the Firestore backend. It's built on top of the connections own support
 * for streaming RPCs, and adds several critical features for our clients:
 *
 *   - Exponential backoff on failure
 *   - Authentication via CredentialsProvider
 *   - Dispatching all callbacks into the shared worker queue
 *
 * Subclasses of PersistentStream implement serialization of models to and
 * from the JSON representation of the protocol buffers for a specific
 * streaming RPC.
 *
 * ## Starting and Stopping
 *
 * Streaming RPCs are stateful and need to be `start`ed before messages can
 * be sent and received. The PersistentStream will call the onOpen function
 * of the listener once the stream is ready to accept requests.
 *
 * Should a `start` fail, PersistentStream will call the registered
 * onClose with a FirestoreError indicating what went wrong.
 *
 * A PersistentStream can be started and stopped repeatedly.
 *
 * Generic types:
 *  SendType: The type of the outgoing message of the underlying
 *    connection stream
 *  ReceiveType: The type of the incoming message of the underlying
 *    connection stream
 *  ListenerType: The type of the listener that will be used for callbacks
 */
export declare abstract class PersistentStream<SendType, ReceiveType, ListenerType extends PersistentStreamListener> {
    private queue;
    protected connection: Connection;
    private credentialsProvider;
    private state;
    private idle;
    private stream;
    protected backoff: ExponentialBackoff;
    protected listener: ListenerType | null;
    constructor(queue: AsyncQueue, connection: Connection, credentialsProvider: CredentialsProvider, initialBackoffDelay?: number);
    /**
     * Returns true if `start` has been called and no error has occurred. True
     * indicates the stream is open or in the process of opening (which
     * encompasses respecting backoff, getting auth tokens, and starting the
     * actual RPC). Use `isOpen` to determine if the stream is open and ready for
     * outbound requests.
     */
    isStarted(): boolean;
    /**
     * Returns true if the underlying RPC is open (the openHandler has been
     * called) and the stream is ready for outbound requests.
     */
    isOpen(): boolean;
    /**
     * Starts the RPC. Only allowed if isStarted returns false. The stream is
     * not immediately ready for use: onOpen will be invoked when the RPC is ready
     * for outbound requests, at which point isOpen will return true.
     *
     *  When start returns, isStarted will return true.
     */
    start(listener: ListenerType): void;
    /**
     * Stops the RPC. This call is idempotent and allowed regardless of the
     * current isStarted state.
     *
     * When stop returns, isStarted and isOpen will both return false.
     */
    stop(): void;
    /**
     * After an error the stream will usually back off on the next attempt to
     * start it. If the error warrants an immediate restart of the stream, the
     * sender can use this to indicate that the receiver should not back off.
     *
     * Each error will call the onClose function. That function can decide to
     * inhibit backoff if required.
     */
    inhibitBackoff(): void;
    /**
     * Initializes the idle timer. If no write takes place within one minute, the
     * WebChannel stream will be closed.
     */
    markIdle(): void;
    /** Sends a message to the underlying stream. */
    protected sendRequest(msg: SendType): void;
    /** Called by the idle timer when the stream should close due to inactivity. */
    private handleIdleCloseTimer();
    /** Marks the stream as active again. */
    private cancelIdleCheck();
    /**
     * Closes the stream and cleans up as necessary:
     *
     * * closes the underlying GRPC stream;
     * * calls the onClose handler with the given 'error';
     * * sets internal stream state to 'finalState';
     * * adjusts the backoff timer based on the error
     *
     * A new stream can be opened by calling `start` unless `finalState` is set to
     * `PersistentStreamState.Stopped`.
     *
     * @param finalState the intended state of the stream after closing.
     * @param error the error the connection was closed with.
     */
    private close(finalState, error?);
    /**
     * Can be overridden to perform additional cleanup before the stream is closed.
     * Calling super.tearDown() is not required.
     */
    protected tearDown(): void;
    /**
     * Used by subclasses to start the concrete RPC and return the underlying
     * connection stream.
     */
    protected abstract startRpc(token: Token | null): Stream<SendType, ReceiveType>;
    /**
     * Called after the stream has received a message. The function will be
     * called on the right queue and must return a Promise.
     * @param message The message received from the stream.
     */
    protected abstract onMessage(message: ReceiveType): Promise<void>;
    private auth();
    private startStream(token);
    private performBackoff(listener);
    private handleStreamClose(error?);
}
/** Listener for the PersistentWatchStream */
export interface WatchStreamListener extends PersistentStreamListener {
    /**
     * Called on a watchChange. The snapshot parameter will be MIN if the watch
     * change did not have a snapshot associated with it.
     */
    onWatchChange: (watchChange: WatchChange, snapshot: SnapshotVersion) => Promise<void>;
}
/**
 * A PersistentStream that implements the Listen RPC.
 *
 * Once the Listen stream has called the openHandler, any number of listen and
 * unlisten calls calls can be sent to control what changes will be sent from
 * the server for ListenResponses.
 */
export declare class PersistentListenStream extends PersistentStream<api.ListenRequest, api.ListenResponse, WatchStreamListener> {
    private databaseInfo;
    private serializer;
    constructor(databaseInfo: DatabaseInfo, queue: AsyncQueue, connection: Connection, credentials: CredentialsProvider, serializer: JsonProtoSerializer, initialBackoffDelay?: number);
    protected startRpc(token: Token | null): Stream<api.ListenRequest, api.ListenResponse>;
    protected onMessage(watchChangeProto: api.ListenResponse): Promise<void>;
    /**
     * Registers interest in the results of the given query. If the query
     * includes a resumeToken it will be included in the request. Results that
     * affect the query will be streamed back as WatchChange messages that
     * reference the targetId.
     */
    watch(queryData: QueryData): void;
    /**
     * Unregisters interest in the results of the query associated with the
     * given targetId.
     */
    unwatch(targetId: TargetId): void;
}
/** Listener for the PersistentWriteStream */
export interface WriteStreamListener extends PersistentStreamListener {
    /**
     * Called by the PersistentWriteStream upon a successful handshake response
     * from the server, which is the receiver's cue to send any pending writes.
     */
    onHandshakeComplete: () => Promise<void>;
    /**
     * Called by the PersistentWriteStream upon receiving a StreamingWriteResponse
     * from the server that contains a mutation result.
     */
    onMutationResult: (commitVersion: SnapshotVersion, results: MutationResult[]) => Promise<void>;
}
/**
 * A Stream that implements the Write RPC.
 *
 * The Write RPC requires the caller to maintain special streamToken
 * state in between calls, to help the server understand which responses the
 * client has processed by the time the next request is made. Every response
 * will contain a streamToken; this value must be passed to the next
 * request.
 *
 * After calling start() on this stream, the next request must be a handshake,
 * containing whatever streamToken is on hand. Once a response to this
 * request is received, all pending mutations may be submitted. When
 * submitting multiple batches of mutations at the same time, it's
 * okay to use the same streamToken for the calls to writeMutations.
 *
 * TODO(b/33271235): Use proto types
 */
export declare class PersistentWriteStream extends PersistentStream<api.WriteRequest, api.WriteResponse, WriteStreamListener> {
    private databaseInfo;
    private serializer;
    private handshakeComplete_;
    constructor(databaseInfo: DatabaseInfo, queue: AsyncQueue, connection: Connection, credentials: CredentialsProvider, serializer: JsonProtoSerializer, initialBackoffDelay?: number);
    /**
     * The last received stream token from the server, used to acknowledge which
     * responses the client has processed. Stream tokens are opaque checkpoint
     * markers whose only real value is their inclusion in the next request.
     *
     * PersistentWriteStream manages propagating this value from responses to the
     * next request.
     */
    lastStreamToken: ProtoByteString;
    /**
     * Tracks whether or not a handshake has been successfully exchanged and
     * the stream is ready to accept mutations.
     */
    readonly handshakeComplete: boolean;
    start(listener: WriteStreamListener): void;
    protected tearDown(): void;
    protected startRpc(token: Token | null): Stream<api.WriteRequest, api.WriteResponse>;
    protected onMessage(responseProto: api.WriteResponse): Promise<void>;
    /**
     * Sends an initial streamToken to the server, performing the handshake
     * required to make the StreamingWrite RPC work. Subsequent
     * calls should wait until onHandshakeComplete was called.
     */
    writeHandshake(): void;
    /** Sends a group of mutations to the Firestore backend to apply. */
    writeMutations(mutations: Mutation[]): void;
}
