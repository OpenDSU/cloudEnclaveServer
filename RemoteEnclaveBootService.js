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
        const keySSISpace = require("opendsu").loadAPI("keyssi");
        const seedSSI = keySSISpace.createSeedSSI(process.env.REMOTE_ENCLAVE_DOMAIN, process.env.REMOTE_ENCLAVE_SECRET);
        const mainEnclaveFolderPath = path.join(storageFolder, "main");
        try {
            fs.accessSync(mainEnclaveFolderPath);
        } catch (e) {
            return w3cDID.createIdentity("ssi:key", seedSSI, async (err, didDoc) => {
                if (err) {
                    server.dispatchEvent("error", err);
                    return;
                }
                this.createFolderForMainEnclave(mainEnclaveFolderPath, (err, didDir) => {
                    if (err) {
                        server.dispatchEvent("error", err);
                        return err;
                    }

                    initMainEnclave(didDoc, didDir);
                })
            });
        }

        w3cDID.createIdentity("ssi:key", seedSSI, async (err, didDoc) => {
            if (err) {
                server.dispatchEvent("error", err);
                return;
            }

            initMainEnclave(didDoc, mainEnclaveFolderPath);
        });
    }

    const initMainEnclave = (didDocument, didDir) => {
        this.main = new ServerEnclaveProcess(didDocument, didDir);
        loadLambdas(this.main, didDir);
        this.main.on("initialised", () => {
            server.remoteDID = didDocument.getIdentifier();
            server.initialised = true;
            server.dispatchEvent("initialised", didDocument.getIdentifier());
            this.decorateMainEnclave();
        })
    }

    const loadLambdas = (serverEnclaveProcess, lambdasPath) => {
        fs.readdirSync(lambdasPath).forEach(file => {
            if(file.endsWith(".js")){
                const importedObj = require(path.join(lambdasPath, file));
                for(let prop in importedObj){
                    if(typeof importedObj[prop] === "function"){
                        importedObj[prop](serverEnclaveProcess);
                    }
                }
            }
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

    this.createFolderForMainEnclave = (folderPath, callback) => {
        fs.mkdir(folderPath, {recursive: true}, (err) => {
            if (err) {
                return callback(err);
            }
            return callback(undefined, folderPath);
        });
    }

    this.getStorageFolder = () => {
        return path.resolve(server.serverConfig.rootFolder);
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
