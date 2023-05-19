function RemoteEnclaveServer(config) {
    config = config || {};
    const {RemoteEnclaveBootService} = require("./RemoteEnclaveBootService");
    let defaultConfig = require("./config");
    defaultConfig = Object.assign(defaultConfig, config);
    config = defaultConfig;
    const openDSU = require("opendsu");
    const utils = openDSU.loadAPI("utils");
    const ObservableMixin = utils.ObservableMixin;
    this.enclaveHandler = new RemoteEnclaveBootService(this);
    this.serverConfig = config;
    this.initialised = false;
    ObservableMixin(this);

    this.start = () => {
        this.enclaveHandler.bootEnclaves();
    }

    this.isInitialised = () => {
        return this.initialised;
    }
}

const createInstance = (config) => {
    return new RemoteEnclaveServer(config);
}

module.exports = {
    createInstance
}