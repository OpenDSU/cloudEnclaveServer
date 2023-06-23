function MessageDispatcher(didDocument) {
    this.waitForMessages = (callback) => {
        didDocument.subscribe((err, res) => {
            if (err) {
                callback(err);
                return
            }

            callback(undefined, JSON.parse(res));
        });
    };

    this.sendMessage = (result, clientDID) => {
        const opendsu = require("opendsu");
        opendsu.loadApi("w3cdid").resolveDID(clientDID, (err, clientDIDDocument) => {
            if (err) {
                return console.log(err);
            }
            didDocument.sendMessage(result, clientDIDDocument, (err, res) => {
                console.log(`Message :${result} sent to ${didDocument.getIdentifier()} client`)
                if (err) {
                    console.log(err);
                }
            })
        });
    };
}

module.exports = {
    MessageDispatcher
}