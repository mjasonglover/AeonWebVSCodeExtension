import * as vscode from 'vscode';
import { MigrationPanel } from '../ui/migrationPanel';
import { MigrationStorage } from './migrationStorage';
import { MigrationEngine } from './migrationEngine';
import { FeatureInstaller } from '../features/featureInstaller';

export class MigrationWorkspace {
    private static instance: MigrationWorkspace;
    private migrationPanel?: MigrationPanel;
    private activeProjects: Map<string, any> = new Map();

    private constructor(
        private context: vscode.ExtensionContext,
        private storage: MigrationStorage
    ) {}

    static getInstance(context: vscode.ExtensionContext): MigrationWorkspace {
        if (!MigrationWorkspace.instance) {
            const storage = new MigrationStorage(context);
            MigrationWorkspace.instance = new MigrationWorkspace(context, storage);
        }
        return MigrationWorkspace.instance;
    }

    /**
     * Start a new migration project
     */
    async startNewProject(): Promise<void> {
        // Just open the migration panel - it will handle project creation
        this.migrationPanel = await MigrationPanel.create(
            this.context.extensionUri,
            this.context
        );
    }

    /**
     * Open an existing migration project
     */
    async openProject(): Promise<void> {
        const projects = await this.storage.listProjects();
        
        if (projects.length === 0) {
            vscode.window.showInformationMessage('No migration projects found. Create a new one?', 'Yes', 'No')
                .then(choice => {
                    if (choice === 'Yes') {
                        this.startNewProject();
                    }
                });
            return;
        }

        // Show project picker
        const items = projects.map(p => ({
            label: p.name,
            description: `${p.sourceVersion} → ${p.targetVersion}`,
            detail: `Last modified: ${p.lastModified.toLocaleDateString()}`,
            project: p
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a migration project'
        });

        if (selected) {
            // Open migration panel with project
            this.migrationPanel = await MigrationPanel.create(
                this.context.extensionUri,
                this.context,
                selected.project.id
            );
        }
    }

    /**
     * Show recent projects in quick pick
     */
    async showRecentProjects(): Promise<void> {
        await this.storage.initialize();
        const recent = await this.storage.getRecentProjects(5);
        
        if (recent.length === 0) {
            // No projects exist, just open the panel
            this.startNewProject();
            return;
        }

        const items = [
            {
                label: '$(add) Create New Project',
                description: 'Start a new migration project',
                alwaysShow: true,
                project: null
            },
            ...recent.map(p => ({
                label: p.name,
                description: `${p.sourceVersion} → ${p.targetVersion}`,
                detail: `Last modified: ${p.lastModified.toLocaleDateString()}`,
                project: p
            }))
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a migration project or create new'
        });

        if (selected) {
            if (selected.project) {
                this.migrationPanel = await MigrationPanel.create(
                    this.context.extensionUri,
                    this.context,
                    selected.project.id
                );
            } else {
                this.startNewProject();
            }
        }
    }

    /**
     * Import a migration project
     */
    async importProject(): Promise<void> {
        const uri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                'Migration Files': ['json']
            }
        });

        if (uri && uri[0]) {
            try {
                const data = await vscode.workspace.fs.readFile(uri[0]);
                const exportData = new TextDecoder().decode(data);
                const project = await this.storage.importProject(exportData);
                
                vscode.window.showInformationMessage(`Project "${project.name}" imported successfully`);
                
                // Open the imported project
                this.migrationPanel = await MigrationPanel.create(
                    this.context.extensionUri,
                    this.context,
                    project.id
                );
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to import project: ${error}`);
            }
        }
    }

    /**
     * Show migration commands
     */
    async showCommands(): Promise<void> {
        const commands = [
            {
                label: '$(add) New Migration Project',
                description: 'Start a new migration project',
                command: 'newProject'
            },
            {
                label: '$(folder-opened) Open Project',
                description: 'Open an existing migration project',
                command: 'openProject'
            },
            {
                label: '$(cloud-download) Import Project',
                description: 'Import a migration project file',
                command: 'importProject'
            }
        ];

        const selected = await vscode.window.showQuickPick(commands, {
            placeHolder: 'Select a migration action'
        });

        if (selected) {
            switch (selected.command) {
                case 'newProject':
                    this.startNewProject();
                    break;
                case 'openProject':
                    this.openProject();
                    break;
                case 'importProject':
                    this.importProject();
                    break;
            }
        }
    }

    /**
     * Select features for the project
     */
    private async selectFeatures(): Promise<string[]> {
        const availableFeatures = [
            {
                label: 'Appointment Scheduling',
                description: 'Add appointment scheduling functionality',
                picked: false,
                id: 'appointment-scheduling'
            },
            {
                label: 'Dual Auth Portal (Modern)',
                description: 'Modern dual authentication portal',
                picked: false,
                id: 'dualauth-portal1'
            },
            {
                label: 'Dual Auth Portal (Simple Squares)',
                description: 'Simple squares dual authentication portal',
                picked: false,
                id: 'dualauth-simplesquares'
            }
        ];

        const selected = await vscode.window.showQuickPick(availableFeatures, {
            canPickMany: true,
            placeHolder: 'Select features to include (optional)'
        });

        return selected ? selected.map(f => f.id) : [];
    }
}