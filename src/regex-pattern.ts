

export class GrokPattern {
    expression: string;
    private pattern: string;
    fields: any;
    fields_order : string[];
    constructor(expression: string) {
        const subPatternsRegex = /%\{([A-Z0-9_]+)(?::([A-Za-z0-9_]+))?\}/g; // %{subPattern} or %{subPattern:fieldName}
        this.expression = expression;
        this.pattern = this.expression
        this.fields = {}
        let pattern_reg;
        while ((pattern_reg = subPatternsRegex.exec(this.pattern)) !== null) {
            if (pattern_reg.length === 3 && !!pattern_reg[2] ) {
                if(!!this.fields[pattern_reg[2]]){
                    let nm = getLastNumberId(this.fields,pattern_reg[2]) + 1
                    this.fields[pattern_reg[2] + '_GROK_' + nm] = pattern_reg[1]
                    this.pattern = this.pattern.substring(0, pattern_reg.index) + "(?<" + pattern_reg[2] + '_GROK_' + nm + ">" + getGrokPattern(pattern_reg[1]) + ")" + this.pattern.substring(subPatternsRegex.lastIndex)
                }else{
                    this.fields[pattern_reg[2]] = pattern_reg[1]
                    //Convert to named capture group
                    this.pattern = this.pattern.substring(0, pattern_reg.index) + "(?<" + pattern_reg[2] + ">" + getGrokPattern(pattern_reg[1]) + ")" + this.pattern.substring(subPatternsRegex.lastIndex)
                }
            } else {
                this.pattern = this.pattern.substring(0, pattern_reg.index) + getGrokPattern(pattern_reg[1]) + this.pattern.substring(subPatternsRegex.lastIndex)
            }
            subPatternsRegex.lastIndex = 0
        }
        this.fields = {}
        this.fields_order = []
        this.fields_order = nested_patterns(this.pattern, [])
        //Used to throw errors if it cannot compile
        let regexp = new RegExp(this.pattern)
        
    }
    static toCamelCase(expression: string) : string{
        let pattern = expression
        let group_names = nested_patterns(pattern,[]);
        for(let i = 0; i < group_names.length; i++){
            pattern = pattern.replace("<"+group_names[i]+">", "<" + toCamelCase(tokenizeField(group_names[i]))+">" )
        }
        return pattern
    }

    static toKebabCase(expression: string) : string{
        let pattern = expression
        let group_names = nested_patterns(pattern,[]);
        for(let i = 0; i < group_names.length; i++){
            pattern = pattern.replace("<"+group_names[i]+">", "<" + toKebabCase(tokenizeField(group_names[i]))+">" )
        }
        return pattern
    }
    static toWormCase(expression: string) : string{
        let pattern = expression
        let group_names = nested_patterns(pattern,[]);
        for(let i = 0; i < group_names.length; i++){
            pattern = pattern.replace("<"+group_names[i]+">", "<" + toWormCase(tokenizeField(group_names[i]))+">" )
        }
        return pattern
    }

