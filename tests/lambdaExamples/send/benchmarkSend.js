const benchmarkSend = async function (message, remoteEnclaveDID, callback) {
    const openDSU = require("opendsu");
    const w3cDID = openDSU.loadAPI("w3cdid");
    const keySSISpace = openDSU.loadAPI("keyssi");
    const enclaveAPI = openDSU.loadAPI("enclave");

    const clientSeedSSI = keySSISpace.createSeedSSI("vault", "other secret");
    const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

    const client = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), remoteEnclaveDID);
    client.on("initialised", () => {
            client.callLambda("benchmarkReceive", message, (err, res) => { 
                callback(err, res);
            });
    })
}

module.exports = {
    registerLambdas: function (remoteEnclaveServer) {
        remoteEnclaveServer.addEnclaveMethod("benchmarkSend", benchmarkSend, "read");
    }
}