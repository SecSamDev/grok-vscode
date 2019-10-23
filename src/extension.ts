import * as vscode from 'vscode';
import { GrokAutoCompleteProvider } from './grok-provider';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider({
            language: 'grok',
            scheme: 'file'
        }, new GrokAutoCompleteProvider(), '%', '('));
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            {
                language: 'grok',
                scheme: 'file'
            }, new GrokAutoCompleteProvider()));

}
export function deactivate() { }
