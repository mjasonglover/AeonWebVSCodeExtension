import * as vscode from 'vscode';

export interface Theme {
    name: string;
    cssFile?: string;
    customCSS: string;
    description: string;
}

export class ThemeManager {
    private themes: Map<string, Theme> = new Map();
    private currentTheme: string = 'default';
    private userThemes: Map<string, Theme> = new Map();
    
    constructor() {
        this.loadBuiltInThemes();
        this.loadUserThemes();
    }
    
    private loadBuiltInThemes(): void {
        this.themes.set('default', {
            name: 'Default Aeon',
            cssFile: 'aeon.css',
            customCSS: '',
            description: 'Standard Aeon interface theme'
        });
        
        this.themes.set('dark', {
            name: 'Dark Mode',
            cssFile: 'aeon.css',
            customCSS: `
                body {
                    background: #1e1e1e;
                    color: #d4d4d4;
                }
                
                #preview-content {
                    background: #2d2d30;
                    color: #d4d4d4;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
                }
                
                .form-control,
                .form-select {
                    background: #3c3c3c;
                    color: #d4d4d4;
                    border-color: #555;
                }
                
                .form-control:focus,
                .form-select:focus {
                    border-color: #007acc;
                    box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.25);
                }
                
                table th {
                    background-color: #3c3c3c;
                    color: #d4d4d4;
                }
                
                table td {
                    border-color: #444;
                }
                
                .status-message.info {
                    background-color: #1e3a5f;
                    border-color: #2d5a8f;
                    color: #75b5ff;
                }
                
                .btn-primary {
                    background-color: #0e639c;
                    border-color: #0e639c;
                }
                
                .btn-primary:hover {
                    background-color: #1177bb;
                    border-color: #1177bb;
                }
                
                a {
                    color: #4daaff;
                }
                
                .item-info {
                    background-color: #2d2d30;
                    border-color: #444;
                }
            `,
            description: 'Dark theme optimized for low-light environments'
        });
        
        this.themes.set('highContrast', {
            name: 'High Contrast',
            cssFile: 'aeon.css',
            customCSS: `
                body {
                    background: white;
                    color: black;
                    font-weight: 500;
                }
                
                #preview-content {
                    background: white;
                    color: black;
                    border: 3px solid black;
                    box-shadow: none;
                }
                
                .form-control,
                .form-select {
                    border: 2px solid black;
                    font-weight: 500;
                }
                
                .form-control:focus,
                .form-select:focus {
                    border-color: #0000ff;
                    outline: 2px solid #0000ff;
                    outline-offset: 2px;
                    box-shadow: none;
                }
                
                a {
                    color: #0000ff;
                    text-decoration: underline;
                    font-weight: bold;
                }
                
                .btn {
                    border: 2px solid black;
                    font-weight: bold;
                }
                
                .btn-primary {
                    background-color: black;
                    color: white;
                    border-color: black;
                }
                
                .btn-primary:hover {
                    background-color: white;
                    color: black;
                    border-color: black;
                }
                
                table {
                    border: 2px solid black;
                }
                
                table th,
                table td {
                    border: 1px solid black;
                    padding: 10px;
                }
                
                .required {
                    color: black;
                    font-weight: bold;
                    text-decoration: underline;
                }
                
                .status-message {
                    border-width: 2px;
                    font-weight: bold;
                }
            `,
            description: 'Maximum contrast for accessibility'
        });
        
        this.themes.set('print', {
            name: 'Print Preview',
            cssFile: 'aeon.css',
            customCSS: `
                @media print {
                    #preview-controls {
                        display: none !important;
                    }
                }
                
                body {
                    background: white;
                    color: black;
                    font-family: 'Times New Roman', Times, serif;
                }
                
                #preview-frame {
                    background: white;
                    padding: 0;
                }
                
                #preview-content {
                    box-shadow: none;
                    padding: 0;
                    max-width: 100%;
                }
                
                .aeon-tag {
                    background: none !important;
                    border: none !important;
                    padding: 0 !important;
                }
                
                .include-content {
                    border: 1px dashed #999;
                    page-break-inside: avoid;
                }
                
                table {
                    page-break-inside: avoid;
                }
                
                .btn,
                .form-control,
                .form-select {
                    border: 1px solid black;
                }
                
                .no-print {
                    display: none !important;
                }
                
                @page {
                    margin: 1in;
                }
            `,
            description: 'Optimized for printing'
        });
        
        this.themes.set('minimal', {
            name: 'Minimal',
            cssFile: 'aeon.css',
            customCSS: `
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.8;
                    color: #2c3e50;
                }
                
                #preview-content {
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    border-radius: 8px;
                }
                
                h1, h2, h3, h4, h5, h6 {
                    font-weight: 300;
                    color: #34495e;
                    margin-top: 2em;
                }
                
                .form-control,
                .form-select {
                    border: none;
                    border-bottom: 2px solid #ecf0f1;
                    border-radius: 0;
                    padding-left: 0;
                    padding-right: 0;
                    background: transparent;
                }
                
                .form-control:focus,
                .form-select:focus {
                    border-bottom-color: #3498db;
                    box-shadow: none;
                }
                
                .btn {
                    border: none;
                    border-radius: 24px;
                    padding: 8px 24px;
                    text-transform: uppercase;
                    font-size: 12px;
                    letter-spacing: 1px;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                
                .btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                
                .btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                
                table {
                    border: none;
                }
                
                table th {
                    background: transparent;
                    border-bottom: 2px solid #ecf0f1;
                    font-weight: 600;
                    text-transform: uppercase;
                    font-size: 12px;
                    letter-spacing: 1px;
                }
                
                table td {
                    border-bottom: 1px solid #f5f6fa;
                }
            `,
            description: 'Clean, modern minimal design'
        });
    }
    
