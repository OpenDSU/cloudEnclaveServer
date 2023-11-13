const {getLokiEnclaveFacade} = require("./utils");
const openDSU = require("opendsu");
const enclaveAPI = openDSU.loadAPI("enclave");
const EnclaveMixin = enclaveAPI.EnclaveMixin;

function ServerEnclave(didDocument, storageFolder) {
    EnclaveMixin(this, didDocument, undefined);
    const lokiEnclaveFacadeInstance = getLokiEnclaveFacade(require("path").join(storageFolder, "enclave"));
    Object.assign(this, lokiEnclaveFacadeInstance);

    this.getKeySSI = (callback) => {
        return callback(undefined, undefined);
    }

    this.getEnclaveType = () => {
        return "CloudEnclave";
    }

    this.isInitialised = () => {
        return true;
    };
}

module.exports = ServerEnclave
