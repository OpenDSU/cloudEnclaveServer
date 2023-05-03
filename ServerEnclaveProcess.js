const { MessageDispatcher } = require("./MessageDispatcher");
const ServerEnclave = require("./ServerEnclave");
const ObservableMixin = require("./../opendsu-sdk/modules/opendsu/utils/ObservableMixin");

const openDSU = require("../opendsu-sdk/modules/opendsu");
const scAPI = openDSU.loadAPI("sc");
const w3cDID = openDSU.loadAPI("w3cdid");

class ServerEnclaveProcess {
    constructor(didIdentifier, privateKeys, storageFolder) {
        this.enclave = new ServerEnclave(didIdentifier, storageFolder);
        this.sc = scAPI.getSecurityContext(this.enclave);
        ObservableMixin(this);
        this.sc.on("initialised", () => {
            this.initMessaging(didIdentifier, privateKeys);
        })

    }

    async initMessaging(didIdentifier, privateKeys) {
        this.didDoc = await $$.promisify(w3cDID.resolveDID)(didIdentifier);
        if (privateKeys) {
            await this.storeDIDPrivateKeys(privateKeys)
        }
        this.messageDispatcher = new MessageDispatcher(this.didDoc, (err, commandObject) => {
            this.execute(err, commandObject);
        });
        this.dispatchEvent("initialised");
    }

    async storeDIDPrivateKeys(privateKeys) {
        return Promise.all(privateKeys
            .map(key => $$.promisify(this.enclave.addPrivateKeyForDID)(this.didDoc, key)));
    }

    execute(err, commandObject) {
        if (err) {
            console.log(err);
            return;
        }
        const clientDID = commandObject.params.pop();
        try {
            const command = commandObject.commandName;
            const params = commandObject.params;
            const callback = (err, res) => {
                const resultObj = {
                    "commandResult": err ? err : res,
                    "commandID": commandObject.commandID
                };
                this.messageDispatcher.sendMessage(JSON.stringify(resultObj), clientDID);
            }
            params.push(callback);
            const enclave = this.enclave;
            this.enclave[command].apply(enclave, params);
        }
        catch (err) {
            console.log(err);
            return err;
        }
    }

    addEnclaveMethod(methodName, method){
        this.enclave[methodName] = method;
    }
}
module.exports = ServerEnclaveProcess;

const arguments = process.argv;
if (arguments.length > 2) {
    new ServerEnclaveProcess(arguments[2]);
}
