const benchmarkReceive = (message, callback) => {
    callback(undefined, message)
}

module.exports = {
    registerLambdas: function (remoteEnclaveServer) {
        remoteEnclaveServer.addEnclaveMethod("benchmarkReceive", benchmarkReceive, "read");
    }
}