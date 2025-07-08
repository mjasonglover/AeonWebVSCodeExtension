import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface WorkspaceAeonPage {
    fileName: string;
    filePath: string;
    relativePath: string;
    aeonForm?: string;
    detectedType: 'request' | 'view' | 'admin' | 'auth' | 'unknown';
    hasCustomizations: boolean;
}

export class WorkspaceScanner {
    constructor() {}

    /**
     * Scan workspace for Aeon HTML pages
     */
    async scanForAeonPages(): Promise<WorkspaceAeonPage[]> {
        const pages: WorkspaceAeonPage[] = [];
        
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            console.log('No workspace folders found');
            vscode.window.showWarningMessage('No workspace folder open. Please open a folder containing Aeon pages.');
            return pages;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
        console.log('Scanning workspace:', workspaceRoot);
        
        try {
            // Find all HTML files in workspace
            const files = await vscode.workspace.findFiles('**/*.html', '**/node_modules/**');
            console.log(`Found ${files.length} HTML files`);
            
            if (files.length === 0) {
                vscode.window.showInformationMessage('No HTML files found in workspace');
            }
            
            for (const file of files) {
                const content = await fs.readFile(file.fsPath, 'utf-8');
                
                // Check if it's an Aeon page
                if (this.isAeonPage(content)) {
                    const fileName = path.basename(file.fsPath);
                    const relativePath = path.relative(workspaceRoot, file.fsPath);
                    
                    console.log(`Found Aeon page: ${fileName}`);
                    
                    pages.push({
                        fileName,
                        filePath: file.fsPath,
                        relativePath,
                        aeonForm: this.extractAeonForm(content),
                        detectedType: this.detectPageType(fileName, content),
                        hasCustomizations: this.detectCustomizations(content)
                    });
                }
            }
            
            // Sort by file name
            pages.sort((a, b) => a.fileName.localeCompare(b.fileName));
            console.log(`Found ${pages.length} Aeon pages`);
            
        } catch (error) {
            console.error('Error scanning workspace:', error);
        }
        
        return pages;
    }

    /**
     * Check if HTML content is an Aeon page
     */
    private isAeonPage(content: string): boolean {
        // Look for Aeon-specific markers
        const hasAeonForm = content.includes('name="AeonForm"');
        const hasAeonDll = content.includes('aeon.dll');
        const hasInclude = content.includes('<#INCLUDE') || content.includes('<!--#INCLUDE');
        
        const isAeon = hasAeonForm || hasAeonDll || hasInclude;
        
        if (!isAeon) {
            console.log('Page not detected as Aeon - missing markers');
        }
        
        return isAeon;
    }

    /**
     * Extract AeonForm value from page
     */
    private extractAeonForm(content: string): string | undefined {
        const match = content.match(/name="AeonForm"\s+value="([^"]+)"/);
        return match ? match[1] : undefined;
    }

    /**
     * Detect the type of Aeon page
     */
    private detectPageType(fileName: string, content: string): WorkspaceAeonPage['detectedType'] {
        const lowerName = fileName.toLowerCase();
        
        if (lowerName.includes('request') || content.includes('GenericRequest')) {
            return 'request';
        } else if (lowerName.includes('view') || lowerName.includes('list')) {
            return 'view';
        } else if (lowerName.includes('logon') || lowerName.includes('registration')) {
            return 'auth';
        } else if (lowerName.includes('admin') || lowerName.includes('manage')) {
            return 'admin';
        }
        
        return 'unknown';
    }

    /**
     * Detect if page has customizations (rough check)
     */
    private detectCustomizations(content: string): boolean {
        // Look for common customization indicators
        const indicators = [
            /<style[^>]*>[\s\S]*?<\/style>/i,  // Inline styles
            /<script[^>]*>[\s\S]*?<\/script>/i, // Inline scripts (beyond includes)
            /custom\.css/i,                      // Custom CSS file
            /custom\.js/i,                       // Custom JS file
            /<!--\s*[Cc]ustom/,                 // Custom comments
            /class="custom/i                    // Custom CSS classes
        ];
        
        return indicators.some(pattern => pattern.test(content));
    }

    /**
     * Find the best matching template for an old page
     */
    findBestTemplateMatch(oldPageName: string, templates: Array<{fileName: string}>): string | null {
        const oldName = oldPageName.toLowerCase();
        
        // First try exact match
        const exactMatch = templates.find(t => t.fileName.toLowerCase() === oldName);
        if (exactMatch) return exactMatch.fileName;
        
        // Try without extension
        const oldBaseName = oldName.replace('.html', '');
        const baseMatch = templates.find(t => 
            t.fileName.toLowerCase().replace('.html', '') === oldBaseName
        );
        if (baseMatch) return baseMatch.fileName;
        
        // Try partial matches for common patterns
        const patterns = [
            { old: /edit(.+)request/, new: 'Edit$1Request' },
            { old: /view(.+)/, new: 'View$1' },
            { old: /new(.+)/, new: 'New$1' }
        ];
        
        for (const pattern of patterns) {
            const match = oldBaseName.match(pattern.old);
            if (match) {
                const possibleName = oldBaseName.replace(pattern.old, pattern.new);
                const templateMatch = templates.find(t => 
                    t.fileName.toLowerCase().includes(possibleName.toLowerCase())
                );
                if (templateMatch) return templateMatch.fileName;
            }
        }
        
        // No good match found
        return null;
    }
}