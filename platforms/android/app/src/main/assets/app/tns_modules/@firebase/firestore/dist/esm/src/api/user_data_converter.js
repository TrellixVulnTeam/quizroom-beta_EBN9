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
import { Timestamp } from '../core/timestamp';
import { ObjectValue } from '../model/field_value';
import { ArrayValue, BlobValue, BooleanValue, DoubleValue, GeoPointValue, IntegerValue, NullValue, RefValue, StringValue, TimestampValue } from '../model/field_value';
import { FieldMask, FieldTransform, PatchMutation, ServerTimestampTransform, SetMutation, TransformMutation } from '../model/mutation';
import { FieldPath } from '../model/path';
import { assert, fail } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import { isPlainObject, valueDescription } from '../util/input_validation';
import { primitiveComparator } from '../util/misc';
import * as objUtils from '../util/obj';
import { SortedMap } from '../util/sorted_map';
import * as typeUtils from '../util/types';
import { Blob } from './blob';
import { FieldPath as ExternalFieldPath, fromDotSeparatedString } from './field_path';
import { DeleteFieldValueImpl, FieldValueImpl, ServerTimestampFieldValueImpl } from './field_value';
import { GeoPoint } from './geo_point';
var RESERVED_FIELD_REGEX = /^__.*__$/;
/** The result of parsing document data (e.g. for a setData call). */
var ParsedSetData = /** @class */ (function () {
    function ParsedSetData(data, fieldMask, fieldTransforms) {
        this.data = data;
        this.fieldMask = fieldMask;
        this.fieldTransforms = fieldTransforms;
    }
    ParsedSetData.prototype.toMutations = function (key, precondition) {
        var mutations = [];
        if (this.fieldMask !== null) {
            mutations.push(new PatchMutation(key, this.data, this.fieldMask, precondition));
        }
        else {
            mutations.push(new SetMutation(key, this.data, precondition));
        }
        if (this.fieldTransforms.length > 0) {
            mutations.push(new TransformMutation(key, this.fieldTransforms));
        }
        return mutations;
    };
    return ParsedSetData;
}());
export { ParsedSetData };
/** The result of parsing "update" data (i.e. for an updateData call). */
var ParsedUpdateData = /** @class */ (function () {
    function ParsedUpdateData(data, fieldMask, fieldTransforms) {
        this.data = data;
        this.fieldMask = fieldMask;
        this.fieldTransforms = fieldTransforms;
    }
    ParsedUpdateData.prototype.toMutations = function (key, precondition) {
        var mutations = [
            new PatchMutation(key, this.data, this.fieldMask, precondition)
        ];
        if (this.fieldTransforms.length > 0) {
            mutations.push(new TransformMutation(key, this.fieldTransforms));
        }
        return mutations;
    };
    return ParsedUpdateData;
}());
export { ParsedUpdateData };
/*
 * Represents what type of API method provided the data being parsed; useful
 * for determining which error conditions apply during parsing and providing
 * better error messages.
 */
