/* istanbul ignore next */
/// <reference path="../typings/angularjs/angular.d.ts" />
// / <reference path="../typings/es6-promise/es6-promise.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var dnJsonRpc;
(function (dnJsonRpc) {
    dnJsonRpc.$$internalIdCounter = 0;

    var JsonBuilder = (function () {
        function JsonBuilder() {
        }
        JsonBuilder.prototype.request = function (method, id, params) {
            var request = {
                jsonrpc: JsonBuilder.VERSION,
                method: method,
                id: id
            };
            if (params) {
                request.params = params;
            }
            return request;
        };

        JsonBuilder.prototype.notification = function (method, params) {
            var notification = {
                jsonrpc: JsonBuilder.VERSION,
                method: method
            };
            if (params) {
                notification.params = params;
            }
            return notification;
        };

        JsonBuilder.prototype.generateId = function () {
            return ++dnJsonRpc.$$internalIdCounter + '';
        };
        JsonBuilder.VERSION = '2.0';
        return JsonBuilder;
    })();

    (function (RESPONSE_ERRORS) {
        RESPONSE_ERRORS[RESPONSE_ERRORS["PARSE_ERROR"] = -33700] = "PARSE_ERROR";
        RESPONSE_ERRORS[RESPONSE_ERRORS["INVALID_RESPONSE"] = -33600] = "INVALID_RESPONSE";
    })(dnJsonRpc.RESPONSE_ERRORS || (dnJsonRpc.RESPONSE_ERRORS = {}));
    var RESPONSE_ERRORS = dnJsonRpc.RESPONSE_ERRORS;
    ;

    var JsonRpcError = (function (_super) {
        __extends(JsonRpcError, _super);
        function JsonRpcError(code, message, data) {
            _super.call(this, message);
            this.code = code;
            this.message = message;
            this.data = data;
            this.stack = (new Error).stack;
        }
        JsonRpcError.prototype.toString = function () {
            return '(' + this.code + ') ' + this.message;
        };
        return JsonRpcError;
    })(Error);
    dnJsonRpc.JsonRpcError = JsonRpcError;

    var JsonRpcRequestError = (function (_super) {
        __extends(JsonRpcRequestError, _super);
        function JsonRpcRequestError(code, message, data) {
            _super.call(this, code, message, data);
        }
        return JsonRpcRequestError;
    })(JsonRpcError);
    dnJsonRpc.JsonRpcRequestError = JsonRpcRequestError;

    var JsonRpcResponseError = (function (_super) {
        __extends(JsonRpcResponseError, _super);
        function JsonRpcResponseError(code, message, data) {
            _super.call(this, code, message, data);
        }
        return JsonRpcResponseError;
    })(JsonRpcError);
    dnJsonRpc.JsonRpcResponseError = JsonRpcResponseError;

    var JsonRpcHttpError = (function (_super) {
        __extends(JsonRpcHttpError, _super);
        function JsonRpcHttpError(code, data) {
            _super.call(this, code, JsonRpcHttpError.ERRORS[code] || 'Unknown error', data);
        }
        JsonRpcHttpError.ERRORS = {
            404: 'Not found'
        };
        return JsonRpcHttpError;
    })(JsonRpcError);
    dnJsonRpc.JsonRpcHttpError = JsonRpcHttpError;

    var DnJsonRpcService = (function () {
        function DnJsonRpcService($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.jsonBuilder = new JsonBuilder();
        }
        DnJsonRpcService.prototype.request = function (path, method, params, config) {
            var _this = this;
            var id = this.jsonBuilder.generateId();
            return this.$http.post(path, this.jsonBuilder.request(method, id, params), config).then(function (response) {
                if ('string' === typeof response.data) {
                    return _this.$q.reject(new JsonRpcResponseError(-33700 /* PARSE_ERROR */, 'Parse error'));
                }

                /**
                * @todo  remove, not jsonrpc 2.0 conform
                */
                response.data.jsonrpc = '2.0';
                if (null === response.data.error) {
                    delete response.data.error;
                }
                if ('2.0' !== response.data.jsonrpc || (('result' in response.data) === ('error' in response.data)) || !('id' in response.data)) {
                    return _this.$q.reject(new JsonRpcResponseError(-33600 /* INVALID_RESPONSE */, 'Invalid response'));
                }
                if (id !== response.data.id) {
                    return _this.$q.reject(new JsonRpcResponseError(-33600 /* INVALID_RESPONSE */, 'Invalid response', { type: 'ID_MISMATCH', expected: id, given: response.data.id }));
                }
                if ('result' in response.data) {
                    return response.data.result;
                } else {
                    return _this.$q.reject(new JsonRpcRequestError(response.data.error.code, response.data.error.message, response.data.error.data));
                }
            }, function (response) {
                return _this.$q.reject(new JsonRpcHttpError(response.status, response.data));
            });
        };

        DnJsonRpcService.prototype.notify = function (path, method, params, config) {
            var _this = this;
            return this.$http.post(path, this.jsonBuilder.notification(method, params), config).then(function (response) {
                if ('' === response.data) {
                    return null;
                }
                if ('string' === typeof response.data) {
                    return _this.$q.reject(new JsonRpcResponseError(-33700 /* PARSE_ERROR */, 'Parse error'));
                }

                /**
                * @todo  remove
                */
                response.data.jsonrpc = '2.0';
                if ('2.0' !== response.data.jsonrpc || !('error' in response.data)) {
                    return _this.$q.reject(new JsonRpcResponseError(-33600 /* INVALID_RESPONSE */, 'Invalid response'));
                }
                return _this.$q.reject(new JsonRpcRequestError(response.data.error.code, response.data.error.message, response.data.error.data));
            }, function (response) {
                return _this.$q.reject(new JsonRpcHttpError(response.status, response.data));
            });
        };

        DnJsonRpcService.prototype.batch = function (path, config) {
            var _this = this;
            var batch = [];
            var batchApi = {
                request: function (method, params) {
                    batch.push({
                        type: 'request',
                        method: method,
                        params: params
                    });
                    return batchApi;
                },
                notify: function (method, params) {
                    batch.push({
                        type: 'notification',
                        method: method,
                        params: params
                    });
                    return batchApi;
                },
                exec: function () {
                    if (0 === batch.length)
                        return _this.$q.when([]);
                    var requestCount = 0, id, ids = [];
                    batch = batch.map(function (e) {
                        return 'request' === e.type ? (++requestCount, id = _this.jsonBuilder.generateId(), ids.push(id), _this.jsonBuilder.request(e.method, id, e.params)) : _this.jsonBuilder.notification(e.method, e.params);
                    });

                    return _this.$http.post(path, batch, config).then(function (response) {
                        if (0 === requestCount && '' === response.data) {
                            return [];
                        }
                        if ('string' === typeof response.data) {
                            return _this.$q.reject(new JsonRpcResponseError(-33700 /* PARSE_ERROR */, 'Parse error'));
                        }

                        /**
                        * @todo  remove
                        */
                        response.data.jsonrpc = '2.0';
                        if ('2.0' == response.data.jsonrpc && 'error' in response.data && 'id' in response.data) {
                            return _this.$q.reject(new JsonRpcRequestError(response.data.error.code, response.data.error.message, response.data.error.data));
                        }
                        if (!Array.isArray(response.data) || requestCount !== response.data.length) {
                            return _this.$q.reject(new JsonRpcResponseError(-33600 /* INVALID_RESPONSE */, 'Invalid response'));
                        }

                        return response.data.map(function (data) {
                            /**
                            * @todo  remove
                            */
                            data.jsonrpc = '2.0';
                            if ('2.0' !== data.jsonrpc || (('result' in data) === ('error' in data)) || !('id' in data)) {
                                return new JsonRpcResponseError(-33600 /* INVALID_RESPONSE */, 'Invalid response');
                            }
                            if (!~ids.indexOf(data.id)) {
                                return new JsonRpcResponseError(-33600 /* INVALID_RESPONSE */, 'Invalid response', { type: 'ID_MISMATCH', expected: ids, given: data.id });
                            }

                            if ('result' in data) {
                                return data.result;
                            } else {
                                return new JsonRpcRequestError(data.error.code, data.error.message, data.error.data);
                            }
                        });
                    }, function (response) {
                        return _this.$q.reject(new JsonRpcHttpError(response.status, response.data));
                    });
                }
            };
            return batchApi;
        };
        DnJsonRpcService['$inject'] = ['$http', '$q'];
        return DnJsonRpcService;
    })();
    dnJsonRpc.DnJsonRpcService = DnJsonRpcService;

    angular.module('dnJsonRpc', []).service('DnJsonRpcService', DnJsonRpcService);
})(dnJsonRpc || (dnJsonRpc = {}));
//# sourceMappingURL=dnJsonRpc.js.map
