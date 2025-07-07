import * as vscode from 'vscode';
import { PreviewPanel } from './previewPanel';
import { TagProcessor } from './tagProcessor';
import { MockDataManager } from '../mockData/mockDataManager';

export class PreviewManager {
    private static instance: PreviewManager;
    private panels: Map<string, PreviewPanel> = new Map();
    private tagProcessor: TagProcessor;
    private mockDataManager: MockDataManager;
    
    private constructor(
        private context: vscode.ExtensionContext,
        private extensionUri: vscode.Uri
    ) {
        this.tagProcessor = new TagProcessor();
        this.mockDataManager = new MockDataManager();
    }
    
    public static getInstance(context: vscode.ExtensionContext, extensionUri: vscode.Uri): PreviewManager {
        if (!PreviewManager.instance) {
            PreviewManager.instance = new PreviewManager(context, extensionUri);
        }
        return PreviewManager.instance;
    }
    
    public async showPreview(document: vscode.TextDocument): Promise<void> {
        if (!document) {
            vscode.window.showErrorMessage('No document to preview');
            return;
        }
        
        const key = document.uri.toString();
        let panel = this.panels.get(key);
        
        if (!panel) {
            try {
                panel = new PreviewPanel(
                    this.context,
                    this.extensionUri,
                    document,
                    this.tagProcessor,
                    this.mockDataManager
                );
                this.panels.set(key, panel);
                
                panel.onDidDispose(() => {
                    this.panels.delete(key);
                });
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to create preview: ${error.message}`);
                return;
            }
        }
        
        panel.reveal();
        await panel.update();
    }
    
    public async refreshPreview(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const panel = this.panels.get(activeEditor.document.uri.toString());
            if (panel) {
                await panel.update();
            }
        }
    }
    
    public async updatePreview(document: vscode.TextDocument): Promise<void> {
        const panel = this.panels.get(document.uri.toString());
        if (panel) {
            await panel.update();
        }
    }
    
    public async changePreviewDevice(): Promise<void> {
        const devices = ['Desktop (1920x1080)', 'iPad Pro', 'iPhone 12', 'Custom'];
        const selected = await vscode.window.showQuickPick(devices, {
            placeHolder: 'Select preview device'
        });
        
        if (selected) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const panel = this.panels.get(activeEditor.document.uri.toString());
                if (panel) {
                    await panel.setDevice(selected);
                }
            }
        }
    }
    
    public async toggleTagVisualization(): Promise<void> {
        const modes = ['none', 'highlight', 'labels'];
        const selected = await vscode.window.showQuickPick(modes, {
            placeHolder: 'Select tag visualization mode'
        });
        
        if (selected) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const panel = this.panels.get(activeEditor.document.uri.toString());
                if (panel) {
                    await panel.setTagVisualization(selected as 'none' | 'highlight' | 'labels');
                }
            }
        }
    }
    
    public async editMockData(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const panel = this.panels.get(activeEditor.document.uri.toString());
            if (panel) {
                await panel.showMockDataEditor();
            }
        }
    }
    
    public async changeMockDataProfile(): Promise<void> {
        const profiles = this.mockDataManager.getProfileNames();
        const selected = await vscode.window.showQuickPick(profiles, {
            placeHolder: 'Select mock data profile'
        });
        
        if (selected) {
            this.mockDataManager.setProfile(selected);
            // Update all open previews
            for (const panel of this.panels.values()) {
                await panel.update();
            }
        }
    }
    
    public dispose(): void {
        for (const panel of this.panels.values()) {
            panel.dispose();
        }
        this.panels.clear();
    }
}