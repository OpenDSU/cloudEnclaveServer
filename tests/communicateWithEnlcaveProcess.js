require("../../../builds/output/testsRuntime");
const tir = require("../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");

const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadApi("enclave");

assert.callback("Test ", (testFinished) => {
    const scAPI = openDSU.loadAPI("sc");
    const sc = scAPI.getSecurityContext();

    sc.on("initialised", async () => {
        const remoteEnclaveDID = "did:ssi:name:vault:BrandEnclave";
        let [err, didDocument] = await $$.call(w3cDID.resolveNameDID, "vault", "test", "testSecret");
        const remoteEnclaveClient = enclaveAPI.initialiseRemoteEnclave(didDocument.getIdentifier(), remoteEnclaveDID);
        remoteEnclaveClient.on("initialised", async () => {

            remoteEnclaveClient.insertRecord("", "test", 1, {data: "data"}, (err, result) => {
                console.log(err, result);
                assert.true(err === undefined, "Lambda call failed");
                testFinished();
            })
        })
    })
}, 500000);
    

