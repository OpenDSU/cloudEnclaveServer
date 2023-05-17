const openDSU = require("opendsu");
const w3cDID = openDSU.loadAPI("w3cdid");
const path = require("path");
const fs = require("fs");
const sc = openDSU.loadAPI("crypto");
const {fork} = require('child_process');
const ServerEnclaveProcess = require("./ServerEnclaveProcess");

function RemoteEnclaveBootService(server) {
    const processList = {}

    this.createEnclave = async (req, res) => {
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

    this.bootEnclaves = () => {
        const storageFolder = this.getStorageFolder();

        if (!fs.existsSync(path.join(storageFolder, "main"))) {
            const keySSISpace = require("opendsu").loadAPI("keyssi");
            const seedSSI = keySSISpace.createSeedSSI("vault", process.env.REMOTE_ENCLAVE_SECRET);
            w3cDID.createIdentity("ssi:key", seedSSI, async (err, didDoc) => {
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
                        server.remoteDID = didDoc.getIdentifier();
                        server.initialised = true;
                        server.dispatchEvent("initialised");
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
                if (dir === "main") {
                    this.bootMain(path.join(storageFolder, "main"));
                    return;
                }
                const did = sc.decodeBase58(dir).toString("utf8");
                const didDocument = await $$.promisify(w3cDID.resolveDID)(did);
                const child = fork(path.join(__dirname, "./ServerEnclaveProcess.js"), [didDocument.getIdentifier(), undefined, path.join(storageFolder, dir)]);
                processList[didDocument.getIdentifier()] = child;
            })
        })
    }

    this.bootMain = (mainPath) => {
        this.getDirectories(mainPath, async (err, dirs) => {
            if (err) {
                console.log(err);
                return err;
            }

            const didIdentifier = sc.decodeBase58(dirs[0]).toString("utf8");
            this.main = new ServerEnclaveProcess(didIdentifier, undefined, path.join(mainPath, dirs[0]));
            this.main.on("initialised", () => {
                server.remoteDID = didIdentifier;
                server.initialised = true;
                server.dispatchEvent("initialised");
                this.decorateMainEnclave();
            })
        })
    }

    this.decorateMainEnclave = () => {

    }

    this.createFolderForDID = (did, callback, main) => {
        const base58DID = sc.encodeBase58(did);
        const didDir = path.join(main ? path.join(this.getStorageFolder(), "main") : this.getStorageFolder(), base58DID);

        fs.mkdir(didDir, {recursive: true}, (err) => {
            if (err) {
                return callback(err);
            }
            return callback(undefined, didDir);
        });
    }

    this.getStorageFolder = () => {
        const enclavePath = path.join("external-volumes", "enclave");
        return path.join(server.serverConfig.rootFolder, enclavePath);
    }

    this.getDirectories = (source, callback) => {
        fs.readdir(source, {withFileTypes: true}, (err, files) => {
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