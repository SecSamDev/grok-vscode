import * as vscode from 'vscode';
import { GrokAutoCompleteProvider } from './grok-provider';
import { GrokPattern } from './regex-pattern'


export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({
            language: 'grok',
            scheme: 'file'
        }, new GrokAutoCompleteProvider(context), '%', '('));
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            {
                language: 'grok',
                scheme: 'file'
            }, new GrokAutoCompleteProvider(context)));

    //Decorators
    
    let timeout: NodeJS.Timer | undefined = undefined;
    let activeEditor = vscode.window.activeTextEditor;

    function updateDecorations() {
        if (!activeEditor) {
            return;
        }
        const text = activeEditor.document.getText();
        const lines = text.split("\n");
        let sumSize = 0;
        if(lines.length > 1 && lines[0].match("%{[A-Za-z0-9_]+:[A-Za-z0-9_]+}")){
            sumSize += lines[0].length + "\n".length
            try{
                const pattern = new GrokPattern(lines[0]);
                let arry : any[] = [[],[],[],[],[]];
                let err_arry = [];
                for(let i = 1; i < lines.length && i < 20; i++){
                    try{
                        let matched = pattern.parseSync(lines[i]);
                        if(!!matched){
                            let dec_i = 0;
                            for(let field of Object.keys(matched)){
                                const startPos = activeEditor.document.positionAt(sumSize + matched[field].index);
                                const endPos = activeEditor.document.positionAt(sumSize + matched[field].index + matched[field].value.length);
                                arry[dec_i].push({ range: new vscode.Range(startPos, endPos), hoverMessage:  field+"="+ matched[field].value });
                                dec_i = (dec_i + 1) % 5
                            }
                        }else{
                            const startPos = activeEditor.document.positionAt(sumSize);
                            const endPos = activeEditor.document.positionAt(sumSize + lines[i].length);
                            err_arry.push({ range: new vscode.Range(startPos, endPos), hoverMessage:  "Cannot match pattern: " + pattern.expression })
                            
                            
                        }
                    }catch(err_match){}
                    sumSize += lines[i].length + "\n".length
                }
                activeEditor.setDecorations(grokColorDecorator1,arry[0]);
                activeEditor.setDecorations(grokColorDecorator2,arry[1]);
                activeEditor.setDecorations(grokColorDecorator3,arry[2]);
                activeEditor.setDecorations(grokColorDecorator4,arry[3]);
                activeEditor.setDecorations(grokColorDecorator5,arry[4]);
                activeEditor.setDecorations(grokColorDecoratorError, err_arry );
            }catch(err_pattern){
                const startPos = activeEditor.document.positionAt(0);
                const endPos = activeEditor.document.positionAt(lines[0].length);
                activeEditor.setDecorations(grokColorDecoratorError, [{ range: new vscode.Range(startPos, endPos), hoverMessage: err_pattern + "" }]);
            }
        }
        
    }

    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = undefined;
        }
        timeout = setTimeout(updateDecorations, 500);
    }

    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

}
export function deactivate() { }

const grokColorsDecoratorList = []
const grokColorDecoratorError = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerColor: 'red',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        backgroundColor: '#FF000055'
    },
    dark: {
        // this color will be used in dark color themes
        backgroundColor: '#FF000055'
    }
});
const grokColorDecorator1 = vscode.window.createTextEditorDecorationType({
    cursor : 'crosshair',
    overviewRulerColor: 'red',
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    light: {
        // this color will be used in light color themes
        borderColor: '#00A0B0'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: '#00A0B0'
    }
});
const grokColorDecorator2 = vscode.window.createTextEditorDecorationType({
    cursor : 'crosshair',
    overviewRulerColor: 'red',
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    light: {
        // this color will be used in light color themes
        borderColor: '#6A4A3C'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: '#6A4A3C'
    }
});
grokColorsDecoratorList.push(grokColorDecorator2);
const grokColorDecorator3 = vscode.window.createTextEditorDecorationType({
    cursor : 'crosshair',
    overviewRulerColor: 'red',
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    light: {
        // this color will be used in light color themes
        borderColor: '#CC333F'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: '#CC333F'
    }
});
grokColorsDecoratorList.push(grokColorDecorator3);
const grokColorDecorator4 = vscode.window.createTextEditorDecorationType({
    cursor : 'crosshair',
    overviewRulerColor: 'red',
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    light: {
        // this color will be used in light color themes
        borderColor: '#EB6841'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: '#EB6841'
    }
});
grokColorsDecoratorList.push(grokColorDecorator4);
const grokColorDecorator5 = vscode.window.createTextEditorDecorationType({
    cursor : 'crosshair',
    overviewRulerColor: 'red',
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerLane: vscode.OverviewRulerLane.Center,
    light: {
        // this color will be used in light color themes
        borderColor: '#EDC951'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: '#EDC951'
    }
});
grokColorsDecoratorList.push(grokColorDecorator5);