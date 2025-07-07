import * as vscode from 'vscode';
import { getAllTagNames } from './language/tagDefinitions';
import { AeonDiagnosticProvider } from './providers/diagnosticProvider';
import { PreviewManager } from './preview/previewManager';

export function registerCommands(context: vscode.ExtensionContext) {
    const previewManager = PreviewManager.getInstance(context, context.extensionUri);
    
    // Validate Document Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.validateDocument', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor');
                return;
            }
            
            const diagnosticProvider = new AeonDiagnosticProvider();
            diagnosticProvider.updateDiagnostics(editor.document);
            
            vscode.window.showInformationMessage('Aeon validation complete');
        })
    );
    
    // Insert Tag Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.insertTag', async () => {
            const tagNames = getAllTagNames();
            const selected = await vscode.window.showQuickPick(tagNames, {
                placeHolder: 'Select an Aeon tag to insert'
            });
            
            if (!selected) {
                return;
            }
            
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            
            const snippet = `<#${selected}>`;
            editor.insertSnippet(new vscode.SnippetString(snippet));
        })
    );
    
    // Go to Include Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.goToInclude', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            
            const position = editor.selection.active;
            const lineText = editor.document.lineAt(position).text;
            const includeMatch = lineText.match(/<#INCLUDE\s+filename=["']([^"']+)["']/i);
            
            if (includeMatch) {
                // Trigger go to definition
                vscode.commands.executeCommand('editor.action.revealDefinition');
            } else {
                vscode.window.showInformationMessage('Place cursor on an INCLUDE tag to navigate to the file');
            }
        })
    );
    
    // Show Preview Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.showPreview', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('No active editor');
                return;
            }
            
            previewManager.showPreview(editor.document);
        })
    );
    
    // Refresh Preview Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.refreshPreview', () => {
            previewManager.refreshPreview();
        })
    );
    
    // Change Preview Device Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.changePreviewDevice', () => {
            previewManager.changePreviewDevice();
        })
    );
    
    // Toggle Tag Visualization Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.toggleTagVisualization', () => {
            previewManager.toggleTagVisualization();
        })
    );
    
    // Edit Mock Data Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.editMockData', () => {
            previewManager.editMockData();
        })
    );
    
    // Change Mock Data Profile Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.changeMockDataProfile', () => {
            previewManager.changeMockDataProfile();
        })
    );
}