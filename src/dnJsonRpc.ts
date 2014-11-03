/* istanbul ignore next */
/// <reference path="../typings/angularjs/angular.d.ts" />

module dnJsonRpc {

	export declare class Error {
		name: string;
		message: string;
		stack: string;
		constructor(message?: string);
	}

	interface JsonRpcNotification {
		jsonrpc: string;
		method: string;
		params?: any;
	}

	interface JsonRpcRequest extends JsonRpcNotification {
		id: string;
	}

	export var $$internalIdCounter = 0;

	class JsonBuilder {
		static VERSION = '2.0';

		request(method : string, id: string, params? : any[]) : JsonRpcRequest;
		request(method : string, id: string, params? : { [argName : string] : any }) : JsonRpcRequest;
		request(method : string, id: string, params? : any) : JsonRpcRequest {
			var request : JsonRpcRequest = {
				jsonrpc: JsonBuilder.VERSION,
				method: method,
				id: id
			};
			if(params) {
				request.params = params;
			}
			return request;
		}

		notification(method : string, params? : any[]) : JsonRpcNotification;
		notification(method : string, params? : { [argName : string] : any }) : JsonRpcNotification;
		notification(method : string, params? : any) : JsonRpcNotification {
			var notification : JsonRpcNotification = {
				jsonrpc: JsonBuilder.VERSION,
				method: method
			};
			if(params) {
				notification.params = params;
			}
			return notification;
		}

		generateId() : string {
			return ++$$internalIdCounter + '';
		}
	}

	export enum RESPONSE_ERRORS {
		PARSE_ERROR = -33700,
		INVALID_RESPONSE = -33600
	};

	export class JsonRpcError extends Error {
		constructor(public code : number, public message : string, public data? : any) {
			super(message);
			this.stack = (<any>new Error).stack;
		}

		toString() {
			return '(' + this.code + ') ' + this.message;
		}
	}

	export class JsonRpcRequestError extends JsonRpcError {
		constructor(code : number, message : string, data? : any) {
			super(code, message, data);
		}
	}

	export class JsonRpcResponseError extends JsonRpcError {
		constructor(code : number, message : string, data? : any) {
			super(code, message, data);
		}
	}

	export class JsonRpcHttpError extends JsonRpcError {
		static ERRORS = {
			404: 'Not found'
		}
		constructor(code : number, data? : any) {
			super(code, JsonRpcHttpError.ERRORS[code] || 'Unknown error', data);
		}
	}

	export class DnJsonRpcService {
		public static '$inject' = ['$http', '$q'];

		private jsonBuilder = new JsonBuilder();

		constructor(private $http : ng.IHttpService, private $q : ng.IQService) {

		}

		request(path : string, method : string, params? : any[], config? : ng.IRequestShortcutConfig);
		request(path : string, method : string, params? : { [argName : string] : any }, config? : ng.IRequestShortcutConfig);
		request(path : string, method : string, params? : any, config? : ng.IRequestShortcutConfig) {
			var id = this.jsonBuilder.generateId();
			return this.$http.post(path, this.jsonBuilder.request(method, id, params), config).then((response : any) => {
				if('string' === typeof response.data) {
					return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.PARSE_ERROR, 'Parse error'));
				}

				if('2.0' !== response.data.jsonrpc || (('result' in response.data) === ('error' in response.data)) || !('id' in response.data)) { // a === b equals !(a XOR b)
					return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.INVALID_RESPONSE, 'Invalid response'));
				}
				if(id !== response.data.id) {
					return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.INVALID_RESPONSE, 'Invalid response', { type: 'ID_MISMATCH', expected: id, given: response.data.id }));
				}
				if('result' in response.data) {
					return response.data.result;
				} else {
					return this.$q.reject(new JsonRpcRequestError(response.data.error.code, response.data.error.message, response.data.error.data));
				}
			}, response => {
				return this.$q.reject(new JsonRpcHttpError(response.status, response.data));
			});
		}

		notify(path : string, method : string, params? : any[], config? : ng.IRequestShortcutConfig);
		notify(path : string, method : string, params? : { [argName : string] : any }, config? : ng.IRequestShortcutConfig);
		notify(path : string, method : string, params? : any, config? : ng.IRequestShortcutConfig) {
			return this.$http.post(path, this.jsonBuilder.notification(method, params), config).then((response : any) => {
				if('' === response.data) {
					return null;
				}
				if('string' === typeof response.data) {
					return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.PARSE_ERROR, 'Parse error'));
				}
				if('2.0' !== response.data.jsonrpc || !('error' in response.data)) { // a === b equals !(a XOR b)
					return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.INVALID_RESPONSE, 'Invalid response'));
				}
				return this.$q.reject(new JsonRpcRequestError(response.data.error.code, response.data.error.message, response.data.error.data));
			}, response => {
				return this.$q.reject(new JsonRpcHttpError(response.status, response.data));
			});
		}

		batch(path : string, config? : ng.IRequestShortcutConfig) {
			var batch = [];
			var batchApi = {
				request: (method : string, params?: any) => {
					batch.push({
						type: 'request',
						method: method,
						params: params
					});
					return batchApi;
				},
				notify: (method : string, params?: any) => {
					batch.push({
						type: 'notification',
						method: method,
						params: params
					});
					return batchApi;
				},
				exec: () : any => {
					if(0 === batch.length) return this.$q.when([]);
					var requestCount = 0, id, ids = [];
					batch = batch.map(e => 'request' === e.type 
						? (++requestCount, id = this.jsonBuilder.generateId(), ids.push(id), this.jsonBuilder.request(e.method, id, e.params))
						: this.jsonBuilder.notification(e.method, e.params));

					return this.$http.post(path, batch, config).then((response : any) => {
						if(0 === requestCount && '' === response.data) {
							return [];
						}
						if('string' === typeof response.data) {
							return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.PARSE_ERROR, 'Parse error'));
						}

						if('2.0' == response.data.jsonrpc && 'error' in response.data && 'id' in response.data) {
							return this.$q.reject(new JsonRpcRequestError(response.data.error.code, response.data.error.message, response.data.error.data));
						}
						if(!Array.isArray(response.data) || requestCount !== response.data.length) {
							return this.$q.reject(new JsonRpcResponseError(RESPONSE_ERRORS.INVALID_RESPONSE, 'Invalid response'));
						}

						return response.data.map(data => {
							if('2.0' !== data.jsonrpc || (('result' in data) === ('error' in data)) || !('id' in data)) { // a === b equals !(a XOR b)
								return new JsonRpcResponseError(RESPONSE_ERRORS.INVALID_RESPONSE, 'Invalid response');
							}
							if(!~ids.indexOf(data.id)) {
								return new JsonRpcResponseError(RESPONSE_ERRORS.INVALID_RESPONSE, 'Invalid response', { type: 'ID_MISMATCH', expected: ids, given: data.id });
							}

							if('result' in data) {
								return data.result;
							} else {
								return new JsonRpcRequestError(data.error.code, data.error.message, data.error.data);
							}
						});
						
					}, response => {
						return this.$q.reject(new JsonRpcHttpError(response.status, response.data));
					});
				}
			}
			return batchApi;
		}
	}

	angular.module('dnJsonRpc', [])
		.service('DnJsonRpcService', DnJsonRpcService);
}