    static exportAsRegex(expression: string) : string{
        const subPatternsRegex = /%\{([A-Z0-9_]+)(?::([A-Za-z0-9_]+))?\}/g; // %{subPattern} or %{subPattern:fieldName}
        let pattern = expression
        let fields : any = {}
        let pattern_reg;
        while ((pattern_reg = subPatternsRegex.exec(pattern)) !== null) {
            if (pattern_reg.length === 3 && !!pattern_reg[2] ) {
                if(!!fields[pattern_reg[2]]){
                    let nm = getLastNumberId_clean(fields,pattern_reg[2]) + 1
                    fields[pattern_reg[2] +"_" + nm] = pattern_reg[1]
                    pattern = pattern.substring(0, pattern_reg.index) + "(?<" + pattern_reg[2] + '_' + nm + ">" + getGrokPattern(pattern_reg[1]) + ")" + pattern.substring(subPatternsRegex.lastIndex)
                }else{
                    fields[pattern_reg[2]] = pattern_reg[1]
                    //Convert to named capture group
                    pattern = pattern.substring(0, pattern_reg.index) + "(?<" + pattern_reg[2] + ">" + getGrokPattern(pattern_reg[1]) + ")" + pattern.substring(subPatternsRegex.lastIndex)
                }
            } else {
                pattern = pattern.substring(0, pattern_reg.index) + getGrokPattern(pattern_reg[1]) + pattern.substring(subPatternsRegex.lastIndex)
            }
            subPatternsRegex.lastIndex = 0
        }
        return pattern
    }
    static toSnakeCase(expression: string) : string{
        let pattern = expression
        let group_names = nested_patterns(pattern,[]);
        for(let i = 0; i < group_names.length; i++){
            pattern = pattern.replace("<"+group_names[i]+">", "<" + toSnakeCase(tokenizeField(group_names[i]))+">" )
        }
        return pattern
    }
    static addExtraSlashes(expression: string) : string{
        return expression.replace(/\\/,"\\\\")
    }

    parseSync(logLine: string): any {
        let regexp = new RegExp(this.pattern)
        let match =  regexp.exec(logLine)
        let toReturn: any = {}
        let searchPosition = regexp.lastIndex;
        if (match) {
            //TODO: optimize
            const groups = match.groups;
            if(!!groups){
                let order = 0
                for(let i = 0; i < this.fields_order.length; i++){
                    let key = this.fields_order[i]
                    if (!!groups[key]) {
                        if(!!groups[key]){
                            toReturn[key] = {
                                value : groups[key],
                                index : logLine.indexOf(groups[key],searchPosition),
                                order : order
                            }
                            if(toReturn[(key)].index === -1){
                                toReturn[(key)].index = logLine.indexOf(groups[key],0)
                            }
                        }
                        searchPosition = toReturn[(key)].index + groups[(key)].length
                        
                    }
                    order++
                }
                
                for(let i = 0; i < this.fields_order.length; i++){
                    let key = this.fields_order[i]
                    if (!!groups[key]) {
                        try{
                            let nearest_pos = nearer_capture_group_pos(toReturn[key].index,key,toReturn)
                            let new_i = logLine.substring(toReturn[key].index, nearest_pos ).lastIndexOf(groups[key]) + toReturn[key].index
                            toReturn[key].index = new_i
                            
                        }catch(err){}
                    }
                }
                let toReturn_filtered : any= {}
                for(let key of Object.keys(toReturn)){
                    let f_key = removeGrokFieldName(key)
                    toReturn_filtered[f_key] = {
                        value : toReturn[key].value,
                        index : toReturn[key].index,
                        order : toReturn[key].order//Color position in array
                    }
                }
                return toReturn_filtered;
            }
            
        }
        return null;
    }
}

function nearer_capture_group_pos(pos : number, me : string, groups : any){
    let nearer = 10000000
    for(let key of Object.keys(groups)){
        if(key != me){
            if(groups[key].index > pos && groups[key].index < nearer){
                nearer = groups[key].index
            }
        }
    }
    return nearer

}

function removeGrokFieldName(field_name : string){
    return field_name.split('_GROK_')[0]
}

