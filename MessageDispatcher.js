class MessageDispatcher {
    constructor(didDocument, callback) {
        this.didDoc = didDocument;
        this.waitForMessages(callback)
    }

    waitForMessages(callback) {
        this.didDoc.waitForMessages((err, res) => {
            if (err) {
                callback(err);
                return
            }

            callback(undefined, JSON.parse(res));
        });
    };

    sendMessage(result, clientDID) {
        this.didDoc.sendMessage(result, clientDID, (err, res) => {
            if (err) {
                console.log(err);
            }
        })
    }

}

module.exports = {
    MessageDispatcher
}