require("../../../builds/output/testsRuntime");
const tir = require("../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");

const scAPI = openDSU.loadApi("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadApi("enclave");
const bdnsAPI = openDSU.loadApi("bdns");

const {createInstance} = require("../");
process.env.CLOUD_ENCLAVE_SECRET = "something";

assert.callback('Create enclave test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const testDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const domain = "vault";
        const apiHub = await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{
                name: domain,
                config: testDomainConfig
            }],
            rootFolder: folder
        });
        const serverDID = await tir.launchConfigurableRemoteEnclaveTestNodeAsync({
            domain,
            apihubPort: apiHub.port,
            config: {
                rootFolder: folder,
                secret: "testSecret",
                name: "testEnclave"
            }
        });

        try {
            const keySSISpace = openDSU.loadAPI("keyssi");
            const scAPI = openDSU.loadApi("sc");
            const createRemoteEnclaveClient = async () => {

                let [err, clientDIDDocument] = await $$.call(w3cDID.resolveNameDID, domain, "publicName", "initialSecret");
                assert.true(err === undefined)

                const remoteEnclaveClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), serverDID);

                const TABLE = "test_table";
                const addedRecord = {data: 1};
                remoteEnclaveClient.on("initialised", async () => {
                    try {
                        await $$.promisify(remoteEnclaveClient.insertRecord)("some_did", TABLE, "pk1", addedRecord, addedRecord);
                        await $$.promisify(remoteEnclaveClient.insertRecord)("some_did", TABLE, "pk2", addedRecord, addedRecord);
                        const record = await $$.promisify(remoteEnclaveClient.getRecord)("some_did", TABLE, "pk1");
                        console.log("RECORD", record)
                        assert.objectsAreEqual(record, addedRecord, "Records do not match");
                        const allRecords = await $$.promisify(remoteEnclaveClient.getAllRecords)("some_did", TABLE);
                        console.log("ALL RECORDS", allRecords)
                        assert.equal(allRecords.length, 2, "Not all inserted records have been retrieved")
                        testFinished();
                    } catch (e) {
                        return console.log(e);
                    }
                });
            }
            const sc = scAPI.getSecurityContext();
            if (sc.isInitialised()) {
                return await createRemoteEnclaveClient();
            }
            sc.on("initialised", async () => {
                await createRemoteEnclaveClient();
            });
        } catch (e) {
            return console.log(e);
        }
    })

}, 5000000);