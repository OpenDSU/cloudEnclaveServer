const openDSU = require("opendsu");
const w3cDID = openDSU.loadAPI("w3cdid");
const keySSISpace = openDSU.loadAPI("keyssi");
const enclaveAPI = openDSU.loadAPI("enclave");

const path = require("path");
const fs = require("fs");
const sc = openDSU.loadAPI("crypto");

function CloudEnclaveBootService(server) {
    const processList = {}
    const SecurityDecorator = require("./SecurityDecorator");

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

    this.bootEnclave = async (enclaveConfig) => {
        const child = require("child_process").fork(path.join(process.env.PSK_ROOT_INSTALATION_FOLDER, ".", __dirname, "./CloudEnclave.js"), [JSON.stringify(enclaveConfig)]);
        const listenForMessage = () => {
            return new Promise((resolve) => {
                child.on('message', (didIdentifier) => {
                    processList[didIdentifier] = child;
                    resolve();
                });
            });
        };

        await listenForMessage();
    }

    this.bootEnclaves = async () => {
        const storageFolder = this.getStorageFolder();
        const _boot = async () => {
            const enclaveConfigFolders = fs.readdirSync(storageFolder).filter(file => fs.statSync(path.join(storageFolder, file)).isDirectory());
            for (let i = 0; i < enclaveConfigFolders.length; i++) {
                const enclaveConfigFolder = enclaveConfigFolders[i];
                const enclaveConfigFile = fs.readdirSync(path.join(storageFolder, enclaveConfigFolder)).find(file => file.endsWith(".json"));
                if (enclaveConfigFile) {
                    const enclaveConfig = JSON.parse(fs.readFileSync(path.join(storageFolder, enclaveConfigFolder, enclaveConfigFile)));
                    await this.bootEnclave(enclaveConfig);
                }
            }

            return server.dispatchEvent("initialised", Object.keys(processList));
        }

        const scApi = require("opendsu").loadApi("sc");
        const sc = scApi.getSecurityContext();
        if (sc.isInitialised()) {
            return await _boot();
        }
        sc.on("initialised", async () => {
            return await _boot();
        });
    }

    const initEnclave = (didDocument) => {
        const securityDecorator = new SecurityDecorator(persistence);
        this.main = new CloudEnclave(didDocument, securityDecorator);
        this.didDocument = didDocument;
        loadLambdas(this.main, server);
        if (this.main.initialised) {
            finishInit();
        } else {
            this.main.on("initialised", finishInit)
        }
    }

    const finishInit = () => {
        console.log("Main enclave process initialised");
        this.main.name = server.serverConfig.name;
        server.remoteDID = this.didDocument.getIdentifier();
        if (server.serverConfig.auditDID !== undefined) {
            initAudit(server.remoteDID, server.serverConfig.auditDID);
        } else {
            server.initialised = true;
            server.dispatchEvent("initialised", this.didDocument.getIdentifier());
            console.log("Initialised event dispatched");
        }
    }

    const initAudit = async (currentDID, auditDID) => {
        const clientSeedSSI = keySSISpace.createSeedSSI("vault", "other secret");
        const clientDIDDocument = await $$.promisify(w3cDID.createIdentity)("ssi:key", clientSeedSSI);

        const auditClient = enclaveAPI.initialiseRemoteEnclave(clientDIDDocument.getIdentifier(), auditDID);
        auditClient.on("initialised", () => {
            this.main.auditClient = auditClient;
            this.main.addEnclaveMethod("audit", (...args) => {
                auditClient.callLambda("addAudit", ...args, server.serverConfig.name, () => {
                });
            })
            server.initialised = true;
            server.dispatchEvent("initialised", currentDID);
        })

    }

    const loadLambdas = (cloudEnclaveProcess, server) => {
        const lambdasPath = server.serverConfig.lambdas;
        try {
            fs.readdirSync(lambdasPath).forEach(file => {
                if (file.endsWith(".js")) {
                    const importedObj = require(lambdasPath + "/" + file);
                    for (let prop in importedObj) {
                        if (typeof importedObj[prop] === "function") {
                            importedObj[prop](cloudEnclaveProcess);
                        }
                    }
                }
            })
        } catch (err) {
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
            this.main = new CloudEnclave(didIdentifier, undefined, path.join(mainPath, dirs[0]));
            this.main.on("initialised", () => {
                server.remoteDID = didIdentifier;
                server.initialised = true;
                server.dispatchEvent("initialised");
            })
        })
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
    CloudEnclaveBootService
};
