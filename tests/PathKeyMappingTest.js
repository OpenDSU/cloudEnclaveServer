require("../../opendsu-sdk/builds/output/testsRuntime")
const tir = require("../../opendsu-sdk/psknode/tests/util/tir");

const dc = require("double-check");
const assert = dc.assert;
const openDSU = require("../../opendsu-sdk/modules/opendsu");
$$.__registerModule("opendsu", openDSU);
const keySSISpace = openDSU.loadAPI("keyssi");
const scAPI = openDSU.loadAPI("sc");
const crypto = openDSU.loadAPI("crypto");

const utils = require("../../opendsu-sdk/modules/opendsu/enclave/impl/utils");
const PathKeyMapping = require("../../opendsu-sdk/modules/opendsu/enclave/impl/PathKeyMapping");
const ServerEnclave = require("../ServerEnclave");
const { LokiDBPathStrategy } = require("../PathMappingStorageStrategy");

assert.callback('PathKeySSI mapping test', (testFinished) => {
    dc.createTestFolder('testFolder', async (err, folder) => {

        const vaultDomainConfig = {
            "anchoring": {
                "type": "FS",
                "option": {}
            }
        }
        await tir.launchConfigurableApiHubTestNodeAsync({ domains: [{ name: "vault", config: vaultDomainConfig }], rootFolder: folder });
        const enclave = new ServerEnclave(folder);
        const sc = scAPI.getSecurityContext(enclave);
        sc.on("initialised", async () => {

            const storageStrategy = new LokiDBPathStrategy(enclave);
            const pathKeySSIMapping = new PathKeyMapping(storageStrategy);

            let expectedResult = {};
            const NO_KEY_SSIS = 10;
            for (let i = 0; i < NO_KEY_SSIS; i++) {
                const path = crypto.generateRandom(16).toString("hex")
                const pathKeySSI = keySSISpace.createPathKeySSI("vault", `0/${path}`);
                await $$.promisify(pathKeySSIMapping.storePathKeySSI)(pathKeySSI);
                const ssiMapping = await $$.promisify(utils.getKeySSIMapping)(pathKeySSI);
                expectedResult = utils.mergeMappings(expectedResult, ssiMapping);
            }

            const mapping = await $$.promisify(pathKeySSIMapping._getMapping)();
            for (let ssiType in expectedResult) {
                let expectedPaths = Object.values(expectedResult[ssiType]).sort();
                let actualPaths = Object.values(mapping[ssiType]).sort();
                assert.objectsAreEqual(expectedPaths, actualPaths);
            }
            testFinished();


        });

    });
}, 1000000);