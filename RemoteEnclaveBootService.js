const openDSU = require("opendsu");
const w3cDID = openDSU.loadAPI("w3cdid");
const path = require("path");
const fs = require("fs");
const sc = openDSU.loadAPI("crypto");
const { fork } = require('child_process');
const ServerEnclaveProcess = require("./ServerEnclaveProcess");

class RemoteEnclaveBootService {

    constructor(server) {
        this.processList = {}
        this.server = server;
    }

    async createEnclave(req, res) {
        const adminDID = req.params.adminDID;
        const key = require('crypto').randomBytes(16).toString("base64")
        const didDocument = await $$.promisify(w3cDID.createIdentity)("key", undefined, key);
        this.createFolderForDID(didDocument.getIdentifier(), (err, didDir) => {
            if (err) {
                res.end(err);
            }
            // initEnclave(logger, didDocument, didDir);
            //to do
            res.end(didDocument.getIdentifier())
        })

    }

    bootEnclaves() {
        const storageFolder = this.getStorageFolder();

        if (!fs.existsSync(path.join(storageFolder, "main"))) {
            w3cDID.createIdentity("key", undefined, process.env.REMOTE_ENCLAVE_SECRET, async (err, didDoc) => {
                if (err) {
                    console.log(err);
                    return err;
                }
                this.createFolderForDID(didDoc.getIdentifier(), (err, didDir) => {
                    if (err) {
                        console.log(err);
                        return err;
                    }
                    this.main = new ServerEnclaveProcess(didDoc.getIdentifier(), didDoc.getPrivateKeys(), didDir);
                    this.main.on("initialised", () => {
                        this.server.remoteDID = didDoc.getIdentifier();
                        this.server.initialised = true;
                        this.server.dispatchEvent("initialised");
                        this.decorateMainEnclave();
                    })

                }, true)
            });
            return;
        }

        this.getDirectories(storageFolder, (err, dirs) => {
            if (err) {
                console.log(err);
                return err;
            }
            dirs.forEach(async (dir) => {
                if (dir == "main") {
                    this.bootMain(path.join(storageFolder, "main"));
                    return;
                }
                const did = sc.decodeBase58(dir).toString("utf8");
                const didDocument = await $$.promisify(w3cDID.resolveDID)(did);
                const child = fork(path.join(__dirname, "./ServerEnclaveProcess.js"),
                    [didDocument.getIdentifier(), undefined, path.join(storageFolder, dir)]);
                this.processList[didDocument.getIdentifier()] = child;
            })
        })
    }

    bootMain(mainPath) {
        this.getDirectories(mainPath, async (err, dirs) => {
            if (err) {
                console.log(err);
                return err;
            }

            const didIdentifier = sc.decodeBase58(dirs[0]).toString("utf8");
            this.main = new ServerEnclaveProcess(didIdentifier, undefined, path.join(mainPath, dirs[0]));
            this.main.on("initialised", () => {
                this.server.remoteDID = didIdentifier;
                this.server.initialised = true;
                this.server.dispatchEvent("initialised");
                this.decorateMainEnclave();
            })
        })
    }

    decorateMainEnclave(){
        
    }

    createFolderForDID(did, callback, main) {
        const base58DID = sc.encodeBase58(did);
        const didDir = path.join(main ?
            path.join(this.getStorageFolder(), "main") :
            this.getStorageFolder(),
            base58DID);

        fs.mkdir(didDir, { recursive: true }, (err) => {
            if (err) {
                return callback(err);
            }
            return callback(undefined, didDir);
        });
    }

    getStorageFolder() {
        const enclavePath = path.join("external-volumes", "enclave");
        return path.join(this.server.serverConfig.rootFolder, enclavePath);
    }

    getDirectories(source, callback) {
        fs.readdir(source, { withFileTypes: true }, (err, files) => {
            if (err) {
                callback(err)
            } else {
                let dirs = files
                    .filter(dirent => dirent.isDirectory());
                dirs = dirs.map(dirent => dirent.name);
                callback(undefined, dirs);

            }
        })
    }

}



module.exports = {
    RemoteEnclaveBootService
};

// delete enclaves
// secrets in child
// 