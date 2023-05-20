
require("../../../psknode/bundles/testsRuntime");
const tir = require("../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");

const scAPI = openDSU.loadApi("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadApi("enclave");


const { createInstance } = require("../");
process.env.REMOTE_ENCLAVE_SECRET = "something";

assert.callback('Create enclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const testDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const domain = "testDomain"
        const apiHub = await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: domain, config: testDomainConfig }] });
        const server = createInstance({rootFolder: folder});
        server.start();

        server.on("initialised", async() => {
            try {
                const keySSISpace = require("opendsu").loadAPI("keyssi");
                const serverSeedSSI = keySSISpace.createSeedSSI("vault", process.env.REMOTE_ENCLAVE_SECRET);
                const serverDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", serverSeedSSI);

                const clientSeedSSI = keySSISpace.createSeedSSI("vault", "some secret");
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

                const remoteEnclaveClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), serverDIDDocument.getIdentifier());

                const TABLE = "test_table";
                const addedRecord = { data: 1 };
                remoteEnclaveClient.on("initialised", async () => {
                    try {
                        await $$.promisify(remoteEnclaveClient.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                        await $$.promisify(remoteEnclaveClient.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                        const record = await $$.promisify(remoteEnclaveClient.getRecord)("some_did", TABLE, "pk1");
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");
                        const allRecords = await $$.promisify(remoteEnclaveClient.getAllRecords)("some_did", TABLE);

                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")
                        testFinished();
                    } catch (e) {
                        return console.log(e);
                    }

                });

            } catch (e) {
                return console.log(e);
            }
        })
    });
}, 500000);