var UserDataSource;
(function (UserDataSource) {
    UserDataSource[UserDataSource["Set"] = 0] = "Set";
    UserDataSource[UserDataSource["Update"] = 1] = "Update";
    UserDataSource[UserDataSource["MergeSet"] = 2] = "MergeSet";
    UserDataSource[UserDataSource["QueryValue"] = 3] = "QueryValue"; // from a where clause or cursor bound
})(UserDataSource || (UserDataSource = {}));
function isWrite(dataSource) {
    switch (dataSource) {
        case UserDataSource.Set: // fall through
        case UserDataSource.MergeSet: // fall through
        case UserDataSource.Update:
            return true;
        case UserDataSource.QueryValue:
            return false;
        default:
            throw fail("Unexpected case for UserDataSource: " + dataSource);
    }
}
/** A "context" object passed around while parsing user data. */
var ParseContext = /** @class */ (function () {
    /**
     * Initializes a ParseContext with the given source and path.
     *
     * @param dataSource Indicates what kind of API method this data came from.
     * @param methodName The name of the method the user called to create this
     *     ParseContext.
     * @param path A path within the object being parsed. This could be an empty
     *     path (in which case the context represents the root of the data being
     *     parsed), or a nonempty path (indicating the context represents a nested
     *     location within the data).
     * @param arrayElement Whether or not this context corresponds to an element
     *     of an array.
     * @param fieldTransforms A mutable list of field transforms encountered while
     *     parsing the data.
     * @param fieldMask A mutable list of field paths encountered while parsing
     *     the data.
     *
     * TODO(b/34871131): We don't support array paths right now, so path can be
     * null to indicate the context represents any location within an array (in
     * which case certain features will not work and errors will be somewhat
     * compromised).
     */
    function ParseContext(dataSource, methodName, path, arrayElement, fieldTransforms, fieldMask) {
        this.dataSource = dataSource;
        this.methodName = methodName;
        this.path = path;
        this.arrayElement = arrayElement;
        // Minor hack: If fieldTransforms is undefined, we assume this is an
        // external call and we need to validate the entire path.
        if (fieldTransforms === undefined) {
            this.validatePath();
        }
        this.arrayElement = arrayElement !== undefined ? arrayElement : false;
        this.fieldTransforms = fieldTransforms || [];
        this.fieldMask = fieldMask || [];
    }
    ParseContext.prototype.childContextForField = function (field) {
        var childPath = this.path == null ? null : this.path.child(field);
        var context = new ParseContext(this.dataSource, this.methodName, childPath, 
        /*arrayElement=*/ false, this.fieldTransforms, this.fieldMask);
        context.validatePathSegment(field);
        return context;
    };
    ParseContext.prototype.childContextForFieldPath = function (field) {
        var childPath = this.path == null ? null : this.path.child(field);
        var context = new ParseContext(this.dataSource, this.methodName, childPath, 
        /*arrayElement=*/ false, this.fieldTransforms, this.fieldMask);
        context.validatePath();
        return context;
    };
    ParseContext.prototype.childContextForArray = function (index) {
        // TODO(b/34871131): We don't support array paths right now; so make path
        // null.
        return new ParseContext(this.dataSource, this.methodName, 
        /*path=*/ null, 
        /*arrayElement=*/ true, this.fieldTransforms, this.fieldMask);
    };
    ParseContext.prototype.createError = function (reason) {
        var fieldDescription = this.path === null || this.path.isEmpty()
            ? ''
            : " (found in field " + this.path.toString() + ")";
        return new FirestoreError(Code.INVALID_ARGUMENT, "Function " + this.methodName + "() called with invalid data. " +
            reason +
            fieldDescription);
    };
    ParseContext.prototype.validatePath = function () {
        // TODO(b/34871131): Remove null check once we have proper paths for fields
        // within arrays.
        if (this.path === null) {
            return;
        }
        for (var i = 0; i < this.path.length; i++) {
            this.validatePathSegment(this.path.get(i));
        }
    };
    ParseContext.prototype.validatePathSegment = function (segment) {
        if (isWrite(this.dataSource) && RESERVED_FIELD_REGEX.test(segment)) {
            throw this.createError('Document fields cannot begin and end with __');
        }
    };
    ParseContext.prototype.isWrite = function () {
        return (this.dataSource === UserDataSource.Set ||
            this.dataSource === UserDataSource.Update);
    };
    return ParseContext;
}());
/**
 * A placeholder object for DocumentReferences in this file, in order to
 * avoid a circular dependency. See the comments for `DataPreConverter` for
 * the full context.
 */
var DocumentKeyReference = /** @class */ (function () {
    function DocumentKeyReference(databaseId, key) {
        this.databaseId = databaseId;
        this.key = key;
    }
    return DocumentKeyReference;
}());
export { DocumentKeyReference };
/**
 * Helper for parsing raw user input (provided via the API) into internal model
 * classes.
 */
