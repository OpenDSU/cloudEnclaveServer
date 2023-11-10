function CloudEnclaveServer(config) {
    config = config || {};
    const {CloudEnclaveBootService} = require("./src/CloudEnclaveBootService");
    let defaultConfig = require("./src/config");
    defaultConfig = Object.assign(defaultConfig, config);
    config = defaultConfig;
    const openDSU = require("opendsu");
    const utils = openDSU.loadAPI("utils");
    const ObservableMixin = utils.ObservableMixin;
    this.enclaveHandler = new CloudEnclaveBootService(this);
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
    return new CloudEnclaveServer(config);
}

module.exports = {
    createInstance
}