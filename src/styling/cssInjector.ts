import * as vscode from 'vscode';

export class CSSInjector {
    private customStyles: string = '';
    private styleHistory: string[] = [];
    private maxHistorySize: number = 20;
    
    constructor(private webview: vscode.Webview) {}
    
    public async updateStyles(css: string): Promise<void> {
        // Validate CSS before applying
        if (this.validateCSS(css)) {
            // Save to history
            if (this.customStyles && this.customStyles !== css) {
                this.styleHistory.push(this.customStyles);
                if (this.styleHistory.length > this.maxHistorySize) {
                    this.styleHistory.shift();
                }
            }
            
            this.customStyles = css;
            await this.webview.postMessage({
                command: 'updateStyles',
                css: this.customStyles
            });
        }
    }
    
    public async injectStylesheet(uri: vscode.Uri): Promise<void> {
        try {
            const content = await vscode.workspace.fs.readFile(uri);
            const css = new TextDecoder().decode(content);
            await this.updateStyles(css);
        } catch (error: any) {
            throw new Error(`Failed to load stylesheet: ${error.message}`);
        }
    }
    
    public async appendStyles(css: string): Promise<void> {
        const combined = this.customStyles + '\n\n' + css;
        await this.updateStyles(combined);
    }
    
    public async removeStyles(selector?: string): Promise<void> {
        if (!selector) {
            // Clear all custom styles
            await this.updateStyles('');
            return;
        }
        
        // Remove specific selector rules
        const lines = this.customStyles.split('\n');
        const filtered: string[] = [];
        let inMatchingRule = false;
        let braceCount = 0;
        
        for (const line of lines) {
            if (line.includes(selector) && line.includes('{')) {
                inMatchingRule = true;
                braceCount = 1;
                continue;
            }
            
            if (inMatchingRule) {
                braceCount += (line.match(/{/g) || []).length;
                braceCount -= (line.match(/}/g) || []).length;
                
                if (braceCount === 0) {
                    inMatchingRule = false;
                    continue;
                }
            }
            
            if (!inMatchingRule) {
                filtered.push(line);
            }
        }
        
        await this.updateStyles(filtered.join('\n'));
    }
    
    public getCurrentStyles(): string {
        return this.customStyles;
    }
    
    public undo(): void {
        if (this.styleHistory.length > 0) {
            const previousStyles = this.styleHistory.pop()!;
            this.updateStyles(previousStyles);
        }
    }
    
    public reset(): void {
        this.styleHistory.push(this.customStyles);
        this.updateStyles('');
    }
    
    private validateCSS(css: string): boolean {
        // Basic CSS validation
        try {
            // Check for balanced braces
            const openBraces = (css.match(/{/g) || []).length;
            const closeBraces = (css.match(/}/g) || []).length;
            
            if (openBraces !== closeBraces) {
                vscode.window.showErrorMessage('CSS validation failed: Unbalanced braces');
                return false;
            }
            
            // Check for potentially dangerous content
            const dangerous = [
                'javascript:',
                'expression(',
                'behavior:',
                'binding:',
                '-moz-binding:',
                'vbscript:',
                '@import'
            ];
            
            const lowerCSS = css.toLowerCase();
            for (const pattern of dangerous) {
                if (lowerCSS.includes(pattern)) {
                    vscode.window.showErrorMessage(`CSS validation failed: Potentially dangerous content (${pattern})`);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }
    
    public async addMediaQuery(query: string, css: string): Promise<void> {
        const mediaRule = `@media ${query} {\n${this.indentCSS(css)}\n}`;
        await this.appendStyles(mediaRule);
    }
    
    private indentCSS(css: string, spaces: number = 4): string {
        const indent = ' '.repeat(spaces);
        return css.split('\n').map(line => indent + line).join('\n');
    }
    
    public async addVariables(variables: Record<string, string>): Promise<void> {
        let variableCSS = ':root {\n';
        for (const [name, value] of Object.entries(variables)) {
            variableCSS += `    --${name}: ${value};\n`;
        }
        variableCSS += '}';
        
        await this.appendStyles(variableCSS);
    }
    
    public async toggleClass(selector: string, className: string, add: boolean): Promise<void> {
        await this.webview.postMessage({
            command: 'toggleClass',
            selector,
            className,
            add
        });
    }
    
    public getCommonSnippets(): Array<{ name: string; css: string }> {
        return [
            {
                name: 'Hide Aeon Tags',
                css: '.aeon-tag { display: none !important; }'
            },
            {
                name: 'Highlight Required Fields',
                css: `
                    input[required], 
                    select[required], 
                    textarea[required] {
                        border: 2px solid #ff6b6b !important;
                        background-color: #ffe0e0 !important;
                    }
                `
            },
            {
                name: 'Large Print Mode',
                css: `
                    body { font-size: 18px !important; }
                    input, select, textarea { font-size: 18px !important; }
                    .btn { font-size: 16px !important; padding: 10px 20px !important; }
                `
            },
            {
                name: 'Focus Mode',
                css: `
                    body { max-width: 800px; margin: 0 auto; }
                    #preview-content { padding: 60px; }
                    p { line-height: 2; margin-bottom: 1.5em; }
                `
            },
            {
                name: 'Debug Grid',
                css: `
                    * { outline: 1px solid rgba(255, 0, 0, 0.2) !important; }
                    *:hover { outline: 2px solid rgba(255, 0, 0, 0.5) !important; }
                `
            }
        ];
    }
}