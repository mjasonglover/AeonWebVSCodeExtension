import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { 
    MigrationProject, 
    MigrationPage, 
    BrandingGuide,
    MigrationSelection 
} from '../types/migration.types';

export class MigrationStorage {
    private storageUri: vscode.Uri;
    private projectsPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.storageUri = context.globalStorageUri;
        this.projectsPath = path.join(this.storageUri.fsPath, 'migrations');
    }

    async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.projectsPath, { recursive: true });
        } catch (error) {
            console.error('Failed to create migration storage directory:', error);
        }
    }

    /**
     * Create a new migration project
     */
    async createProject(project: Omit<MigrationProject, 'id' | 'created' | 'lastModified'>): Promise<MigrationProject> {
        const newProject: MigrationProject = {
            ...project,
            id: this.generateId(),
            created: new Date(),
            lastModified: new Date()
        };

        await this.saveProject(newProject);
        return newProject;
    }

    /**
     * Save or update a migration project
     */
    async saveProject(project: MigrationProject): Promise<void> {
        project.lastModified = new Date();
        const projectPath = path.join(this.projectsPath, `${project.id}.json`);
        
        try {
            await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
        } catch (error) {
            throw new Error(`Failed to save migration project: ${error}`);
        }
    }

    /**
     * Load a migration project
     */
    async loadProject(projectId: string): Promise<MigrationProject | null> {
        const projectPath = path.join(this.projectsPath, `${projectId}.json`);
        
        try {
            const data = await fs.readFile(projectPath, 'utf-8');
            const project = JSON.parse(data);
            
            // Convert date strings back to Date objects
            project.created = new Date(project.created);
            project.lastModified = new Date(project.lastModified);
            
            return project;
        } catch (error) {
            console.error(`Failed to load project ${projectId}:`, error);
            return null;
        }
    }

    /**
     * List all migration projects
     */
    async listProjects(): Promise<MigrationProject[]> {
        try {
            // Ensure directory exists
            await this.initialize();
            const files = await fs.readdir(this.projectsPath);
            const projects: MigrationProject[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const projectId = file.replace('.json', '');
                    const project = await this.loadProject(projectId);
                    if (project) {
                        projects.push(project);
                    }
                }
            }

            // Sort by last modified date, newest first
            return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
        } catch (error) {
            console.error('Failed to list projects:', error);
            return [];
        }
    }

    /**
     * Delete a migration project
     */
    async deleteProject(projectId: string): Promise<void> {
        const projectPath = path.join(this.projectsPath, `${projectId}.json`);
        
        try {
            await fs.unlink(projectPath);
            
            // Also delete associated page data
            const pagePath = path.join(this.projectsPath, projectId);
            await this.deleteDirectory(pagePath);
        } catch (error) {
            throw new Error(`Failed to delete project: ${error}`);
        }
    }

    /**
     * Save page analysis data
     */
    async savePageAnalysis(projectId: string, pageFile: string, data: any): Promise<void> {
        const pagePath = path.join(this.projectsPath, projectId, 'pages');
        await fs.mkdir(pagePath, { recursive: true });
        
        const fileName = this.sanitizeFileName(pageFile) + '-analysis.json';
        const filePath = path.join(pagePath, fileName);
        
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    /**
     * Load page analysis data
     */
    async loadPageAnalysis(projectId: string, pageFile: string): Promise<any | null> {
        const fileName = this.sanitizeFileName(pageFile) + '-analysis.json';
        const filePath = path.join(this.projectsPath, projectId, 'pages', fileName);
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    /**
     * Save user selections for a page
     */
    async savePageSelections(projectId: string, pageFile: string, selections: MigrationSelection[]): Promise<void> {
        const project = await this.loadProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Update or add page entry
        const pageIndex = project.pages.findIndex(p => p.sourceFile === pageFile);
        const page: MigrationPage = {
            sourceFile: pageFile,
            targetFile: pageFile,
            status: 'in-progress',
            customizations: selections,
            lastModified: new Date()
        };

        if (pageIndex >= 0) {
            project.pages[pageIndex] = page;
        } else {
            project.pages.push(page);
        }

        await this.saveProject(project);
    }

    /**
     * Save branding guide for a project
     */
    async saveBrandingGuide(projectId: string, branding: BrandingGuide): Promise<void> {
        const project = await this.loadProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        project.brandingGuide = branding;
        await this.saveProject(project);
    }

    /**
     * Export project for sharing
     */
    async exportProject(projectId: string): Promise<string> {
        const project = await this.loadProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Include all related data
        const exportData = {
            project,
            pages: {} as Record<string, any>
        };

        // Load all page analyses
        for (const page of project.pages) {
            const analysis = await this.loadPageAnalysis(projectId, page.sourceFile);
            if (analysis) {
                exportData.pages[page.sourceFile] = analysis;
            }
        }

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import project from export data
     */
    async importProject(exportData: string): Promise<MigrationProject> {
        const data = JSON.parse(exportData);
        const project = data.project;
        
        // Generate new ID for imported project
        project.id = this.generateId();
        project.name = `${project.name} (Imported)`;
        project.created = new Date();
        project.lastModified = new Date();

        // Save project
        await this.saveProject(project);

        // Save page analyses
        for (const [pageFile, analysis] of Object.entries(data.pages)) {
            await this.savePageAnalysis(project.id, pageFile, analysis);
        }

        return project;
    }

    /**
     * Get recent projects for quick access
     */
    async getRecentProjects(limit: number = 5): Promise<MigrationProject[]> {
        const projects = await this.listProjects();
        return projects.slice(0, limit);
    }

    /**
     * Check if a project name already exists
     */
    async projectNameExists(name: string): Promise<boolean> {
        const projects = await this.listProjects();
        return projects.some(p => p.name.toLowerCase() === name.toLowerCase());
    }

    private generateId(): string {
        return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private sanitizeFileName(fileName: string): string {
        return fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }

    private async deleteDirectory(dirPath: string): Promise<void> {
        try {
            const files = await fs.readdir(dirPath);
            
            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = await fs.stat(filePath);
                
                if (stat.isDirectory()) {
                    await this.deleteDirectory(filePath);
                } else {
                    await fs.unlink(filePath);
                }
            }
            
            await fs.rmdir(dirPath);
        } catch (error) {
            // Directory might not exist
            console.log(`Could not delete directory ${dirPath}:`, error);
        }
    }
}