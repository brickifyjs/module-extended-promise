const stack = require('./index');

console.log(stack);

connect: function () {
    // TODO REMOVE SIMPLE EXEMPLE :)
    var me = this;

    this.then(function (response) { // then
        // Creates a promise
        return me.stack(function (resolve) {
            if (!me.connected) {
                // TODO CALL ASYNC
                me.connected = true;
                resolve(response);
            } else {
                console.info('Already connected');
                resolve(response);
            }

        });
    });

    return this;
},