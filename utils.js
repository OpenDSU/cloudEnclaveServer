const getLokiEnclaveFacade = (pth) => {
    if(typeof $$.LokiEnclaveFacade === "undefined"){
        const lokiEnclaveFacadeModule = require("loki-enclave-facade");
        const lokiEnclaveFacadeInstance = lokiEnclaveFacadeModule.createLokiEnclaveFacadeInstance(pth);
        const wrappedEnclaveFacade = {};
        for(let methodName in lokiEnclaveFacadeInstance){
            wrappedEnclaveFacade[methodName] = (...args)=>{
                args.unshift(undefined);
                lokiEnclaveFacadeInstance[methodName](...args);
            }
        }
        $$.LokiEnclaveFacade = wrappedEnclaveFacade;
    }

    return $$.LokiEnclaveFacade;
}

module.exports = {
    getLokiEnclaveFacade
}