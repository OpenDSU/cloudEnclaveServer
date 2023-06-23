require("../../../psknode/bundles/testsRuntime");
const tir = require("../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadApi("sc");
const w3cDID = openDSU.loadAPI("w3cdid");
const enclaveAPI = openDSU.loadAPI("enclave");
const crypto = openDSU.loadAPI("crypto");

assert.callback('Create accounting enclave test', (testFinished) => {
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
        const config = {
            rootFolder: folder,
            domain,
            apiHubPort: apiHub.port
        };


        const sendSecret = crypto.getRandomSecret(12);
        const receiveSecret = crypto.getRandomSecret(12);

        try {
            const sendEnclaveDID = await tir.launchConfigurableRemoteEnclaveTestNodeAsync({
                domain,
                apihubPort: apiHub.port,
                useWorker: true,
                config: {
                    rootFolder: folder,
                    secret: sendSecret,
                    lambdas: "./opendsu-sdk/modules/remote-enclave/tests/lambdaExamples/send",
                    name: "send"
                }
            });

            const receiveEnclaveDID = await tir.launchConfigurableRemoteEnclaveTestNodeAsync({
                domain,
                apihubPort: apiHub.port,
                useWorker: false,
                config: {
                    rootFolder: folder,
                    secret: receiveSecret,
                    lambdas: "./opendsu-sdk/modules/remote-enclave/tests/lambdaExamples/receive",
                    name: "receive"
                }
            });
            const callsNumber = 1;

            const createSendEnclaveClient = async () => {
                const clientSeedSSI = keySSISpace.createSeedSSI("vault", "secret");
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

                const sendClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), sendEnclaveDID);

                sendClient.on("initialised", async () => {
                    let results = 0;
                    for (let i = 0; i < callsNumber; i++) {
                        sendClient.callLambda("benchmarkSend", "hello", receiveEnclaveDID, (err, result) => {
                            console.log(err, result);
                            assert.true(err === undefined, "Audit lambda call failed");
                            assert.equal(result, "\"\\\"hello\\\"\"", "Audit lambda result is not as expected");
                            results += 1;
                            if (results == callsNumber) {
                                testFinished();
                            }
                        })
                    }
                });

            }

            const sc = scAPI.getSecurityContext();
            if (sc.isInitialised()) {
                return await createSendEnclaveClient();
            }
            sc.on("initialised", async () => {
                await createSendEnclaveClient();
            });
        }
        catch (err) {
            console.log(err);
        }
    })

}, 500000);