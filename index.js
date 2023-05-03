const defaultConfig = require("./config");
const { RemoteEnclaveBootService } = require("./RemoteEnclaveBootService");
const ObservableMixin = require("./../opendsu-sdk/modules/opendsu/utils/ObservableMixin");

class RemoteEnclaveServer {

    constructor(config) {
        this.enclaveHandler = new RemoteEnclaveBootService(this);
        this.serverConfig = config == undefined ? defaultConfig : config;
        this.initialised = false;
        ObservableMixin(this);
    }


    start() {
        this.enclaveHandler.bootEnclaves();
    }

    isInitialised() {
        return this.initialised;
    }

}

module.exports = {
    RemoteEnclaveServer
}