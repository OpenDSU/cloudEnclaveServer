require("../../../psknode/bundles/testsRuntime");
const tir = require("../../../psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("opendsu");

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

        const fs = require("fs");
        const path = require("path");
        const lambdaDefinition = "const fn = (...args) => {\n" +
            "    const callback = args.pop();\n" +
            "    callback(undefined, args);\n" +
            "}\n" +
            "\n" +
            "module.exports = {\n" +
            "    registerLambdas: function (remoteEnclaveServer) {\n" +
            "        remoteEnclaveServer.addEnclaveMethod(\"testLambda\", fn, \"read\");\n" +
            "    }\n" +
            "}"

        fs.mkdirSync(path.join(folder,"main"), {recursive: true});
        fs.writeFileSync(path.join(folder,"main", "lambda.js"), lambdaDefinition);
        const domain = "vault";
        const apiHub = await tir.launchConfigurableApiHubTestNodeAsync({
            domains: [{
                name: domain,
                config: testDomainConfig
            }],
            rootFolder: folder
        });
        const serverDID = await tir.launchConfigurableRemoteEnclaveTestNodeAsync({
            rootFolder: folder,
            domain,
            apiHubPort: apiHub.port
        });

        try {
            const keySSISpace = openDSU.loadAPI("keyssi");
            const scAPI = openDSU.loadApi("sc");
            const createRemoteEnclaveClient = async () => {
                const clientSeedSSI = keySSISpace.createSeedSSI("vault", "some secret");
                const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

                const remoteEnclaveClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), serverDID);
                remoteEnclaveClient.on("initialised", async () => {
                    remoteEnclaveClient.callLambda("testLambda", "param1", "param2", (err, result) => {
                        console.log(err, result);
                        assert.true(err === undefined, "Lambda call failed");
                        assert.equal(`["param1","param2"]`, result, "Lambda result is not as expected");
                        testFinished();
                    })
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
    });
}, 500000);