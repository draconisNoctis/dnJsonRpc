/// <reference path="../../typings/jasmine/jasmine.d.ts" />
/// <reference path="../../typings/angularjs/angular-mocks.d.ts" />
/// <reference path="../dnJsonRpc.ts" />
describe('dnJsonRpc', function () {
    // beforeEach(() => {
    // 	angular.module('dnJsonRpcSpec', ['dnJsonRpc']);
    // 	module('dnJsonRpc', 'dnJsonRpcSpec');
    // 	inject(() => {});
    // });
    beforeEach(module('dnJsonRpc'));

    describe('DnJsonRpcService', function () {
        var service, pluralCatSpy, httpBackend, rootScope, notCalledSpy;

        beforeEach(inject(function ($httpBackend, $rootScope) {
            httpBackend = $httpBackend;
            rootScope = $rootScope;
            notCalledSpy = jasmine.createSpy('notCalledSpy');
        }));

        afterEach(function () {
            httpBackend.verifyNoOutstandingExpectation();
            httpBackend.verifyNoOutstandingRequest();
            dnJsonRpc.$$internalIdCounter = 0;
        });

        describe('request', function () {
            it('should return resolving promise on valid request(without params) and response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_valid_response","id":"1"}').respond('{"jsonrpc":"2.0","result":"validResponse","id":"1"}');

                DnJsonRpcService.request('/rpc', 'valid_request_valid_response').then(function (result) {
                    expect(result).toBe('validResponse');
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid json response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_invalid_json_response","id":"1"}').respond('{"jsonrpc:"2.0"');

                DnJsonRpcService.request('/rpc', 'valid_request_invalid_json_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Parse error');
                    expect(error.code).toBe(-33700);
                    expect(error.data).toBeUndefined();
                    expect(error.toString()).toBe('(-33700) Parse error');
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_invalid_response","id":"1"}').respond('{"jsonrpc":"2.0","id":"1"}');

                DnJsonRpcService.request('/rpc', 'valid_request_invalid_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Invalid response');
                    expect(error.code).toBe(-33600);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid http response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_invalid_http_response","id":"1"}').respond(404, 'Error: Not found');

                DnJsonRpcService.request('/rpc', 'valid_request_invalid_http_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcHttpError).toBe(true);
                    expect(error.message).toBe('Not found');
                    expect(error.code).toBe(404);
                    expect(error.data).toBe('Error: Not found');
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and response with mismatching id', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_invalid_response","id":"1"}').respond('{"jsonrpc":"2.0","result":"foobar","id":"2"}');

                DnJsonRpcService.request('/rpc', 'valid_request_invalid_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Invalid response');
                    expect(error.code).toBe(-33600);
                    expect(error.data).toEqual({ type: 'ID_MISMATCH', expected: "1", given: "2" });
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return resolving promise on valid request(with array params) and response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_valid_response","id":"1","params":["a","b"]}').respond('{"jsonrpc":"2.0","result":["a","b"],"id":"1"}');

                DnJsonRpcService.request('/rpc', 'valid_request_valid_response', ['a', 'b']).then(function (result) {
                    expect(result).toEqual(['a', 'b']);
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return resolving promise on valid request(with object params) and response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_valid_response","id":"1","params":{"foo":"bar"}}').respond('{"jsonrpc":"2.0","result":{"foo":"bar"},"id":"1"}');

                DnJsonRpcService.request('/rpc', 'valid_request_valid_response', { foo: 'bar' }).then(function (result) {
                    expect(result).toEqual({ foo: 'bar' });
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request and error response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc', '{"jsonrpc":"2.0","method":"valid_request_error_response","id":"1"}').respond('{"jsonrpc":"2.0","error":{"code":123,"message":"Foobar"},"id":"1"}');

                DnJsonRpcService.request('/rpc', 'valid_request_error_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcRequestError).toBe(true);
                    expect(error.message).toBe('Foobar');
                    expect(error.code).toBe(123);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));
        });

        describe('notify', function () {
            it('should return resolving promise on valid request(without params)', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_valid_response"}').respond('');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_valid_response').then(function (result) {
                    expect(result).toBe(null);
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid json response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_invalid_json_response"}').respond('{"jsonrpc:"2.0"');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_invalid_json_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Parse error');
                    expect(error.code).toBe(-33700);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_invalid_response"}').respond('{"jsonrpc":"2.0"}');
                DnJsonRpcService.notify('/rpc/notify', 'valid_request_invalid_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Invalid response');
                    expect(error.code).toBe(-33600);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_invalid_response"}').respond('{"jsonrpc":"2.0"}');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_invalid_response').catch(function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Invalid response');
                    expect(error.code).toBe(-33600);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid http response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_invalid_http_response"}').respond(404, 'Error: Not found');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_invalid_http_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcHttpError).toBe(true);
                    expect(error.message).toBe('Not found');
                    expect(error.code).toBe(404);
                    expect(error.data).toBe('Error: Not found');
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return resolving promise on valid request(with array params) and response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_valid_response","params":["a","b"]}').respond('');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_valid_response', ['a', 'b']).then(function (result) {
                    expect(result).toBe(null);
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return resolving promise on valid request(with object params) and response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_valid_response","params":{"foo":"bar"}}').respond('');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_valid_response', { foo: 'bar' }).then(function (result) {
                    expect(result).toBe(null);
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request and error response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/notify', '{"jsonrpc":"2.0","method":"valid_request_error_response"}').respond('{"jsonrpc":"2.0","error":{"code":123,"message":"Foobar"}}');

                DnJsonRpcService.notify('/rpc/notify', 'valid_request_error_response').then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcRequestError).toBe(true);
                    expect(error.message).toBe('Foobar');
                    expect(error.code).toBe(123);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));
        });

        describe('batch', function () {
            it('should resolve on empty batch', inject(function (DnJsonRpcService) {
                var spy = jasmine.createSpy('batch#then');
                DnJsonRpcService.batch('/rpc/batch').exec().then(spy, notCalledSpy);
                rootScope.$apply();
                expect(spy).toHaveBeenCalled();
                expect(spy.calls.argsFor(0)[0]).toEqual([]);
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid json response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_invalid_json_response","id":"1"}]').respond('[foobar');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_invalid_json_response').exec().then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Parse error');
                    expect(error.code).toBe(-33700);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and invalid response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_invalid_response","id":"1"}]').respond('{}');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_invalid_response').exec().then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Invalid response');
                    expect(error.code).toBe(-33600);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request(without params) and single error response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_single_error_response","id":"1"}]').respond('{"jsonrpc":"2.0","error":{"code":123,"message":"Foobar"},"id":"1"}');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_single_error_response').exec().then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcRequestError).toBe(true);
                    expect(error.message).toBe('Foobar');
                    expect(error.code).toBe(123);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise when number returning responses differs from number of requests(not notifications)', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_invalid_response1","id":"1"},{"jsonrpc":"2.0","method":"valid_request_invalid_response2","id":"2"}]').respond('[{"jsonrpc":"2.0","result":"validResponse","id":"1"}]');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_invalid_response1').request('valid_request_invalid_response2').exec().then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(error.message).toBe('Invalid response');
                    expect(error.code).toBe(-33600);
                    expect(error.data).toBeUndefined();
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a resolving promise when valid response contains errors', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_valid_response","id":"1"},{"jsonrpc":"2.0","method":"valid_request_error_response","id":"2"}]').respond('[{"jsonrpc":"2.0","result":"validResponse","id":"1"},{"jsonrpc":"2.0","error":{"code":123,"message":"Foobar"},"id":"2"}]');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_valid_response').request('valid_request_error_response').exec().then(function (response) {
                    expect(response[0]).toBe('validResponse');

                    expect(response[1] instanceof dnJsonRpc.JsonRpcRequestError).toBe(true);
                    expect(response[1].message).toBe('Foobar');
                    expect(response[1].code).toBe(123);
                    expect(response[1].data).toBeUndefined();
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a resolving promise when valid response contains invalid responses', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_valid_response","id":"1"},{"jsonrpc":"2.0","method":"valid_request_invalid_response","id":"2"}]').respond('[{"jsonrpc":"2.0","result":"validResponse","id":"1"},{}]');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_valid_response').request('valid_request_invalid_response').exec().then(function (response) {
                    expect(response[0]).toBe('validResponse');

                    expect(response[1] instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(response[1].message).toBe('Invalid response');
                    expect(response[1].code).toBe(-33600);
                    expect(response[1].data).toBeUndefined();
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a resolving promise when valid response contains mismatching id responses', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"valid_request_valid_response","id":"1"},{"jsonrpc":"2.0","method":"valid_request_invalid_response","id":"2"}]').respond('[{"jsonrpc":"2.0","result":"validResponse","id":"1"},{"jsonrpc":"2.0","result":"validResponse","id":"3"}]');

                DnJsonRpcService.batch('/rpc/batch').request('valid_request_valid_response').request('valid_request_invalid_response').exec().then(function (response) {
                    expect(response[0]).toBe('validResponse');

                    expect(response[1] instanceof dnJsonRpc.JsonRpcResponseError).toBe(true);
                    expect(response[1].message).toBe('Invalid response');
                    expect(response[1].code).toBe(-33600);
                    expect(response[1].data).toEqual({ type: 'ID_MISMATCH', expected: ['1', '2'], given: '3' });
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should resolve an empty array, when only notifications are called', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"notify1"},{"jsonrpc":"2.0","method":"notify2","params":{"foo":"bar"}}]').respond('');

                DnJsonRpcService.batch('/rpc/batch').notify('notify1').notify('notify2', { foo: 'bar' }).exec().then(function (response) {
                    expect(response).toEqual([]);
                }, notCalledSpy);
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));

            it('should return a rejecting promise on valid request and invalid http response', inject(function (DnJsonRpcService) {
                httpBackend.expect('POST', '/rpc/batch', '[{"jsonrpc":"2.0","method":"notify1"},{"jsonrpc":"2.0","method":"notify2","params":{"foo":"bar"}}]').respond(404, 'Error: Not found');

                DnJsonRpcService.batch('/rpc/batch').notify('notify1').notify('notify2', { foo: 'bar' }).exec().then(notCalledSpy, function (error) {
                    expect(error instanceof dnJsonRpc.JsonRpcHttpError).toBe(true);
                    expect(error.message).toBe('Not found');
                    expect(error.code).toBe(404);
                    expect(error.data).toBe('Error: Not found');
                });
                httpBackend.flush();
                expect(notCalledSpy).not.toHaveBeenCalled();
            }));
        });
    });
});
//# sourceMappingURL=dnJsonRpc.spec.js.map
