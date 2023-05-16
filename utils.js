const getLokiEnclaveFacade = (pth) => {
    if(typeof $$.LokiEnclaveFacade === "undefined"){
        const LokiEnclaveFacade = require("loki-enclave-facade");
        const lokiEnclaveFacadeInstance = new LokiEnclaveFacade(pth);
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