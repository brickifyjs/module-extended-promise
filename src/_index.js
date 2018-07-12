'use strict';
/*

var User;
(function () {
    var instance;
    User = function User() {
        if (instance) {
            return instance;
        }
        instance = this;
// all the functionality
        this.firstName = 'John';
        this.lastName = 'Doe';
        return instance;
    };
}());

var Singleton, instance1, instance2;
Singleton = (function () {
    var self;
    self = {
        instance: void null
    };
    return {
        Singleton: function Singleton() {
            if (self.instance === void null) {
                self.instance = this;
                self.instance.value = 0;
            }
            return self.instance;
        }
    }.Singleton;
})();
*/


var promise = null; // Tetra promises
// todo branch, how to ?

/***
 *
 * Get the delay value
 *
 * @param delay
 * @returns {*|number}
 */
function getThen(then) {
    return then || this.then;
}


var Stack = function (options) {
    var me, sse, serviceName, namespace, formats, hidden;

    options = options || {},
        sse = {},
        hidden = false,
        serviceName = options.service,
        namespace = options.namespace,
        formats = options.formats;

    return me = {
        conn_id: '',
        serviceName: serviceName,
        connected: false,
        promise: null,
        evtSource: null,
        handler: {
            resolve: null,
            reject: null,
            promise: null
        },
        requestDelay: options.requestDelay || tetra.requestDelay,
        requestTimeout: options.requestTimeout || tetra.requestTimeout,
        /***
         *
         * Connect to service
         *
         * @param options
         * @returns {me}
         */
        connect: function (options) {

            options = options || {};

            // Call by default on reject
            options.then = options.then || 'both';

            // Creates a promise
            this.doPromise(options, function (onSuccess, onError, timeout) {
                if (!me.connected) {
                    var onSuccessWrapper = function (response) {
                        me.connected = true;

                        // Set the connection id if present
                        if (response && response.conn_id !== -1) {
                            me.conn_id = response.conn_id
                        }
                        return onSuccess(response);
                    };

                    // Pass formats
                    var formatsParameters = '';
                    for (var format in formats) {
                        formatsParameters += 'format_' + (namespace || '') + '.' + format + '=' + formats[format] + '&';
                        //format_ingenico.device.chip.AidRegsterRequest.bytes
                        /*
                         "formats":{
                         "AidRegsterRequest.bytes":"tlv"
                         }
                         */
                    }

                    // Connect to service
                    return http.get(CONFIG.SERVICE_URL + '/' + serviceName + '?multi&' + formatsParameters, onSuccessWrapper, onError, timeout);
                } else {
                    console.info('Already connected');
                    return onSuccess();
                }
            });

            return this;
        },
        /***
         *
         * Disconnect from service
         *
         * @param options
         * @returns {me}
         */
        disconnect: function (options) {

            options = options || {};

            // Call by default on both
            options.then = options.then || 'both';

            // Creates promise
            this.doPromise(options, function (onSuccess, onError, timeout) {
                if (me.connected) {
                    var onSuccessWrapper = function (response) {
                        me.connected = false;
                        return onSuccess(response);
                    };

                    return http.del(CONFIG.SERVICE_URL + '/' + serviceName + '?conn_id=' + me.conn_id, {}, onSuccessWrapper, onError, timeout, options.async === false ? false : true);
                } else {
                    console.info('Not connected');
                    return onSuccess();
                }
            });

            return this;
        },
        /***
         *
         * Call a a service method
         *
         * @param methodName
         * @param options
         * @returns {me}
         */
        call: function (methodName, options) { // all options can be override here for this method

            options = options || {};

            // Call by default on resolved
            options.then = options.then || 'resolved';

            // Add a promise only if we are connected

            // Creates promise
            this.doPromise(options, function (onSuccess, onError, timeout) {
                if (me.connected) {
                    // Creates the request params
                    var req = (namespace ? namespace + '.' : '') + methodName + 'Request',
                        res = (namespace ? namespace + '.' : '') + methodName + 'Response',
                        data = options.data || {};

                    // todo implement new RPC version
//   http://terminal.ingenico.com/service/local.device.chip0/ingenico.device.chip.ManageTransaction ?
// >>> http://terminal.ingenico.com/service/local.device.chip0/ingenico.device.chip.Chip/start

                    if (options.hide) {
                        hidden = true;
                        //  tetra.hide();
                    }

                    var onSuccessWrapper = function (response) {
                        if (hidden) {
                            hidden = false;
                            tetra.show();
                        }
                        return onSuccess(response);
                    };

                    var onErrorWrapper = function (response) {
                        if (hidden) {
                            hidden = false;
                            tetra.show();
                        }
                        return onError(response);
                    };

                    // Call the service method
                    return http.post(CONFIG.SERVICE_URL + '/' + serviceName + '?request=' + req + '&response=' + res + '&conn_id=' + me.conn_id, data, onSuccessWrapper, onErrorWrapper, timeout, options.expect);
                } else {
                    return onError({msg: 'Not connected call'});
                }
            });

            return this;
        },
        doPromise: function (options, fn) {
            return tetra.doPromise.apply(this, [options, fn]);
        },
        reset: function () {
            return tetra.reset.call(this);
        },
        then: function (onSuccess, onError) {
            return tetra.then.call(this, onSuccess, onError);
        },
        catch: function (error) {
            return tetra.then.call(this, null, error);
        },
        success: function (success) {
            return tetra.then.call(this, success, null);
        },
        error: function (error) {
            return tetra.then.call(this, null, error);
        },
        resolve: function (response) {
            return tetra.resolve.call(this, response, me.handler);
        },
        reject: function (reason) {
            return tetra.reject.call(this, reason, me.handler);
        },
        /***
         *
         * Add service envent, sse event
         *
         * @param eventName
         * @param callback
         * @param context
         * @returns {me}
         */
        on: function (eventName, callback, context) {

            if (eventName && !eventName.match(/\./) && eventName !== 'message') {
                eventName = (namespace ? namespace + '.' : '') + eventName;
            }

            options = options || {};

            // Call by default on resolved
            options.then = options.then || 'resolved';

            // Creates promise
            this.doPromise(options, function (onSuccess, onError, timeout) {

                if (!me.evtSource) {
                    return onError();
                }

                context = context || me;

                sse[eventName] = {
                    eventName: eventName,
                    callback: callback,
                    context: context
                };

                // Add SSE event to SSE object
                // me.evtSource.addEventListener(eventName, sse[eventName].callback.bind(context), false);
                me.evtSource.addEventListener(eventName, function (response) {
                    var data = JSON.parse(response.data);
                    sse[eventName].callback.call(context, data);
                }, false);

                return onSuccess();
            });

            return this;
        },
        /***
         *
         * Open sse
         *
         */
        open: function (options) {

            options = options || {};

            // Call by default on resolved
            options.then = options.then || 'resolved';

            // Creates promise
            this.doPromise(options, function (onSuccess, onError, timeout) {

                if (me.connected && !me.evtSource) {

                    me.evtSource = new window.EventSource(CONFIG.SERVICE_URL + '/' + serviceName + '/sse?conn_id=' + me.conn_id);
                    // Does not works on terminal ?!
                    me.evtSource.onerror = function (e) {
                        return onError(e);
                    };
                    me.evtSource.onopen = function (e) {
                        return onSuccess(e);
                    };

                    return onSuccess();
                }
                else {
                    return onError({msg: 'Not connected or event already opened'});
                }

            });

            return this;
        },
        /***
         *
         * Close sse
         *
         */
        close: function (options) {
            options = options || {};

            // Call by default on resolved
            options.then = options.then || 'resolved';

            if (!me.evtSource) {
                return this;
            }

            // Creates promise
            this.doPromise(options, function (onSuccess, onError, timeout) {
                if (me.evtSource) {
                    me.off();
                    me.evtSource.close();
                    me.evtSource = null;

                    return onSuccess();
                } else {
                    return onError({'msg': 'Event source not exist'});
                }
            });

            return this;
        },
        /***
         *
         * Remove service event, sse event
         *
         * @param eventName
         * @returns {me}
         */
        off: function (eventName, handler, context) {

            if (eventName && !eventName.match(/\./) && eventName !== 'message') {
                eventName = (namespace ? namespace + '.' : '') + eventName;
            }

            if (!me.evtSource) {
                return this;
            }

            function remove(eventName) {

                // Remove event
                me.evtSource.removeEventListener(eventName, handler || sse[eventName].callback, false);

                // Delete object
                delete sse[eventName];
            }

            if (!eventName) { // Remove all events
                for (var evt in sse) {
                    var evtName;

                    evtName = sse[evt].eventName;

                    // Remove event
                    remove(evtName);
                }
            }
            else if (typeof eventName === 'string') { // Remove string event
                remove(eventName);
            } else if (typeof eventName === 'object' && eventName instanceof Array) { // Remove array of events
                for (var i = 0, len = eventName.length; i < len; i++) {
                    var evtName;

                    evtName = eventName[i];

                    // Remove event
                    remove(evtName);
                }
            } else {

                for (var evt in sse) { // Remove regex
                    var evtName;

                    evtName = sse[evt].eventName;

                    if (evtName.match(eventName)) {
                        // Remove event
                        remove(evtName);
                    }
                }
            }

            return this;
        },
        /***
         *
         * Destroy the service
         *
         */
        destroy: function () {
            var service;

            this
                .disconnect()
                .close({success: this.reset});

            service = services.indexOf(this);
            services.splice(service, 1);
        }
    };
};


