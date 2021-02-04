
import { basename, extname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import * as vscode from 'vscode';
import { GrokAutoCompleteProvider } from './grok-provider';
import { GrokPattern } from './regex-pattern';
import { GrokFileParser } from './grok-file-parser';
import { pipeline } from 'stream';

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
    const command_export = () => {
        if (!activeEditor) {
            return;
        }
        const txt = activeEditor.document.getText()
        const grok_text = txt.substring(0, txt.indexOf("\n"));

        vscode.window.showQuickPick(["Export with extra slashes", "To camelCase", "To snake_case", "To worm.case", "To kebab-case"], { canPickMany: true, matchOnDetail: true, matchOnDescription: true }).then((pickedExport) => {
            if (!pickedExport) {
                return
            }
            let selectedExport = ""
            let showPattern = GrokPattern.exportAsRegex(grok_text);
            if (pickedExport.includes("To camelCase")) {
                showPattern = GrokPattern.toCamelCase(showPattern);
                selectedExport = "CamelCase"
            } else if (pickedExport.includes("To snake_case")) {
                showPattern = GrokPattern.toSnakeCase(showPattern);
                selectedExport = "snake_case"
            } else if (pickedExport.includes("To worm.case")) {
                showPattern = GrokPattern.toWormCase(showPattern);
                selectedExport = "worm.case"
            } else if (pickedExport.includes("To kebab-case")) {
                showPattern = GrokPattern.toKebabCase(showPattern);
                selectedExport = "kebab-case"
            }
            if (pickedExport.includes("Export with extra slashes")) {
                vscode.workspace.openTextDocument({
                    language: 'grok',
                    content: GrokPattern.addExtraSlashes(showPattern)
                }).then(doc => {
                    vscode.window.showTextDocument(doc)
                })
            } else {
                vscode.workspace.openTextDocument({
                    language: 'grok',
                    content: showPattern
                }).then(doc => {
                    vscode.window.showTextDocument(doc)
                })
            }
        })
    }
    const parse_file = () => {
        if (!activeEditor) {
            return;
        }
        const txt = activeEditor.document.getText()
        const grok_text = txt.substring(0, txt.indexOf("\n"));
        vscode.window.showOpenDialog({ canSelectFiles: true, filters: { 'LogFiles': ['log', 'json', 'jsonl'] }, canSelectMany: true, openLabel: "Select files to parse with GROK" }).then((urList) => {
            if (!urList) {
                return
            }
            let regexPattern = GrokPattern.exportAsRegex(grok_text);
            for (let i = 0; i < urList.length; i++) {
                let basefile = basename(urList[i].path)

                //Read LOG file
                let readFile = createReadStream(urList[i].path, { encoding: 'utf8', autoClose: true });
                let errorFile = createWriteStream(basefile + ".err.log", { encoding: 'utf8', autoClose: true });
                let outputFile = createWriteStream(basefile + ".out.json", { encoding: 'utf8', autoClose: true });
                let fileParser = new GrokFileParser(regexPattern, errorFile);
                readFile.pipe(fileParser).pipe(outputFile).on('finish', function () {  // finished
                    console.log('done compressing');
                });
                //Create File MATCH output
                /*pipeline(
                    readFile,
                    fileParser,
                    outputFile,
                    (err) => {
                      if (err) {
                        console.error('Pipeline failed', err);
                      } else {
                        console.log('Pipeline succeeded');
                      }
                    }
                  );//*/
            };
        });
    };

    context.subscriptions.push(vscode.commands.registerCommand("grok:export", command_export));
    context.subscriptions.push(vscode.commands.registerCommand("grok:parse_file", parse_file));
    function updateDecorations() {
        if (!activeEditor || activeEditor.document.languageId != "grok") {
            return;
        }
        const text = activeEditor.document.getText();
        const lines = text.split("\n");
        let sumSize = 0;
        if (lines.length > 1 /*&& lines[0].match("%{[A-Za-z0-9_\\.]+:[A-Za-z0-9_\\.]+(?::[A-Za-z0-9_\\.]+)?}")*/) {
            sumSize += lines[0].length + "\n".length
            try {
                const pattern = new GrokPattern(lines[0]);
                let arry: any[] = [[], [], [], [], []];
                let err_arry = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].startsWith("//% ")) {
                        //Comment inside GROK
                        sumSize += lines[i].length + "\n".length
                        continue
                    }
                    try {
                        let matched = pattern.parseSync(lines[i]);
                        if (!!matched) {
                            for (let field of Object.keys(matched)) {
                                const startPos = activeEditor.document.positionAt(sumSize + matched[field].index);
                                const endPos = activeEditor.document.positionAt(sumSize + matched[field].index + matched[field].value.length);
                                arry[matched[field].order % 5].push({ range: new vscode.Range(startPos, endPos), hoverMessage: field + "=" + matched[field].value });
                            }
                        } else {
                            const startPos = activeEditor.document.positionAt(sumSize);
                            const endPos = activeEditor.document.positionAt(sumSize + lines[i].length);
                            err_arry.push({ range: new vscode.Range(startPos, endPos), hoverMessage: "Cannot match pattern: " + pattern.expression })


                        }
                    } catch (err_match) { }
                    sumSize += lines[i].length + "\n".length
                }
                activeEditor.setDecorations(grokColorDecorator1, arry[0]);
                activeEditor.setDecorations(grokColorDecorator2, arry[1]);
                activeEditor.setDecorations(grokColorDecorator3, arry[2]);
                activeEditor.setDecorations(grokColorDecorator4, arry[3]);
                activeEditor.setDecorations(grokColorDecorator5, arry[4]);
                activeEditor.setDecorations(grokColorDecoratorError, err_arry);
            } catch (err_pattern) {
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
    cursor: 'crosshair',
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
    cursor: 'crosshair',
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
    cursor: 'crosshair',
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
    cursor: 'crosshair',
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
    cursor: 'crosshair',
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