const {getLokiEnclaveFacade} = require("./utils");
const openDSU = require("opendsu");
const enclaveAPI = openDSU.loadAPI("enclave");
const EnclaveMixin = enclaveAPI.EnclaveMixin;

function ServerEnclave(didDocument, storageFolder) {
    EnclaveMixin(this, didDocument, undefined);
    this.storageDB = getLokiEnclaveFacade(require("path").join(storageFolder, "enclave"));

    const initialised = true;

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
