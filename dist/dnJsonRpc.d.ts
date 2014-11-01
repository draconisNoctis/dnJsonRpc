/// <reference path="../typings/angularjs/angular.d.ts" />
declare module dnJsonRpc {
    class Error {
        public name: string;
        public message: string;
        public stack: string;
        constructor(message?: string);
    }
    var $$internalIdCounter: number;
    enum RESPONSE_ERRORS {
        PARSE_ERROR = -33700,
        INVALID_RESPONSE = -33600,
    }
    class JsonRpcError extends Error {
        public code: number;
        public message: string;
        public data: any;
        constructor(code: number, message: string, data?: any);
        public toString(): string;
    }
    class JsonRpcRequestError extends JsonRpcError {
        constructor(code: number, message: string, data?: any);
    }
    class JsonRpcResponseError extends JsonRpcError {
        constructor(code: number, message: string, data?: any);
    }
    class JsonRpcHttpError extends JsonRpcError {
        static ERRORS: {
            404: string;
        };
        constructor(code: number, data?: any);
    }
    class DnJsonRpcService {
        private $http;
        private $q;
        static '$inject': string[];
        private jsonBuilder;
        constructor($http: ng.IHttpService, $q: ng.IQService);
        public request(path: string, method: string, params?: any[], config?: ng.IRequestShortcutConfig): any;
        public request(path: string, method: string, params?: {
            [argName: string]: any;
        }, config?: ng.IRequestShortcutConfig): any;
        public notify(path: string, method: string, params?: any[], config?: ng.IRequestShortcutConfig): any;
        public notify(path: string, method: string, params?: {
            [argName: string]: any;
        }, config?: ng.IRequestShortcutConfig): any;
        public batch(path: string, config?: ng.IRequestShortcutConfig): {
            request: (method: string, params?: any) => any;
            notify: (method: string, params?: any) => any;
            exec: () => any;
        };
    }
}
