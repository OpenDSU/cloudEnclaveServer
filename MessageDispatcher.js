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
        didDocument.sendMessage(result, clientDID, (err, res) => {
            console.log("Message sent to client", err, res)
            if (err) {
                console.log(err);
            }
        })
    };
}

module.exports = {
    MessageDispatcher
}