require("../../../builds/output/testsRuntime");
const double_check = require("double-check");
const assert = double_check.assert;
const SecurityDecorator = require("../src/SecurityDecorator");
const {createLokiEnclaveFacadeInstance} = require("loki-enclave-facade");
assert.callback("SecurityDecorator test", async (callback) => {
    double_check.createTestFolder("testFolder", async (err, folder) => {
        const path = require("path");
        const enclave = createLokiEnclaveFacadeInstance(path.join(folder,"test"), 1000);
        const securityDecorator = new SecurityDecorator(enclave);
        const forDID = "did:ssi:name:vault:123456789";
        const resource = "testResource";
        let error;
        try {
            await $$.promisify(securityDecorator.grantReadAccess)(forDID, resource);
            const hasReadAccess = await $$.promisify(securityDecorator.hasReadAccess)(forDID, resource);
            assert.true(hasReadAccess, "Failed to check if read access was granted");
            await $$.promisify(securityDecorator.revokeReadAccess)(forDID, resource);
            const hasReadAccessAfterRevoke = await $$.promisify(securityDecorator.hasReadAccess)(forDID, resource);
            assert.false(hasReadAccessAfterRevoke, "Failed to check if read access was revoked");
            await $$.promisify(securityDecorator.grantReadAccess)(forDID, resource);
            const hasReadAccessAfterGrant = await $$.promisify(securityDecorator.hasReadAccess)(forDID, resource);
            assert.true(hasReadAccessAfterGrant, "Failed to check if read access was granted");
        } catch (e) {
            error = e;
        }

        assert.false(error, "Failed to grant/revoke read access");
        callback();
    });
}, 5000);