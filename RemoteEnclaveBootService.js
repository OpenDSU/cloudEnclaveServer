const openDSU = require("opendsu");
const w3cDID = openDSU.loadAPI("w3cdid");
const keySSISpace = openDSU.loadAPI("keyssi");
const enclaveAPI = openDSU.loadAPI("enclave");

const path = require("path");
const fs = require("fs");
const sc = openDSU.loadAPI("crypto");
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
        const mainEnclaveFolderPath = path.join(storageFolder, "main");

        const _boot = () => {
            try {
                fs.accessSync(mainEnclaveFolderPath);
            } catch (e) {
                return w3cDID.resolveNameDID(process.env.CLOUD_ENCLAVE_DOMAIN, server.serverConfig.name, process.env.CLOUD_ENCLAVE_SECRET, async (err, didDoc) => {
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

            w3cDID.resolveNameDID(process.env.CLOUD_ENCLAVE_DOMAIN, server.serverConfig.name, process.env.CLOUD_ENCLAVE_SECRET, async (err, didDoc) => {
                if (err) {
                    server.dispatchEvent("error", err);
                    return;
                }

                initMainEnclave(didDoc, mainEnclaveFolderPath);
            });
        }

        const scApi = require("opendsu").loadApi("sc");
        const sc = scApi.getSecurityContext();
        if (sc.isInitialised()) {
            return _boot();
        }
        sc.on("initialised", () => {
            _boot();
        });
    }

    const initMainEnclave = (didDocument, didDir) => {

        console.log("Initialising main enclave ", didDir);

        this.main = new ServerEnclaveProcess(didDocument, didDir);
        this.didDocument = didDocument;
        loadLambdas(this.main, server);
        if (this.main.initialised) {
            finishInit();
        }
        else {
            this.main.on("initialised", finishInit)
        }
    }

    const finishInit = () => {
        console.log("Main enclave process initialised");
        this.main.name = server.serverConfig.name;
        server.remoteDID = this.didDocument.getIdentifier();
        if (server.serverConfig.auditDID !== undefined) {
            initAudit(server.remoteDID, server.serverConfig.auditDID);
        }
        else {
            server.initialised = true;
            server.dispatchEvent("initialised", this.didDocument.getIdentifier());
            console.log("Initialised event dispatched");
            this.decorateMainEnclave();
        }
    }

    const initAudit = async (currentDID, auditDID) => {
        const clientSeedSSI = keySSISpace.createSeedSSI("vault", "other secret");
        const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

        const auditClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), auditDID);
        auditClient.on("initialised", () => {
            this.main.auditClient = auditClient;
            this.main.addEnclaveMethod("audit", (...args) => {
                auditClient.callLambda("addAudit", ...args, server.serverConfig.name, () => { });
            })
            server.initialised = true;
            server.dispatchEvent("initialised", currentDID);
            this.decorateMainEnclave();
        })

    }

    const loadLambdas = (serverEnclaveProcess, server) => {
        const lambdasPath = server.serverConfig.lambdas;
        try {
            fs.readdirSync(lambdasPath).forEach(file => {
                if (file.endsWith(".js")) {
                    const importedObj = require(lambdasPath + "/" + file);
                    for (let prop in importedObj) {
                        if (typeof importedObj[prop] === "function") {
                            importedObj[prop](serverEnclaveProcess);
                        }
                    }
                }
            })
        }
        catch (err) {
            server.dispatchEvent("error", err);
        }

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
        fs.mkdir(folderPath, { recursive: true }, (err) => {
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
