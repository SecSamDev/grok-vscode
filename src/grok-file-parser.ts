import { Func } from 'mocha';
import { Transform, Writable } from 'stream'


export class GrokFileParser extends Transform {
    pattern : RegExp;
    err : Writable;
    toProcess : string;

    constructor(pattern : string, err : Writable) {
        super();
        this.pattern = new RegExp(pattern);
        this.err = err;
        this.toProcess = "";
    }
    _final(){
        if(this.toProcess.length > 0){
            this.err.write(this.toProcess,()=>{});
            this.toProcess = ""
        }
        this.err.end();
    }

    _transform(...args : any) {
        let chunk = args[0]
        let encoding = args[1]
        let cb = args.length == 3 ? args[2] : null
        if(typeof encoding == 'function') {
            cb = encoding;
            encoding = 'utf8'
        }
        this.toProcess += chunk;
        let pos_whitespace = this.toProcess.indexOf("\n")
        if(pos_whitespace < 0) {
            return null
        }
        while(pos_whitespace >= 0) {
            let line = this.toProcess.substring(0, pos_whitespace);
            this.toProcess = this.toProcess.substring(pos_whitespace + 1);
            let content = this.pattern.exec(line)
            if(content && content.groups) {
                let extracted = Object.assign({},content.groups);
                this.push(JSON.stringify(extracted) + "\n")
            }else{
                this.err.write(line,()=>{});
            }
            pos_whitespace = this.toProcess.indexOf("\n")
            
        }

        if(cb){
            cb(null);
        }
    }
    /*
    read(size? : number) {
        let pos_whitespace = this.toProcess.indexOf("\n")
        if(pos_whitespace < 0) {
            return null
        }
        let toReturn = ""
        while(pos_whitespace >= 0) {
            let line = this.toProcess.substring(0, pos_whitespace);
            this.toProcess = this.toProcess.substring(pos_whitespace + 1);
            let content = this.pattern.exec(line)
            if(content && content.groups) {
                let extracted = Object.assign({},content.groups);
                toReturn += JSON.stringify(extracted) + "\n"
            }else{
                this.err.write(line,()=>{});
            }
            pos_whitespace = this.toProcess.indexOf("\n")
            
        }
        return toReturn
    }
    */
    

}