function getLastNumberId(fields : any, field_name : string){
    let keys = Object.keys(fields)
    let number = -1;
    for(let key in keys){
        if(key.includes(field_name)){
            let split = field_name.split('_GROK_');
            if(split.length === 2){
                let nm = Number(split[1])
                if(!!nm && nm > number){
                    number = nm
                }
            }
            
        }
    }
    return number
}
function getLastNumberId_clean(fields : any, field_name : string){
    let keys = Object.keys(fields)
    let number = -1;
    for(let key in keys){
        let key_splited = key.split("_")
        if(key.includes(field_name)){
            let split = field_name.split('_');
            if(split.length > key_splited.length){
                let nm = Number(split[split.length - 1])
                if(!!nm && nm > number){
                    number = nm
                }
            }
            
        }
    }
    return number
}
function nested_patterns(pattern: string, fields_order: string[] = []) {
    const nestedFieldNamesRegex = /(?:\?<([A-Za-z0-9_]+)>)/g;
    let myArray;
    while ((myArray = nestedFieldNamesRegex.exec(pattern)) !== null) {
        let pos = 0;
        let regex_string;
        for (let i = myArray.index; i < pattern.length; i++) {
            try {
                if (pattern[i] === '(') {
                    if (((i - 1) >= 0) && pattern[i - 1] != '\\') {
                        pos++
                    }
                } else if (pattern[i] === ')') {
                    if (((i - 1) >= 0) && pattern[i - 1] != '\\') {
                        pos--
                    }
                }
                if (pos === -1) {
                    regex_string = pattern.substring(nestedFieldNamesRegex.lastIndex, i);
                    break;
                }
            } catch (err) {
                console.log(err)
            }
        }
        if (regex_string) {
            fields_order.push(myArray[1])
            fields_order = nested_patterns(regex_string, fields_order)
        }
    }
    return fields_order
}

function getGrokPattern(grok_name: string): string {
    return GROK_EXPLANATION[GROK_PATTERNS.indexOf(grok_name)];
}


function tokenizeField(texto : string){
    let mytexto = texto.split("_")
    if(mytexto.length > 1){
        return mytexto
    }
    mytexto = texto.split("\\.")
    if(mytexto.length > 1){
        return mytexto
    }
    mytexto = texto.split("\\-")
    if(mytexto.length > 1){
        return mytexto
    }
    let splited_text = []
    let lastPos = 0;
    for (let i = 0; i < texto.length; i++){
        if(texto.charCodeAt(i) >= "A".charCodeAt(0) && texto.charCodeAt(i) <= "Z".charCodeAt(0)){
            splited_text.push(texto.substring(lastPos,i).toLowerCase())
            lastPos = i;
        }
    }
    splited_text.push(texto.substring(lastPos).toLowerCase())
    return splited_text.filter((val)=>{
        return val != ""
    })
}
function toCamelCase(texto : string[]){
    let mytexto = texto
    let returned = ""
    if(mytexto.length == 1){
        return texto.join("")
    }
    returned += mytexto[0].toLowerCase()
    for(let i = 1; i < mytexto.length; i++){
        returned += mytexto[i].substring(0,1).toUpperCase() + mytexto[i].substring(1).toLowerCase()
    }
    return returned
}
function toWormCase(texto : string[]){
    let mytexto = texto
    let returned = ""
    if(mytexto.length == 1){
        return texto.join("")
    }
    return texto.map((val)=>val.toLowerCase()).join(".")
}

function toSnakeCase(texto : string[]){
    let splited_text = texto
    return splited_text.join("_")
}
function toKebabCase(texto : string[]){
    let splited_text = texto
    return splited_text.join("-")
}

const GROK_PATTERNS = [
    "USERNAME",
    "USER",
    "INT",
    "BASE10NUM",
    "NUMBER",
    "BASE16NUM",
    "BASE16FLOAT",
    "POSINT",
    "NONNEGINT",
    "WORD",
    "NOTSPACE",
    "SPACE",
    "DATA",
    "GREEDYDATA",
    "QUOTEDSTRING",
    "UUID",
    "MAC",
    "CISCOMAC",
    "WINDOWSMAC",
    "COMMONMAC",
    "IPV6",
    "IPV4",
    "IP",
    "HOSTNAME",
    "HOST",
    "IPORHOST",
    "HOSTPORT",
    "PATH",
    "UNIXPATH",
    "TTY",
    "WINPATH",
    "URIPROTO",
    "URIHOST",
    "URIPATH",
    "URIPARAM",
    "URIPARAM",
    "URIPATHPARAM",
    "URI",
    "MONTH",
    "MONTHNUM",
    "MONTHNUM2",
    "MONTHDAY",
    "DAY",
    "YEAR",
    "HOUR",
    "MINUTE",
    "SECOND",
    "TIME",
    "DATE_US",
    "DATE_EU",
    "ISO8601_TIMEZONE",
    "ISO8601_SECOND",
    "TIMESTAMP_ISO8601",
    "DATE",
    "DATESTAMP",
    "TZ",
    "DATESTAMP_RFC822",
    "DATESTAMP_RFC2822",
    "DATESTAMP_OTHER",
    "DATESTAMP_EVENTLOG",
    "SYSLOGTIMESTAMP",
    "PROG",
    "SYSLOGPROG",
    "SYSLOGHOST",
    "SYSLOGFACILITY",
    "HTTPDATE",
    "QS",
    "SYSLOGBASE",
    "COMMONAPACHELOG",
    "COMBINEDAPACHELOG",
    "LOGLEVEL"
]

