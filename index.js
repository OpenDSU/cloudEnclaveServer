const defaultConfig = require("./config");
const {RemoteEnclaveBootService} = require("./RemoteEnclaveBootService");

function RemoteEnclaveServer(config) {
    const openDSU = require("opendsu");
    const utils = openDSU.loadAPI("utils");
    const ObservableMixin = utils.ObservableMixin;
    this.enclaveHandler = new RemoteEnclaveBootService(this);
    this.serverConfig = config == undefined ? defaultConfig : config;
    this.initialised = false;
    ObservableMixin(this);


    this.start = () => {
        this.enclaveHandler.bootEnclaves();
    }

    this.isInitialised = () => {
        return this.initialised;
    }
}

module.exports = {
    RemoteEnclaveServer
}