var UserDataConverter = /** @class */ (function () {
    function UserDataConverter(preConverter) {
        this.preConverter = preConverter;
    }
    /** Parse document data from a non-merge set() call.*/
    UserDataConverter.prototype.parseSetData = function (methodName, input) {
        var context = new ParseContext(UserDataSource.Set, methodName, FieldPath.EMPTY_PATH);
        validatePlainObject('Data must be an object, but it was:', context, input);
        var updateData = this.parseData(input, context);
        return new ParsedSetData(updateData, 
        /* fieldMask= */ null, context.fieldTransforms);
    };
    /** Parse document data from a set() call with '{merge:true}'. */
    UserDataConverter.prototype.parseMergeData = function (methodName, input) {
        var context = new ParseContext(UserDataSource.MergeSet, methodName, FieldPath.EMPTY_PATH);
        validatePlainObject('Data must be an object, but it was:', context, input);
        var updateData = this.parseData(input, context);
        var fieldMask = new FieldMask(context.fieldMask);
        return new ParsedSetData(updateData, fieldMask, context.fieldTransforms);
    };
    /** Parse update data from an update() call. */
    UserDataConverter.prototype.parseUpdateData = function (methodName, input) {
        var _this = this;
        var context = new ParseContext(UserDataSource.Update, methodName, FieldPath.EMPTY_PATH);
        validatePlainObject('Data must be an object, but it was:', context, input);
        var fieldMaskPaths = [];
        var updateData = ObjectValue.EMPTY;
        objUtils.forEach(input, function (key, value) {
            var path = fieldPathFromDotSeparatedString(methodName, key);
            var childContext = context.childContextForFieldPath(path);
            value = _this.runPreConverter(value, childContext);
            if (value instanceof DeleteFieldValueImpl) {
                // Add it to the field mask, but don't add anything to updateData.
                fieldMaskPaths.push(path);
            }
            else {
                var parsedValue = _this.parseData(value, childContext);
                if (parsedValue != null) {
                    fieldMaskPaths.push(path);
                    updateData = updateData.set(path, parsedValue);
                }
            }
        });
        var mask = new FieldMask(fieldMaskPaths);
        return new ParsedUpdateData(updateData, mask, context.fieldTransforms);
    };
    /** Parse update data from a list of field/value arguments. */
    UserDataConverter.prototype.parseUpdateVarargs = function (methodName, field, value, moreFieldsAndValues) {
        var context = new ParseContext(UserDataSource.Update, methodName, FieldPath.EMPTY_PATH);
        var keys = [fieldPathFromArgument(methodName, field)];
        var values = [value];
        if (moreFieldsAndValues.length % 2 !== 0) {
            throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + methodName + "() needs to be called with an even number " +
                'of arguments that alternate between field names and values.');
        }
        for (var i = 0; i < moreFieldsAndValues.length; i += 2) {
            keys.push(fieldPathFromArgument(methodName, moreFieldsAndValues[i]));
            values.push(moreFieldsAndValues[i + 1]);
        }
        var fieldMaskPaths = [];
        var updateData = ObjectValue.EMPTY;
        for (var i = 0; i < keys.length; ++i) {
            var path = keys[i];
            var childContext = context.childContextForFieldPath(path);
            var value_1 = this.runPreConverter(values[i], childContext);
            if (value_1 instanceof DeleteFieldValueImpl) {
                // Add it to the field mask, but don't add anything to updateData.
                fieldMaskPaths.push(path);
            }
            else {
                var parsedValue = this.parseData(value_1, childContext);
                if (parsedValue != null) {
                    fieldMaskPaths.push(path);
                    updateData = updateData.set(path, parsedValue);
                }
            }
        }
        var mask = new FieldMask(fieldMaskPaths);
        return new ParsedUpdateData(updateData, mask, context.fieldTransforms);
    };
    /**
     * Parse a "query value" (e.g. value in a where filter or a value in a cursor
     * bound).
     */
    UserDataConverter.prototype.parseQueryValue = function (methodName, input) {
        var context = new ParseContext(UserDataSource.QueryValue, methodName, FieldPath.EMPTY_PATH);
        var parsed = this.parseData(input, context);
        assert(parsed != null, 'Parsed data should not be null.');
        assert(context.fieldTransforms.length === 0, 'Field transforms should have been disallowed.');
        return parsed;
    };
    /** Sends data through this.preConverter, handling any thrown errors. */
    UserDataConverter.prototype.runPreConverter = function (input, context) {
        try {
            return this.preConverter(input);
        }
        catch (e) {
            var message = errorMessage(e);
            throw context.createError(message);
        }
    };
    /**
     * Internal helper for parsing user data.
     *
     * @param input Data to be parsed.
     * @param context A context object representing the current path being parsed,
     * the source of the data being parsed, etc.
     * @return The parsed value, or null if the value was a FieldValue sentinel
     * that should not be included in the resulting parsed data.
     */
    UserDataConverter.prototype.parseData = function (input, context) {
        input = this.runPreConverter(input, context);
        if (input instanceof Array) {
            // TODO(b/34871131): Include the path containing the array in the error
            // message.
            if (context.arrayElement) {
                throw context.createError('Nested arrays are not supported');
            }
            // If context.path is null we are already inside an array and we don't
            // support field mask paths more granular than the top-level array.
            if (context.path) {
                context.fieldMask.push(context.path);
            }
            return this.parseArray(input, context);
        }
        else if (looksLikeJsonObject(input)) {
            validatePlainObject('Unsupported field value:', context, input);
            return this.parseObject(input, context);
        }
        else {
            // If context.path is null, we are inside an array and we should have
            // already added the root of the array to the field mask.
            if (context.path) {
                context.fieldMask.push(context.path);
            }
            return this.parseScalarValue(input, context);
        }
    };
    UserDataConverter.prototype.parseArray = function (array, context) {
        var result = [];
        var entryIndex = 0;
        for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
            var entry = array_1[_i];
            var parsedEntry = this.parseData(entry, context.childContextForArray(entryIndex));
            if (parsedEntry == null) {
                // Just include nulls in the array for fields being replaced with a
                // sentinel.
                parsedEntry = NullValue.INSTANCE;
            }
            result.push(parsedEntry);
            entryIndex++;
        }
        return new ArrayValue(result);
    };
    UserDataConverter.prototype.parseObject = function (obj, context) {
        var _this = this;
        var result = new SortedMap(primitiveComparator);
        objUtils.forEach(obj, function (key, val) {
            var parsedValue = _this.parseData(val, context.childContextForField(key));
            if (parsedValue != null) {
                result = result.insert(key, parsedValue);
            }
        });
        return new ObjectValue(result);
    };
    /**
     * Helper to parse a scalar value (i.e. not an Object or Array)
     *
     * @return The parsed value, or null if the value was a FieldValue sentinel
     * that should not be included in the resulting parsed data.
     */
    UserDataConverter.prototype.parseScalarValue = function (value, context) {
        if (value === null) {
            return NullValue.INSTANCE;
        }
        else if (typeof value === 'number') {
            if (typeUtils.isSafeInteger(value)) {
                return new IntegerValue(value);
            }
            else {
                return new DoubleValue(value);
            }
        }
        else if (typeof value === 'boolean') {
            return BooleanValue.of(value);
        }
        else if (typeof value === 'string') {
            return new StringValue(value);
        }
        else if (value instanceof Date) {
            return new TimestampValue(Timestamp.fromDate(value));
        }
        else if (value instanceof GeoPoint) {
            return new GeoPointValue(value);
        }
        else if (value instanceof Blob) {
            return new BlobValue(value);
        }
        else if (value instanceof DocumentKeyReference) {
            return new RefValue(value.databaseId, value.key);
        }
        else if (value instanceof FieldValueImpl) {
            if (value instanceof DeleteFieldValueImpl) {
                if (context.dataSource == UserDataSource.MergeSet) {
                    return null;
                }
                else if (context.dataSource === UserDataSource.Update) {
                    assert(context.path == null || context.path.length > 0, 'FieldValue.delete() at the top level should have already' +
                        ' been handled.');
                    throw context.createError('FieldValue.delete() can only appear at the top level ' +
                        'of your update data');
                }
                else {
                    // We shouldn't encounter delete sentinels for queries or non-merge set() calls.
                    throw context.createError('FieldValue.delete() can only be used with update() and set() with {merge:true}');
                }
            }
            else if (value instanceof ServerTimestampFieldValueImpl) {
                if (!isWrite(context.dataSource)) {
                    throw context.createError('FieldValue.serverTimestamp() can only be used with set()' +
                        ' and update()');
                }
                if (context.path === null) {
                    throw context.createError('FieldValue.serverTimestamp() is not currently' +
                        ' supported inside arrays');
                }
                context.fieldTransforms.push(new FieldTransform(context.path, ServerTimestampTransform.instance));
                // Return null so this value is omitted from the parsed result.
                return null;
            }
            else {
                return fail('Unknown FieldValue type: ' + value);
            }
        }
        else {
            throw context.createError("Unsupported field value: " + valueDescription(value));
        }
    };
    return UserDataConverter;
}());
export { UserDataConverter };
/**
 * Checks whether an object looks like a JSON object that should be converted
 * into a struct. Normal class/prototype instances are considered to look like
 * JSON objects since they should be converted to a struct value. Arrays, Dates,
 * GeoPoints, etc. are not considered to look like JSON objects since they map
 * to specific FieldValue types other than ObjectValue.
 */
