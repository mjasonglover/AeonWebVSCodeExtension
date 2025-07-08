import * as vscode from 'vscode';
import { getAllTagNames } from './language/tagDefinitions';
import { AeonDiagnosticProvider } from './providers/diagnosticProvider';
import { PreviewManager } from './preview/previewManager';
import { FormDesigner } from './formBuilder/formDesigner';
import { ComponentRegistry } from './componentLibrary/componentRegistry';
import { StorageService } from './services/storageService';
import { MigrationWorkspace } from './migration/migrationWorkspace';

export function registerCommands(context: vscode.ExtensionContext) {
    const previewManager = PreviewManager.getInstance(context, context.extensionUri);
    const formDesigner = FormDesigner.getInstance(context);
    const componentRegistry = ComponentRegistry.getInstance(context);
    const storageService = StorageService.getInstance(context);
    
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
    
    // Stage 4: Visual Form Builder Commands
    
    // Open Form Builder Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.openFormBuilder', () => {
            formDesigner.openFormBuilder();
        })
    );
    
    // List Forms Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.listForms', () => {
            formDesigner.showFormList();
        })
    );
    
    // Import Form Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.importForm', () => {
            formDesigner.importForm();
        })
    );
    
    // Stage 4: Component Library Commands
    
    // Open Component Library Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.openComponentLibrary', async () => {
            const components = await componentRegistry.getAvailableComponents();
            const items = components.map(c => ({
                label: c.name,
                description: `v${c.version} - ${c.category}`,
                detail: c.description,
                component: c
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a component to view details'
            });
            
            if (selected) {
                const action = await vscode.window.showQuickPick(
                    ['Install', 'View Details', 'Cancel'],
                    { placeHolder: `${selected.component.name} - Select action` }
                );
                
                if (action === 'Install') {
                    try {
                        await componentRegistry.installComponent(selected.component.id);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to install component: ${error instanceof Error ? error.message : String(error)}`);
                    }
                } else if (action === 'View Details') {
                    // Show component details in a webview or document
                    const doc = await vscode.workspace.openTextDocument({
                        content: JSON.stringify(selected.component, null, 2),
                        language: 'json'
                    });
                    vscode.window.showTextDocument(doc);
                }
            }
        })
    );
    
    // List Installed Components Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.listInstalledComponents', async () => {
            const installed = await storageService.getInstalledComponents();
            
            if (installed.length === 0) {
                vscode.window.showInformationMessage('No components installed yet');
                return;
            }
            
            const items = installed.map(c => ({
                label: c.manifest.name,
                description: `v${c.manifest.version} - Installed ${new Date(c.installDate).toLocaleDateString()}`,
                detail: c.manifest.description,
                component: c
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an installed component'
            });
            
            if (selected) {
                const action = await vscode.window.showQuickPick(
                    ['Update', 'Uninstall', 'Configure', 'Cancel'],
                    { placeHolder: `${selected.component.manifest.name} - Select action` }
                );
                
                if (action === 'Update') {
                    try {
                        await componentRegistry.updateComponent(selected.component.manifest.id);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to update component: ${error instanceof Error ? error.message : String(error)}`);
                    }
                } else if (action === 'Uninstall') {
                    try {
                        await componentRegistry.uninstallComponent(selected.component.manifest.id);
                    } catch (error) {
                        vscode.window.showErrorMessage(`Failed to uninstall component: ${error instanceof Error ? error.message : String(error)}`);
                    }
                }
            }
        })
    );
    
    // Stage 4: Template Commands
    
    // Create from Template Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.createFromTemplate', async () => {
            const templates = await storageService.listTemplates();
            
            if (templates.length === 0) {
                vscode.window.showInformationMessage('No templates available. Create one from the Form Builder.');
                return;
            }
            
            const items = templates.map(t => ({
                label: t.name,
                description: t.type,
                detail: t.description,
                template: t
            }));
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a template to use'
            });
            
            if (selected) {
                // In a full implementation, this would open a wizard to configure the template
                vscode.window.showInformationMessage(`Creating from template: ${selected.template.name}`);
            }
        })
    );
    
    // Migration Commands
    
    // Start Migration Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.startMigration', async () => {
            const migrationWorkspace = MigrationWorkspace.getInstance(context);
            await migrationWorkspace.showRecentProjects();
        })
    );
    
    // New Migration Project Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.newMigrationProject', () => {
            const migrationWorkspace = MigrationWorkspace.getInstance(context);
            migrationWorkspace.startNewProject();
        })
    );
    
    // Open Migration Project Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.openMigrationProject', () => {
            const migrationWorkspace = MigrationWorkspace.getInstance(context);
            migrationWorkspace.openProject();
        })
    );
    
    // Import Migration Project Command
    context.subscriptions.push(
        vscode.commands.registerCommand('aeon.importMigrationProject', () => {
            const migrationWorkspace = MigrationWorkspace.getInstance(context);
            migrationWorkspace.importProject();
        })
    );
}