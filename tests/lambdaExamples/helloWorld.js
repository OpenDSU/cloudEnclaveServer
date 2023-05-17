const helloWorld = () => {
    console.log("Hello World");
    return "Hello World";
}

module.exports = {
    registerLambdas: function (remoteEnclaveServer) {
        remoteEnclaveServer.addEnclaveMethod("helloWorld", helloWorld, "read");
    }
}