    private async loadUserThemes(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aeon');
        const customThemes = config.get<any[]>('preview.customThemes', []);
        
        for (const theme of customThemes) {
            if (theme.name && theme.css) {
                this.userThemes.set(theme.name, {
                    name: theme.name,
                    customCSS: theme.css,
                    description: theme.description || 'Custom theme'
                });
            }
        }
    }
    
    public getThemeStyles(): string {
        const theme = this.themes.get(this.currentTheme) || 
                     this.userThemes.get(this.currentTheme) || 
                     this.themes.get('default')!;
        
        return theme.customCSS;
    }
    
    public setTheme(themeName: string): void {
        if (this.themes.has(themeName) || this.userThemes.has(themeName)) {
            this.currentTheme = themeName;
        }
    }
    
    public getCurrentTheme(): string {
        return this.currentTheme;
    }
    
    public getAvailableThemes(): Array<{ name: string; description: string }> {
        const allThemes: Array<{ name: string; description: string }> = [];
        
        // Built-in themes
        this.themes.forEach((theme, key) => {
            allThemes.push({ name: key, description: theme.description });
        });
        
        // User themes
        this.userThemes.forEach((theme, key) => {
            allThemes.push({ name: key, description: `${theme.description} (Custom)` });
        });
        
        return allThemes;
    }
    
    public async saveCustomTheme(name: string, css: string, description?: string): Promise<void> {
        const theme: Theme = {
            name,
            customCSS: css,
            description: description || 'Custom theme'
        };
        
        this.userThemes.set(name, theme);
        
        // Save to workspace configuration
        const config = vscode.workspace.getConfiguration('aeon');
        const customThemes = config.get<any[]>('preview.customThemes', []);
        
        // Remove existing theme with same name
        const filtered = customThemes.filter(t => t.name !== name);
        
        // Add new theme
        filtered.push({
            name,
            css,
            description: theme.description
        });
        
        await config.update('preview.customThemes', filtered, vscode.ConfigurationTarget.Workspace);
    }
    
    public async deleteCustomTheme(name: string): Promise<void> {
        if (!this.userThemes.has(name)) {
            throw new Error('Theme not found or is not a custom theme');
        }
        
        this.userThemes.delete(name);
        
        // Remove from workspace configuration
        const config = vscode.workspace.getConfiguration('aeon');
        const customThemes = config.get<any[]>('preview.customThemes', []);
        const filtered = customThemes.filter(t => t.name !== name);
        
        await config.update('preview.customThemes', filtered, vscode.ConfigurationTarget.Workspace);
        
        // Switch to default if we deleted the current theme
        if (this.currentTheme === name) {
            this.setTheme('default');
        }
    }
    
    public exportTheme(themeName: string): string {
        const theme = this.themes.get(themeName) || this.userThemes.get(themeName);
        if (!theme) {
            throw new Error(`Theme not found: ${themeName}`);
        }
        
        return JSON.stringify({
            name: theme.name,
            css: theme.customCSS,
            description: theme.description
        }, null, 2);
    }
    
    public async importTheme(jsonContent: string): Promise<string> {
        try {
            const parsed = JSON.parse(jsonContent);
            if (!parsed.name || !parsed.css) {
                throw new Error('Invalid theme format');
            }
            
            // Generate unique name if it already exists
            let name = parsed.name;
            let counter = 1;
            while (this.themes.has(name) || this.userThemes.has(name)) {
                name = `${parsed.name} (${counter++})`;
            }
            
            await this.saveCustomTheme(name, parsed.css, parsed.description);
            return name;
        } catch (error: any) {
            throw new Error(`Failed to import theme: ${error.message}`);
        }
    }
}