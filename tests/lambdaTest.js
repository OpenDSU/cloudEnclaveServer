require("../opendsu-sdk/psknode/bundles/testsRuntime");
const tir = require("../opendsu-sdk/psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const acl = require("../acl-magic/index")
const openDSU = require("opendsu");
$$.__registerModule("acl-magic", acl)

const scAPI = openDSU.loadApi("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadApi("enclave");


const {RemoteEnclaveServer} = require("..");
process.env.REMOTE_ENCLAVE_SECRET = "something";

assert.callback('Lambda test', (testFinished) => {
    dc.createTestFolder('createDSU', async (err, folder) => {
        const testDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            },
            "enable": ["enclave", "mq"]
        }

        const domain = "testDomain"
        const apiHub = await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{
                name: domain,
                config: testDomainConfig
            }]
        });
        const server = new RemoteEnclaveServer();
        const serverDID = server.start();

        server.on("initialised", async () => {
            try {
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("key", undefined, "some secret");
                const clientDID = clientDIDDocument.getIdentifier();

                const remoteEnclaveClient = enclaveAPI.initialiseRemoteEnclave(clientDID, serverDID);

                remoteEnclaveClient.on("initialised", async () => {
                    remoteEnclaveClient.callLambda("test_lambda", param1, param2, (err, result) => {
                        assert.true(err === undefined, "Lambda call failed");
                        assert.equal(result, "test", "Lambda result is not as expected");
                    })
                });

            } catch (e) {
                return console.log(e);
            }
        })
    });
}, 500000);