require("../../../psknode/bundles/testsRuntime");
const tir = require("../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");

const scAPI = openDSU.loadApi("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadApi("enclave");
const bdnsAPI = openDSU.loadApi("bdns");

const {createInstance} = require("../");
process.env.REMOTE_ENCLAVE_SECRET = "something";

assert.callback('Create enclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        // const testDomainConfig = {
        //     "anchoring": {
        //         "type": "FS",
        //         "option": {}
        //     },
        //     "enable": ["enclave", "mq"]
        // }
        //
        // const domain = "vault";
        // const apiHub = await tir.launchConfigurableApiHubTestNodeAsync({
        //     domains: [{
        //         name: domain,
        //         config: testDomainConfig
        //     }],
        //     useWorker: true
        // });
        // console.log(" ======================================== ");
        // console.log(" ============> APIHUB PORT: ", apiHub.port);
        // console.log(" ======================================== ");
        // const serverDID = await tir.launchConfigurableRemoteEnclaveTestNodeAsync({rootFolder: folder, useWorker: true, domain, apihubPort: apiHub.port});
        const serverDID = "did:ssi:key:vault:MxMRjgiT2XmDMgA8UmEzdW2WsJqYtC9w2Q5FRn6bqM2J47FgnwUaupXDGo6FUmkMQjgK3HV4uPpcxTLiGX83PRfw"
        try {
            const keySSISpace = openDSU.loadAPI("keyssi");

            const scAPI = openDSU.loadApi("sc");
            const sc = scAPI.getSecurityContext();
            sc.on("initialised", async () => {
                const clientSeedSSI = keySSISpace.createSeedSSI("vault", "some secret");
                console.log("==========================================================")
                console.log(clientSeedSSI.getIdentifier());
                console.log("==========================================================")
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

                const remoteEnclaveClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), serverDID);

                const TABLE = "test_table";
                const addedRecord = {data: 1};
                remoteEnclaveClient.on("initialised", async () => {
                    try {
                        // await $$.promisify(remoteEnclaveClient.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                        // await $$.promisify(remoteEnclaveClient.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                        const record = await $$.promisify(remoteEnclaveClient.getRecord)("some_did", TABLE, "pk1");
                        console.log("record", record);
                        const allRecords = await $$.promisify(remoteEnclaveClient.getAllRecords)("some_did", TABLE);
                        console.log("allRecords", allRecords);
                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")
                        testFinished();
                    } catch (e) {
                        return console.log(e);
                    }
                });
            });
        } catch (e) {
            return console.log(e);
        }
    })

}, 500000);