function looksLikeJsonObject(input) {
    return (typeof input === 'object' &&
        input !== null &&
        !(input instanceof Array) &&
        !(input instanceof Date) &&
        !(input instanceof GeoPoint) &&
        !(input instanceof Blob) &&
        !(input instanceof DocumentKeyReference) &&
        !(input instanceof FieldValueImpl));
}
function validatePlainObject(message, context, input) {
    if (!looksLikeJsonObject(input) || !isPlainObject(input)) {
        var description = valueDescription(input);
        if (description === 'an object') {
            // Massage the error if it was an object.
            throw context.createError(message + ' a custom object');
        }
        else {
            throw context.createError(message + ' ' + description);
        }
    }
}
/**
 * Helper that calls fromDotSeparatedString() but wraps any error thrown.
 */
export function fieldPathFromArgument(methodName, path) {
    if (path instanceof ExternalFieldPath) {
        return path._internalPath;
    }
    else if (typeof path === 'string') {
        return fieldPathFromDotSeparatedString(methodName, path);
    }
    else {
        var message = 'Field path arguments must be of type string or FieldPath.';
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + methodName + "() called with invalid data. " + message);
    }
}
/**
 * Wraps fromDotSeparatedString with an error message about the method that
 * was thrown.
 * @param methodName The publicly visible method name
 * @param path The dot-separated string form of a field path which will be split
 * on dots.
 */
function fieldPathFromDotSeparatedString(methodName, path) {
    try {
        return fromDotSeparatedString(path)._internalPath;
    }
    catch (e) {
        var message = errorMessage(e);
        throw new FirestoreError(Code.INVALID_ARGUMENT, "Function " + methodName + "() called with invalid data. " + message);
    }
}
/**
 * Extracts the message from a caught exception, which should be an Error object
 * though JS doesn't guarantee that.
 */
function errorMessage(error) {
    return error instanceof Error ? error.message : error.toString();
}

//# sourceMappingURL=user_data_converter.js.map
