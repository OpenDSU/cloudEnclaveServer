const {PERSISTENCE_TYPES} = require("./constants");
const registry = {};
function PersistenceRegistry() {}

PersistenceRegistry.prototype.register = (name, persistence) => {
    registry[name] = persistence;
}

PersistenceRegistry.prototype.get = (name) => {
    return registry[name];
}

const {createLokiEnclaveFacadeInstance} = require("loki-enclave-facade");
PersistenceRegistry.prototype.register(PERSISTENCE_TYPES.LOKI, createLokiEnclaveFacadeInstance);

module.exports = new PersistenceRegistry();