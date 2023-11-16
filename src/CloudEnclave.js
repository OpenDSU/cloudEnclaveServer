function CloudEnclave(didDocument, securityDecorator) {
    const { MessageDispatcher } = require("./MessageDispatcher");
    const openDSU = require("opendsu");
    const utils = openDSU.loadAPI("utils");
    const ObservableMixin = utils.ObservableMixin;
    const scAPI = openDSU.loadAPI("sc");

    let didDoc;
    const sc = scAPI.getSecurityContext();
    ObservableMixin(this);

    const initMessaging = async (didDocument) => {
        this.messageDispatcher = new MessageDispatcher(didDocument)
        this.messageDispatcher.waitForMessages((err, commandObject) => {
            this.execute(err, commandObject);
        });
        console.log("Dispatching initialised event from server securityDecorator process");
        this.initialised = true;
        this.dispatchEvent("initialised");
    }

    const storeDIDPrivateKeys = (privateKeys) => {
        return Promise.all(privateKeys
            .map(key => {
                return $$.promisify(securityDecorator.addPrivateKeyForDID)(didDoc, key)
            }));
    }

    this.execute = (err, commandObject) => {
        if (err) {
            console.log(err);
            return;
        }
        const clientDID = commandObject.params.pop();
        console.log("Preparing to execute message for " + clientDID);
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
            securityDecorator[command].apply(securityDecorator, params);
        } catch (err) {
            console.log(err);
            return err;
        }
    }

    this.addEnclaveMethod = (methodName, method) => {
        securityDecorator[methodName] = method;
    }

    if (sc.isInitialised()) {
        console.log("Security context already initialised");
        initMessaging(didDocument);
    } else {
        sc.on("initialised", () => {
            console.log("Security context was initialised");
            initMessaging(didDocument);
        })
    }
}

module.exports = CloudEnclave;