const GROK_EXPLANATION = [
    "[a-zA-Z0-9._-]+",
    "%{USERNAME}",
    "(?:[+-]?(?:[0-9]+))",
    "(?<![0-9.+-])(?:[+-]?(?:(?:[0-9]+(?:\\.[0-9]+)?)|(?:\\.[0-9]+)))",
    "(?:%{BASE10NUM})",
    "(?<![0-9A-Fa-f])(?:[+-]?(?:0x)?(?:[0-9A-Fa-f]+))",
    "\\b(?<![0-9A-Fa-f.])(?:[+-]?(?:0x)?(?:(?:[0-9A-Fa-f]+(?:\\.[0-9A-Fa-f]*)?)|(?:\\.[0-9A-Fa-f]+)))\\b",
    "\\b(?:[1-9][0-9]*)\\b",
    "\\b(?:[0-9]+)\\b",
    "\\b\\w+\\b",
    "\\S+",
    "\\s*",
    ".*?",
    ".*",
    "(?:(?<!\\\\)(?:\"(?:\\\\.|[^\\\\\"]+)+\"|\"\"|(?:'(?:\\\\.|[^\\\\']+)+')|''|(?:`(?:\\\\.|[^\\\\`]+)+`)|``))",
    "[A-Fa-f0-9]{8}-(?:[A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}",
    "(?:%{CISCOMAC}|%{WINDOWSMAC}|%{COMMONMAC})",
    "(?:(?:[A-Fa-f0-9]{4}\\.){2}[A-Fa-f0-9]{4})",
    "(?:(?:[A-Fa-f0-9]{2}-){5}[A-Fa-f0-9]{2})",
    "(?:(?:[A-Fa-f0-9]{2}:){5}[A-Fa-f0-9]{2})",
    "((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))(%.+)?",
    "(?<![0-9])(?:(?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})[.](?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})[.](?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2})[.](?:25[0-5]|2[0-4][0-9]|[0-1]?[0-9]{1,2}))(?![0-9])",
    "(?:%{IPV6}|%{IPV4})",
    "\\b(?:[0-9A-Za-z][0-9A-Za-z-]{0,62})(?:\\.(?:[0-9A-Za-z][0-9A-Za-z-]{0,62}))*(\\.?|\\b)",
    "%{HOSTNAME}",
    "(?:%{HOSTNAME}|%{IP})",
    "%{IPORHOST}:%{POSINT}",
    "(?:%{UNIXPATH}|%{WINPATH})",
    "(?:/(?:[\\w_%!$@:.,-]+|\\\\.)*)+",
    "(?:/dev/(pts|tty([pq])?)(\\w+)?/?(?:[0-9]+))",
    "(?:[A-Za-z]+:|\\\\)(?:\\\\[^\\\\?*]*)+",
    "[A-Za-z]+(\\+[A-Za-z+]+)?",
    "%{IPORHOST}(?::%{POSINT:port})?",
    "(?:/[A-Za-z0-9$.+!*'(){},~:;=@#%_\\-]*)+",
    "\\?(?:[A-Za-z0-9]+(?:=(?:[^&]*))?(?:&(?:[A-Za-z0-9]+(?:=(?:[^&]*))?)?)*)?",
    "\\?[A-Za-z0-9$.+!*'|(){},~@#%&/=:;_?\\-\\[\\]]*",
    "%{URIPATH}(?:%{URIPARAM})?",
    "%{URIPROTO}://(?:%{USER}(?::[^@]*)?@)?(?:%{URIHOST})?(?:%{URIPATHPARAM})?",
    "\\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\b",
    "(?:0?[1-9]|1[0-2])",
    "(?:0[1-9]|1[0-2])",
    "(?:(?:0[1-9])|(?:[12][0-9])|(?:3[01])|[1-9])",
    "(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)",
    "(?:\\d\\d){1,2}",
    "(?:2[0123]|[01]?[0-9])",
    "(?:[0-5][0-9])",
    "(?:(?:[0-5]?[0-9]|60)(?:[:.,][0-9]+)?)",
    "(?!<[0-9])%{HOUR}:%{MINUTE}(?::%{SECOND})(?![0-9])",
    "%{MONTHNUM}[/-]%{MONTHDAY}[/-]%{YEAR}",
    "%{MONTHDAY}[./-]%{MONTHNUM}[./-]%{YEAR}",
    "(?:Z|[+-]%{HOUR}(?::?%{MINUTE}))",
    "(?:%{SECOND}|60)",
    "%{YEAR}-%{MONTHNUM}-%{MONTHDAY}[T ]%{HOUR}:?%{MINUTE}(?::?%{SECOND})?%{ISO8601_TIMEZONE}?",
    "%{DATE_US}|%{DATE_EU}",
    "%{DATE}[- ]%{TIME}",
    "(?:[PMCE][SD]T|UTC)",
    "%{DAY} %{MONTH} %{MONTHDAY} %{YEAR} %{TIME} %{TZ}",
    "%{DAY}, %{MONTHDAY} %{MONTH} %{YEAR} %{TIME} %{ISO8601_TIMEZONE}",
    "%{DAY} %{MONTH} %{MONTHDAY} %{TIME} %{TZ} %{YEAR}",
    "%{YEAR}%{MONTHNUM2}%{MONTHDAY}%{HOUR}%{MINUTE}%{SECOND}",
    "%{MONTH} +%{MONTHDAY} %{TIME}",
    "(?:[\\w._/%-]+)",
    "%{PROG:program}(?:\\[%{POSINT:pid}\\])?",
    "%{IPORHOST}",
    "<%{NONNEGINT:facility}.%{NONNEGINT:priority}>",
    "%{MONTHDAY}/%{MONTH}/%{YEAR}:%{TIME} %{INT}",
    "%{QUOTEDSTRING}",
    "%{SYSLOGTIMESTAMP:timestamp} (?:%{SYSLOGFACILITY} )?%{SYSLOGHOST:logsource} %{SYSLOGPROG}:",
    "%{IPORHOST:clientip} %{USER:ident} %{USER:auth} \\[%{HTTPDATE:timestamp}\\] \"(?:%{WORD:verb} %{NOTSPACE:request}(?: HTTP/%{NUMBER:httpversion})?|%{DATA:rawrequest})\" %{NUMBER:response} (?:%{NUMBER:bytes}|-)",
    "%{COMMONAPACHELOG} %{QS:referrer} %{QS:agent}",
    "([Aa]lert|ALERT|[Tt]race|TRACE|[Dd]ebug|DEBUG|[Nn]otice|NOTICE|[Ii]nfo|INFO|[Ww]arn?(?:ing)?|WARN?(?:ING)?|[Ee]rr?(?:or)?|ERR?(?:OR)?|[Cc]rit?(?:ical)?|CRIT?(?:ICAL)?|[Ff]atal|FATAL|[Ss]evere|SEVERE|EMERG(?:ENCY)?|[Ee]merg(?:ency)?)"
]
