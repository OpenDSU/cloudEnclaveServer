function MessageDispatcher(didDocument) {
    const didDoc = didDocument;

    this.waitForMessages = (callback) => {
        didDoc.waitForMessages((err, res) => {
            if (err) {
                callback(err);
                return
            }

            callback(undefined, JSON.parse(res));
        });
    };

    this.sendMessage = (result, clientDID) => {
        didDoc.sendMessage(result, clientDID, (err, res) => {
            if (err) {
                console.log(err);
            }
        })
    };
}

module.exports = {
    MessageDispatcher
}