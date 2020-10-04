const util = {
    __debug : false,

    setDebug : function(on) {
        if ( on ) {
            __debug = true;
        } else {
            __debug = false;
        }
    },

    debug : function(msg) {
        if ( __debug ) {
            printjson(msg);
        }
    },

    loadGetMongoData : function() {
        const fn = util.tryLoadFileName("getMongoData");
        try {
            return JSON.parse( util.loadFile(fn) );
        } catch(error) {
            util.debug("Unable to parse json in getMongoData file: " + fn);
            try {
                return legacyGetMongoDataParser.getJsonIndexInfo( util.loadFileLines( fn ) );
            } catch(error2) {
                util.debug(error2)
                util.debug(error2.stack);
                throw error2;
            }
        }
    },
    tryLoadFileName : function(name) {
        try {
            return ls().filter( f => f.indexOf(name) != -1 )[0];
        } catch(error) {
            util.debug("Unable to find file named '"+name+"in " + pwd());
            throw error;
        }
    },
    loadFile : function(knownFilename) {

        try {
           return cat(knownFilename);
        } catch(error) {
            util.debug("util.loadFile: can't cat '" + knownFilename + "'");
            throw error;
        }
    },

    loadFileLines : function(knownFilename) {
        try {
           return cat(knownFilename).split("\n");
        } catch(error) {
            util.debug("util.loadFileByLine: can't cat or split '" + knownFilename + "'");
            throw error;
        }
    }
};

const legacyGetMongoDataParser = {

    dumpIndexes : function(data) {
        const i = __parseIndexes(data);
        printjsononeline(i);
    },

    getJsonIndexInfo : function(data) {
        return legacyGetMongoDataParser.__convertToJson(data);
    },

    __convertToJson : function(data) {
        const i =legacyGetMongoDataParser.__parseIndexes(data);
        return i.map( function(i) {  return { "subsection" : "indexes", "output" : i }; } );
    },
    __parseIndexes : function(data) {

        const START_TOKEN = "** Indexes:";
        const STOP_TOKENS = "** Collection stats (MB): ** Sample document:";
        let write = false;
        let indexes = [];
        let istring = "";
        data.filter(line => line.length>0).forEach( line => {
            if (STOP_TOKENS.indexOf(line)!=-1) {
                write = false;
                util.debug('istring='+istring+ ' istring.length='+istring.length);
                util.debug('line='+line);
                if ( istring.length>0 ) {
                    istring = istring.replace(/\t/g," ")
                    try {
                        indexes.push( JSON.parse(istring) );
                    } catch(error) {
                        // could be due to extended JSON
                        // e.g. NumberDecimal("2")
                        util.debug(error);
                        indexes.push( eval(istring) );
                    }
                    util.debug(JSON.stringify(indexes));
                }
                istring = "";
            }
            if (write) {
                istring += line;
            }
            if (line === START_TOKEN) {
                write = true;
            }
        });
        return indexes;
    }

}

const indexAnalyzer = {

     getRedundant : function(getMongoDataLinesArray) {
        const data = getMongoDataLinesArray;
        const nsPrefixToSkip = [ 'local', 'admin', 'config' ];
        const indexInfo = data.filter(s=>s.subsection=="indexes")
                            .map(s=>s.output)
                            .filter(s=> (s.length>0))
                            .filter(s=> ( nsPrefixToSkip.indexOf(s[0].ns.split('.')[0]))==-1 );

        let redundantCount = 0;
        const redundantIndexes = {};
        indexInfo.forEach( i => {
            const ns = i[0].ns;
            util.debug("Working on indexes for " + ns);
            redundantIndexes[ ns ] = [];

            i.forEach( j => {
                const theseKeys = JSON.stringify(Object.keys( j.key )).slice(1,-1);
                i.forEach( k => {
                    if ( j === k ) {
                        return;
                    }
                    const thoseKeys = JSON.stringify(Object.keys( k.key )).slice(1,-1);
                    if (theseKeys.indexOf( thoseKeys ) === 0) {
                        redundantCount ++;
                        redundantIndexes[ ns ].push( [ k, j ] );
                        util.debug("Detected possible redundant index: \n"
                               + JSON.stringify(k) + "\n"
                               + JSON.stringify(j)) + "\n";
                    }
                });

            });
        });
        redundantIndexes["__count"] = redundantCount;
        return redundantIndexes;
     }


}

/*
 * Expects data = {}, each key is a namespace, each value an array
 * each array contains an array with 2 items, for the redundant indexes
 *
 */
const formatter = {
    toList : function(data) {
        let nsCount = 1;
        Object.keys(data).forEach( function(ns) {
            if ( ns === "__count" ) return
            let first = true;
            data[ns].forEach( function(i) {
                if ( first ) {
                    print(ns + ":");
                    first = false;
                }
                print("\t " + JSON.stringify(i[0]) + ",\t  " + JSON.stringify(i[1]));
            });
        });
    }
}

const main = {

    main : function() {

        try {
            util.setDebug(false);
            const data = util.loadGetMongoData();
            const result = indexAnalyzer.getRedundant(data);
            util.debug(result);
            formatter.toList(result);
        } catch(error) {
            printjson(error);

        }
    }
};

main.main();
