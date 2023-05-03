const { getLokiEnclaveFacade } = require("../opendsu-sdk/modules/opendsu/enclave/impl/lib/LokiEnclaveFacade");
const EnclaveMixin = require("../opendsu-sdk/modules/opendsu/enclave/impl/Enclave_Mixin");

class ServerEnclave {

    constructor(didDocument, storageFolder){
       
        this.storageDB =  getLokiEnclaveFacade(require("path").join(storageFolder, "enclave"));
        this.copyMethods();
        EnclaveMixin(this, didDocument, undefined);
        
        this.initialised = true;
    }

    copyMethods(){
        Object.keys(this.storageDB).forEach(method => {
            this[method] = (...args) => {
                this.storageDB[method](args);
            }
        })
    }

    getKeySSI(callback){
        return callback(undefined, undefined);
    }

    getEnclaveType(){
        return "RemoteEnclave";
    }

    isInitialised = () => {
        return true;
    };
}

module.exports = ServerEnclave
