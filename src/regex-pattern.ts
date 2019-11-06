

export class GrokPattern {
    expression: string;
    private pattern: string;
    fields: any;
    constructor(expression: string) {
        const subPatternsRegex = /%\{([A-Z0-9_]+)(?::([A-Za-z0-9_]+))?\}/g; // %{subPattern} or %{subPattern:fieldName}
        this.expression = expression;
        this.pattern = this.expression
        this.fields = {}
        let myArray;
        while ((myArray = subPatternsRegex.exec(this.pattern)) !== null) {
            if (myArray.length === 3 && !!myArray[2] ) {
                this.fields[myArray[2]] = myArray[1]
                //Convert to named capture group
                this.pattern = this.pattern.substring(0, myArray.index) + "(?<" + myArray[2] + ">" + getGrokPattern(myArray[1]) + ")" + this.pattern.substring(subPatternsRegex.lastIndex)
            } else {
                this.pattern = this.pattern.substring(0, myArray.index) + getGrokPattern(myArray[1]) + this.pattern.substring(subPatternsRegex.lastIndex)
            }
            subPatternsRegex.lastIndex = 0
        }
        this.fields = nested_patterns(this.pattern, this.fields)
        //Used to throw errors if it cannot compile
        let regexp = new RegExp(this.pattern)
        
    }
    parseSync(logLine: string): any {
        let regexp = new RegExp(this.pattern)
        let match =  regexp.exec(logLine)
        let toReturn: any = {}
        let searchPosition = 0;
        if (match) {
            const groups = match.groups;
            for (let key of Object.keys(this.fields)) {
                if (groups && groups[key]) {
                    toReturn[key] = {
                        value : groups[key],
                        index : logLine.indexOf(groups[key],searchPosition)
                    }
                    searchPosition = toReturn[key].index + groups[key].length
                }
            }
            return toReturn;
        }
        return null;
    }
}

function nested_patterns(pattern: string, fields: any = {}) {
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
            if(!fields[myArray[1]]){
                fields[myArray[1]] = regex_string
            }
            fields = nested_patterns(regex_string, fields)
        }
    }
    return fields
}

function getGrokPattern(grok_name: string): string {
    return GROK_EXPLANATION[GROK_PATTERNS.indexOf(grok_name)];
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
