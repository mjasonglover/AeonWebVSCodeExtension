import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TemplateManifest, TemplatePageInfo } from '../types/migration.types';

export class TemplateLoader {
    private static instance: TemplateLoader;
    private extensionPath: string;
    private templatePath: string;
    private manifest?: TemplateManifest;
    private autoUpdateEnabled: boolean = true;

    private constructor(context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
        this.templatePath = path.join(this.extensionPath, 'Aeon_DefaultWebPages_v6.0.20');
    }

    static getInstance(context: vscode.ExtensionContext): TemplateLoader {
        if (!TemplateLoader.instance) {
            TemplateLoader.instance = new TemplateLoader(context);
        }
        return TemplateLoader.instance;
    }

    async initialize(): Promise<void> {
        await this.loadManifest();
        if (this.autoUpdateEnabled) {
            await this.checkForUpdates();
        }
    }

    private async loadManifest(): Promise<void> {
        try {
            // For now, we'll create a manifest based on directory structure
            // In production, this would come from a manifest.json file
            const pages = await this.scanTemplateDirectory();
            
            this.manifest = {
                version: '6.0.20',
                pages,
                includes: await this.getIncludes(),
                assets: await this.getAssets(),
                releaseDate: new Date('2024-01-01'),
                releaseNotes: 'Latest Aeon 6.0.20 default pages'
            };
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load template manifest: ${error}`);
            throw error;
        }
    }

    private async scanTemplateDirectory(): Promise<TemplatePageInfo[]> {
        const pages: TemplatePageInfo[] = [];
        const templateDir = this.templatePath;

        try {
            const files = await fs.readdir(templateDir);
            
            for (const file of files) {
                if (file.endsWith('.html')) {
                    const content = await this.loadTemplate(file);
                    const pageInfo: TemplatePageInfo = {
                        fileName: file,
                        type: this.detectPageType(file, content),
                        description: this.getPageDescription(file),
                        aeonForm: this.extractAeonForm(content)
                    };
                    pages.push(pageInfo);
                }
            }
        } catch (error) {
            console.error('Error scanning template directory:', error);
        }

        return pages;
    }

    private detectPageType(fileName: string, content: string): 'form' | 'list' | 'report' | 'admin' {
        if (fileName.toLowerCase().includes('request') || content.includes('form action="aeon.dll"')) {
            return 'form';
        } else if (fileName.toLowerCase().includes('view') || fileName.toLowerCase().includes('list')) {
            return 'list';
        } else if (fileName.toLowerCase().includes('report')) {
            return 'report';
        }
        return 'admin';
    }

    private getPageDescription(fileName: string): string {
        const descriptions: Record<string, string> = {
            'DefaultRequest.html': 'Default request form for general materials',
            'ViewRequests.html': 'View and manage user requests',
            'ViewUserReviewRequests.html': 'Review requests awaiting approval',
            'NewUserRegistration.html': 'New user registration form',
            'ChangeUserInformation.html': 'Update user profile information'
        };
        
        return descriptions[fileName] || `Aeon page: ${fileName}`;
    }

    private extractAeonForm(content: string): string | undefined {
        const match = content.match(/name="AeonForm"\s+value="([^"]+)"/);
        return match ? match[1] : undefined;
    }

    async loadTemplate(fileName: string): Promise<string> {
        const filePath = path.join(this.templatePath, fileName);
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to load template ${fileName}: ${error}`);
        }
    }

    async getTemplateList(): Promise<TemplatePageInfo[]> {
        if (!this.manifest) {
            await this.loadManifest();
        }
        return this.manifest!.pages;
    }

    async getIncludes(): Promise<string[]> {
        const includesPath = path.join(this.templatePath, 'includes');
        try {
            const files = await fs.readdir(includesPath);
            return files.filter(f => f.endsWith('.html'));
        } catch {
            return [];
        }
    }

    async getAssets(): Promise<string[]> {
        const assets: string[] = [];
        const assetDirs = ['css', 'js', 'images'];
        
        for (const dir of assetDirs) {
            const dirPath = path.join(this.templatePath, dir);
            try {
                const files = await fs.readdir(dirPath);
                assets.push(...files.map(f => path.join(dir, f)));
            } catch {
                // Directory doesn't exist
            }
        }
        
        return assets;
    }

    async loadInclude(fileName: string): Promise<string> {
        const filePath = path.join(this.templatePath, 'includes', fileName);
        return await fs.readFile(filePath, 'utf-8');
    }

    async loadAsset(assetPath: string): Promise<Buffer> {
        const filePath = path.join(this.templatePath, assetPath);
        return await fs.readFile(filePath);
    }

    getVersion(): string {
        return this.manifest?.version || 'Unknown';
    }

    private async checkForUpdates(): Promise<void> {
        // In production, this would check for newer template versions
        // For now, we'll just log that we're checking
        console.log('Checking for template updates...');
        
        // If updates are available, prompt user
        const config = vscode.workspace.getConfiguration('aeon');
        if (config.get<boolean>('autoUpdateTemplates', true)) {
            // Auto-update logic would go here
        }
    }

    setAutoUpdate(enabled: boolean): void {
        this.autoUpdateEnabled = enabled;
    }

    async getFeaturePackages(): Promise<string[]> {
        const featuresPath = path.join(this.templatePath, 'features');
        try {
            const dirs = await fs.readdir(featuresPath, { withFileTypes: true });
            return dirs.filter(d => d.isDirectory()).map(d => d.name);
        } catch {
            return [];
        }
    }

    async loadFeaturePackage(featureName: string): Promise<string> {
        const featurePath = path.join(this.templatePath, 'features', featureName);
        const indexPath = path.join(featurePath, 'Index.cshtml');
        
        try {
            return await fs.readFile(indexPath, 'utf-8');
        } catch (error) {
            throw new Error(`Failed to load feature package ${featureName}: ${error}`);
        }
    }
}