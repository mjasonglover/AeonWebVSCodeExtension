import * as vscode from 'vscode';
import { AeonCompletionProvider } from './providers/completionProvider';
import { AeonHoverProvider } from './providers/hoverProvider';
import { AeonDefinitionProvider } from './providers/definitionProvider';
import { AeonDiagnosticProvider } from './providers/diagnosticProvider';
import { registerCommands } from './commands';
import { PreviewManager } from './preview/previewManager';

let diagnosticProvider: AeonDiagnosticProvider;
let previewManager: PreviewManager;

export function activate(context: vscode.ExtensionContext) {
    console.log('Aeon VS Code extension is now active!');

    // Register language configuration
    const selector: vscode.DocumentSelector = [
        { scheme: 'file', language: 'html' },
        { scheme: 'file', language: 'aeon-html' }
    ];

    // Register completion provider
    const completionProvider = new AeonCompletionProvider();
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            selector,
            completionProvider,
            '<', '"', "'", ' '
        )
    );

    // Register hover provider
    const hoverProvider = new AeonHoverProvider();
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(selector, hoverProvider)
    );

    // Register definition provider
    const definitionProvider = new AeonDefinitionProvider();
    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(selector, definitionProvider)
    );

    // Initialize diagnostic provider
    diagnosticProvider = new AeonDiagnosticProvider();
    
    // Initialize preview manager
    previewManager = PreviewManager.getInstance(context, context.extensionUri);

    // Register document change handlers
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (isAeonDocument(event.document)) {
                diagnosticProvider.updateDiagnostics(event.document);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((document) => {
            if (isAeonDocument(document)) {
                diagnosticProvider.updateDiagnostics(document);
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            if (isAeonDocument(document)) {
                const config = vscode.workspace.getConfiguration('aeon');
                if (config.get('validateOnSave')) {
                    diagnosticProvider.updateDiagnostics(document);
                }
                if (config.get('preview.autoRefresh')) {
                    previewManager.updatePreview(document);
                }
            }
        })
    );

    // Validate all open documents
    vscode.workspace.textDocuments.forEach((document) => {
        if (isAeonDocument(document)) {
            diagnosticProvider.updateDiagnostics(document);
        }
    });

    // Register commands
    registerCommands(context);

    // Register configuration change handler
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('aeon')) {
                // Handle configuration changes
                console.log('Aeon configuration changed');
            }
        })
    );
}

export function deactivate() {
    if (diagnosticProvider) {
        diagnosticProvider.dispose();
    }
    if (previewManager) {
        previewManager.dispose();
    }
}

function isAeonDocument(document: vscode.TextDocument): boolean {
    // Check if document is HTML and contains Aeon tags
    if (document.languageId !== 'html' && document.languageId !== 'aeon-html') {
        return false;
    }
    
    // Quick check for Aeon tags
    const text = document.getText();
    return text.includes('<#') || text.includes('aeon.dll');
}