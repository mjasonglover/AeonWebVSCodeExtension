import * as vscode from 'vscode';
import * as path from 'path';
import { 
    MigrationProject, 
    PageAnalysis,
    MigrationSelection,
    BrandingGuide 
} from '../types/migration.types';
import { MigrationStorage } from '../migration/migrationStorage';
import { PageAnalyzer } from '../migration/pageAnalyzer';
import { DiffEngine } from '../migration/diffEngine';
import { BrandingProcessor } from '../migration/brandingProcessor';
import { TemplateLoader } from '../migration/templateLoader';
import { WorkspaceScanner } from '../migration/workspaceScanner';

export class MigrationPanel {
    private static currentPanel: MigrationPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly extensionUri: vscode.Uri;
    private project?: MigrationProject;
    private currentPage?: string;
    private pageAnalysis?: PageAnalysis;
    private diffEngine: DiffEngine;
    private brandingProcessor: BrandingProcessor;
    private workspaceScanner: WorkspaceScanner;
    
    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private storage: MigrationStorage,
        private pageAnalyzer: PageAnalyzer,
        private templateLoader: TemplateLoader
    ) {
        this.panel = panel;
        this.extensionUri = extensionUri;
        this.diffEngine = new DiffEngine();
        this.brandingProcessor = new BrandingProcessor();
        this.workspaceScanner = new WorkspaceScanner();

        // Set up webview content
        this.panel.webview.html = this.getWebviewContent();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            null,
            []
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            MigrationPanel.currentPanel = undefined;
        });
    }

    public static async create(
        extensionUri: vscode.Uri,
        context: vscode.ExtensionContext,
        projectId?: string
    ): Promise<MigrationPanel> {
        const column = vscode.ViewColumn.One;
        
        // Create panel
        const panel = vscode.window.createWebviewPanel(
            'aeonMigration',
            'Aeon Page Migration',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'Aeon_DefaultWebPages_v6.0.20')
                ]
            }
        );

        // Create services
        const storage = new MigrationStorage(context);
        await storage.initialize();
        
        const templateLoader = TemplateLoader.getInstance(context);
        await templateLoader.initialize();
        
        const pageAnalyzer = new PageAnalyzer(templateLoader);

        // Create migration panel
        const migrationPanel = new MigrationPanel(
            panel,
            extensionUri,
            storage,
            pageAnalyzer,
            templateLoader
        );

        MigrationPanel.currentPanel = migrationPanel;

        // Load project if specified
        if (projectId) {
            await migrationPanel.loadProject(projectId);
        }

        return migrationPanel;
    }

    private async loadProject(projectId: string): Promise<void> {
        const project = await this.storage.loadProject(projectId);
        if (project) {
            this.project = project;
            this.postMessage({
                type: 'projectLoaded',
                project: this.project
            });
            
            // Also send available templates
            const templates = await this.templateLoader.getTemplateList();
            this.postMessage({
                type: 'templatesLoaded',
                templates: templates
            });
            
            // Scan workspace for old pages
            await this.handleScanWorkspace();
        }
    }

    private async handleMessage(message: any): Promise<void> {
        console.log('Migration panel received message:', message.type);
        switch (message.type) {
            case 'requestProjectInfo':
                await this.handleRequestProjectInfo();
                break;
                
            case 'createProject':
                await this.handleCreateProject(message);
                break;
                
            case 'loadProject':
                await this.loadProject(message.projectId);
                break;
                
            case 'selectPage':
                await this.handleSelectPage(message.pageFile);
                break;
                
            case 'analyzePage':
                await this.handleAnalyzePage(message.oldContent, message.pageFile);
                break;
                
            case 'updateBranding':
                await this.handleUpdateBranding(message.branding);
                break;
                
            case 'toggleCustomization':
                await this.handleToggleCustomization(message.customizationId, message.selected);
                break;
                
            case 'saveSelections':
                await this.handleSaveSelections(message.selections);
                break;
                
            case 'changeView':
                await this.handleChangeView(message.viewMode);
                break;
                
            case 'applyMigration':
                await this.handleApplyMigration();
                break;
                
            case 'exportProject':
                await this.handleExportProject();
                break;
                
            case 'requestBrandingInput':
                await this.handleRequestBrandingInput();
                break;
                
            case 'scanWorkspace':
                await this.handleScanWorkspace();
                break;
                
            case 'selectOldPage':
                await this.handleSelectOldPage(message.oldPagePath, message.templateFileName);
                break;
        }
    }
    
    private async handleRequestProjectInfo(): Promise<void> {
        console.log('handleRequestProjectInfo called');
        // Get project info using VS Code input boxes
        const name = await vscode.window.showInputBox({
            prompt: 'Project name',
            placeHolder: 'My Aeon Migration'
        });
        
        if (!name) return;
        
        const sourceVersion = await vscode.window.showInputBox({
            prompt: 'Source Aeon version',
            placeHolder: '5.0, 5.1, 6.0, etc.'
        });
        
        if (!sourceVersion) return;
        
        const featureOptions = [
            { label: 'Appointment Scheduling', picked: false, id: 'appointment-scheduling' },
            { label: 'Modern Dual Auth', picked: false, id: 'dualauth-portal1' },
            { label: 'Simple Squares Dual Auth', picked: false, id: 'dualauth-simplesquares' }
        ];
        
        const selectedFeatures = await vscode.window.showQuickPick(featureOptions, {
            canPickMany: true,
            placeHolder: 'Select features to include (optional)'
        });
        
        const features = selectedFeatures ? selectedFeatures.map(f => f.id) : [];
        
        // Send back to webview
        this.postMessage({
            type: 'projectInfoReceived',
            name,
            sourceVersion,
            features
        });
    }

    private async handleCreateProject(message: any): Promise<void> {
        console.log('handleCreateProject called with:', message);
        try {
            await this.storage.initialize();
            
            const project = await this.storage.createProject({
                name: message.name,
                sourceVersion: message.sourceVersion,
                targetVersion: this.templateLoader.getVersion(),
                features: message.features || [],
                pages: []
            });
            
            this.project = project;
            
            this.postMessage({
                type: 'projectCreated',
                project: project
            });
            
            // Initialize the UI with bundled pages
            const templates = await this.templateLoader.getTemplateList();
            this.postMessage({
                type: 'templatesLoaded',
                templates: templates
            });
            
            // Automatically scan workspace for old pages
            vscode.window.showInformationMessage('Scanning workspace for Aeon pages...');
            await this.handleScanWorkspace();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create project: ${error}`);
        }
    }

    private async handleSelectPage(pageFile: string): Promise<void> {
        this.currentPage = pageFile;
        
        // Load any saved analysis
        if (this.project) {
            const analysis = await this.storage.loadPageAnalysis(this.project.id, pageFile);
            if (analysis) {
                this.pageAnalysis = analysis;
                this.postMessage({
                    type: 'pageAnalysisLoaded',
                    analysis: analysis
                });
            }
        }
    }

    private async handleAnalyzePage(oldContent: string, pageFile: string): Promise<void> {
        try {
            // Analyze the page
            const analysis = await this.pageAnalyzer.analyzePage(oldContent, pageFile);
            this.pageAnalysis = analysis;
            
            // Save analysis
            if (this.project) {
                await this.storage.savePageAnalysis(this.project.id, pageFile, analysis);
            }
            
            // Generate diff
            const newContent = await this.templateLoader.loadTemplate(pageFile);
            const diff = this.diffEngine.generateSideBySideDiff(oldContent, newContent);
            
            this.postMessage({
                type: 'analysisComplete',
                analysis: analysis,
                oldContent: oldContent,
                newContent: newContent
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to analyze page: ${error}`);
        }
    }

    private async handleRequestBrandingInput(): Promise<void> {
        const branding = await this.brandingProcessor.buildBrandingGuideInteractively();
        
        this.postMessage({
            type: 'brandingReceived',
            branding
        });
    }
    
    private async handleUpdateBranding(branding: BrandingGuide): Promise<void> {
        if (this.project) {
            await this.storage.saveBrandingGuide(this.project.id, branding);
            this.project.brandingGuide = branding;
            
            // Generate CSS preview
            const css = this.brandingProcessor.generateCSS(branding);
            
            this.postMessage({
                type: 'brandingUpdated',
                branding: branding,
                css: css
            });
        }
    }

    private async handleToggleCustomization(customizationId: string, selected: boolean): Promise<void> {
        // Update selection state
        this.postMessage({
            type: 'customizationToggled',
            customizationId: customizationId,
            selected: selected
        });
    }

    private async handleSaveSelections(selections: MigrationSelection[]): Promise<void> {
        if (this.project && this.currentPage) {
            await this.storage.savePageSelections(this.project.id, this.currentPage, selections);
            
            this.postMessage({
                type: 'selectionsSaved'
            });
        }
    }

    private async handleChangeView(viewMode: string): Promise<void> {
        this.postMessage({
            type: 'viewChanged',
            viewMode: viewMode
        });
    }

    private async handleApplyMigration(): Promise<void> {
        // This will be implemented in the migration engine
        vscode.window.showInformationMessage('Migration will be applied');
    }

    private async handleExportProject(): Promise<void> {
        if (this.project) {
            const exportData = await this.storage.exportProject(this.project.id);
            
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`${this.project.name}-migration.json`),
                filters: {
                    'Migration Files': ['json']
                }
            });
            
            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(exportData));
                vscode.window.showInformationMessage('Project exported successfully');
            }
        }
    }
    
    private async handleScanWorkspace(): Promise<void> {
        try {
            console.log('Scanning workspace for Aeon pages...');
            const workspacePages = await this.workspaceScanner.scanForAeonPages();
            const templates = await this.templateLoader.getTemplateList();
            
            console.log(`Templates available: ${templates.length}`);
            console.log(`Workspace pages found: ${workspacePages.length}`);
            
            if (workspacePages.length === 0) {
                vscode.window.showWarningMessage('No Aeon pages found in workspace. Make sure your folder contains HTML files with Aeon-specific markers.');
            }
            
            // Match old pages to templates
            const pageMatches = workspacePages.map(oldPage => {
                const bestMatch = this.workspaceScanner.findBestTemplateMatch(
                    oldPage.fileName, 
                    templates
                );
                
                return {
                    oldPage,
                    suggestedTemplate: bestMatch,
                    templates: templates.map(t => t.fileName)
                };
            });
            
            this.postMessage({
                type: 'workspacePagesLoaded',
                pages: pageMatches
            });
        } catch (error) {
            console.error('Error scanning workspace:', error);
            vscode.window.showErrorMessage(`Failed to scan workspace: ${error}`);
        }
    }
    
    private async handleSelectOldPage(oldPagePath: string, templateFileName: string): Promise<void> {
        try {
            // Read the old page content
            const oldContent = await vscode.workspace.fs.readFile(vscode.Uri.file(oldPagePath));
            const oldContentStr = new TextDecoder().decode(oldContent);
            
            // Set current page
            this.currentPage = templateFileName;
            
            // Analyze the page
            await this.handleAnalyzePage(oldContentStr, templateFileName);
            
            // Store the old page path for later saving
            if (this.project) {
                this.project.workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to read old page: ${error}`);
        }
    }

    private postMessage(message: any): void {
        this.panel.webview.postMessage(message);
    }

    private getWebviewContent(): string {
        const scriptUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'migrationPanel.js')
        );
        
        const styleUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'migrationPanel.css')
        );
        
        const codiconsUri = this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'codicon.css')
        );
        

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${codiconsUri}" rel="stylesheet">
    <link href="${styleUri}" rel="stylesheet">
    <title>Aeon Page Migration</title>
</head>
<body>
    <div id="migration-container">
        <div id="header">
            <h1>Aeon Page Migration</h1>
            <div id="toolbar">
                <button id="btn-new-project" class="toolbar-button">
                    <i class="codicon codicon-new-folder"></i> New Project
                </button>
                <button id="btn-open-project" class="toolbar-button">
                    <i class="codicon codicon-folder-opened"></i> Open Project
                </button>
                <button id="btn-save" class="toolbar-button" disabled>
                    <i class="codicon codicon-save"></i> Save
                </button>
                <button id="btn-export" class="toolbar-button" disabled>
                    <i class="codicon codicon-export"></i> Export
                </button>
                <div class="toolbar-separator"></div>
                <button id="btn-view-split" class="toolbar-button view-button active" title="Split View">
                    <i class="codicon codicon-split-horizontal"></i>
                </button>
                <button id="btn-view-diff" class="toolbar-button view-button" title="Diff View">
                    <i class="codicon codicon-diff"></i>
                </button>
                <button id="btn-view-preview" class="toolbar-button view-button" title="Preview">
                    <i class="codicon codicon-eye"></i>
                </button>
            </div>
        </div>
        
        <div id="project-info" class="hidden">
            <div class="info-row">
                <span class="label">Project:</span>
                <span id="project-name"></span>
            </div>
            <div class="info-row">
                <span class="label">Source Version:</span>
                <span id="source-version"></span>
                <i class="codicon codicon-arrow-right"></i>
                <span class="label">Target Version:</span>
                <span id="target-version"></span>
            </div>
        </div>
        
        <div id="main-content">
            <div id="sidebar">
                <div class="sidebar-section">
                    <h3>Pages</h3>
                    <div id="page-list" class="page-list"></div>
                </div>
                
                <div class="sidebar-section">
                    <h3>Branding</h3>
                    <button id="btn-edit-branding" class="secondary-button">
                        <i class="codicon codicon-paintcan"></i> Edit Branding
                    </button>
                </div>
                
                <div class="sidebar-section">
                    <h3>Features</h3>
                    <div id="feature-list" class="feature-list"></div>
                </div>
            </div>
            
            <div id="workspace">
                <div id="split-view" class="view-container">
                    <div class="split-pane" id="old-page-pane">
                        <div class="pane-header">
                            <h3>Original Page</h3>
                            <button class="icon-button" id="btn-upload-old">
                                <i class="codicon codicon-cloud-upload"></i>
                            </button>
                        </div>
                        <div class="pane-content" id="old-page-content">
                            <div class="empty-state">
                                <i class="codicon codicon-file-code"></i>
                                <p>Select or upload a page to migrate</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="split-pane" id="new-page-pane">
                        <div class="pane-header">
                            <h3>New Template</h3>
                        </div>
                        <div class="pane-content" id="new-page-content">
                            <div class="empty-state">
                                <i class="codicon codicon-file-code"></i>
                                <p>Template will appear here</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="diff-view" class="view-container hidden">
                    <div class="diff-content" id="diff-content"></div>
                </div>
                
                <div id="preview-view" class="view-container hidden">
                    <iframe id="preview-frame" class="preview-frame"></iframe>
                </div>
            </div>
            
            <div id="selection-panel">
                <h3>Customizations</h3>
                <div id="customization-filters">
                    <button class="filter-button active" data-filter="all">All</button>
                    <button class="filter-button" data-filter="content">Content</button>
                    <button class="filter-button" data-filter="structure">Structure</button>
                    <button class="filter-button" data-filter="javascript">JavaScript</button>
                </div>
                <div id="customization-list" class="customization-list"></div>
                <div class="selection-actions">
                    <button id="btn-apply-migration" class="primary-button" disabled>
                        Apply Migration
                    </button>
                </div>
            </div>
        </div>
    </div>
    
    <script src="${scriptUri}"></script>
</body>
</html>`;
    }
}