var stack = function (options) {
    var me, serviceName;

    options = options || {},
        serviceName = options.service,

    return me = {
        conn_id: '',
        serviceName: serviceName,
        connected: false,
        promise: null,
        evtSource: null,
        handler: {
            resolve: null,
            reject: null,
            promise: null
        },
        requestDelay: options.requestDelay || tetra.requestDelay,
        requestTimeout: options.requestTimeout || tetra.requestTimeout,
        service: function (options) {

            var service;

            // Check if instance exist and return it
            for (var i = 0, len = services.length; i < len; i++) {
                var serviceInstance;

                serviceInstance = services[i];

                if (serviceInstance.serviceName === options.service) {
                    return serviceInstance;
                }
            }

            // Trow an error if we does not have serviceName
            if (!options.service) {
                return new Error('.service property is missing');
            }

            // Creates a new service
            service = new Service(options);

            // Register the new service as private
            services.push(service);

            return service;
        },
        doPromise: function (options, fn) {
            var me = this;

            function doPromise() {

                var promise;

                // Creates a new promise
                promise = new window.Promise(function (resolve, reject) {


                    // Call the promise after a delay
                    window.setTimeout(function () {

                        return fn(function (response) {

                            // Register Handler
                            me.handler.resolve = resolve;
                            me.handler.reject = reject;
                            me.handler.promise = promise;

                            me.resolve(response, me.handler);

                        }, function (reason) {

                            // Register Handler
                            me.handler.resolve = resolve;
                            me.handler.reject = reject;
                            me.handler.promise = promise;

                            me.reject(reason, me.handler);

                        }, getTimeout.call(me, options.requestTimeout)); // Pass AJAX timeout for service call

                    }, getDelay.call(me, options.requestDelay));

                });

                return promise;
            }

            if (!this.promise || options.promise) {
                this.promise = doPromise();
            } else {
                var then = getThen.call(me, options.then);
                if (then === 'resolved') {
                    me.success(doPromise)
                } else if (then === 'rejected') {
                    me.error(doPromise)
                } else {
                    me.then(doPromise, doPromise);
                }

            }

            if (options.error || options.success) {
                me.then(options.success, options.error);
            }

            return this;
        },
        then: function (onSuccess, onError) {
            var me = this;

            if (onSuccess && !onError) {
                me.promise = me.promise.then(function (response) {
                    return onSuccess.call(me, response, me.handler);
                    // return me.promise;
                });
            } else if (onSuccess && onError) {

                me.promise = me.promise.then(function (response) {

                        return onSuccess.call(me, response, me.handler);
                        //return me.promise;
                    },
                    function (reason) {
                        return onError.call(me, reason, me.handler);
                        //   return me.promise;
                    }
                );
            }
            else {
                me.promise = me.promise.catch(function (reason) {
                    return onError.call(me, reason, me.handler);
                    //  return me.promise;
                });
            }

            return this;
        },
        /***
         *
         * Catch promise method
         *
         * @param error
         * @returns {me}
         */
        catch: function (error) {
            this.then(null, error);
            return this;
        },
        /***
         *
         * Success sugar for resolved promise
         *
         * @param success
         * @returns {me}
         */
        success: function (success) {
            this.then(success, null);
            return this;
        },
        /***
         *
         * Error sugar for rejected promise
         *
         * @param error
         * @returns {me}
         */
        error: function (error) {
            this.then(null, error);
            return this;
        },
        /***
         *
         * Resolve the current promise
         *
         * @param response
         * @returns {me}
         */
        resolve: function (response) {
            this.handler.resolve.call(this, response, this.handler);

            return this;
        },
        /***
         *
         * Reject the current promise
         *
         * @param reason
         * @returns {me}
         */
        reject: function (reason) {
            this.handler.reject.call(this, reason, this.handler);
            return this;
        },
        reset: function () {
            this.promise = null;
            return this;
        },
        wait: function (time) {

        },
        promisify: function (fn) {
            try {
                var result = fn();
                resolve(result);
            }
            catch {
                var result = fn();
                reject(result);
            }
        }
    }
};

module.exports = stack;