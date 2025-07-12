import * as vscode from 'vscode';
import * as path from 'path';
import { TagProcessor, ProcessingResult } from './tagProcessor';
import { MockDataManager } from '../mockData/mockDataManager';
import { ViewportManager } from '../responsive/viewportManager';
import { TagVisualizer } from '../visualization/tagVisualizer';
import { ThemeManager } from '../styling/themeManager';
import { CSSInjector } from '../styling/cssInjector';

export class PreviewPanel {
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private viewportManager: ViewportManager;
    private tagVisualizer: TagVisualizer;
    private themeManager: ThemeManager;
    private cssInjector: CSSInjector;
    
    constructor(
        private context: vscode.ExtensionContext,
        private extensionUri: vscode.Uri,
        private document: vscode.TextDocument,
        private tagProcessor: TagProcessor,
        private mockDataManager: MockDataManager
    ) {
        const localResourceRoots = [
            vscode.Uri.joinPath(extensionUri, 'media'),
            vscode.Uri.joinPath(extensionUri, 'node_modules')
        ];
        
        // Add workspace folder if available
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            localResourceRoots.push(workspaceFolder.uri);
        }
        
        // Also add the directory containing the current document
        const documentDir = vscode.Uri.file(path.dirname(document.uri.fsPath));
        localResourceRoots.push(documentDir);
        
        // Add parent directory to handle ../css paths
        const parentDir = vscode.Uri.file(path.dirname(path.dirname(document.uri.fsPath)));
        localResourceRoots.push(parentDir);
        
        this.panel = vscode.window.createWebviewPanel(
            'aeonPreview',
            `Preview: ${path.basename(document.fileName)}`,
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots
            }
        );
        
        this.viewportManager = new ViewportManager(this.panel.webview);
        this.tagVisualizer = new TagVisualizer();
        this.themeManager = new ThemeManager();
        this.cssInjector = new CSSInjector(this.panel.webview);
        
        this.setupWebview();
        this.setupMessageHandling();
        
        // Update context for command visibility
        vscode.commands.executeCommand('setContext', 'aeonPreviewVisible', true);
        
        this.panel.onDidDispose(() => {
            vscode.commands.executeCommand('setContext', 'aeonPreviewVisible', false);
            this.dispose();
        }, null, this.disposables);
    }
    
    private setupMessageHandling(): void {
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'updateMockData':
                        await this.mockDataManager.updateField(message.field, message.value);
                        await this.update();
                        break;
                    case 'changeViewport':
                        await this.viewportManager.setCustomSize(message.width, message.height);
                        await this.update();
                        break;
                    case 'changePreviewDevice':
                        await this.setDevice(message.device);
                        break;
                    case 'highlightTag':
                        await this.highlightSourceTag(message.tagId);
                        break;
                    case 'navigateToInclude':
                        await this.openIncludeFile(message.filename);
                        break;
                    case 'changeTheme':
                        this.themeManager.setTheme(message.theme);
                        await this.update();
                        break;
                    case 'updateCustomCSS':
                        await this.cssInjector.updateStyles(message.css);
                        break;
                    case 'refresh':
                        await this.update();
                        break;
                    case 'changeTagVisualization':
                        await this.setTagVisualization(message.mode);
                        break;
                }
            },
            null,
            this.disposables
        );
    }
    
    private setupWebview(): void {
        this.panel.iconPath = {
            light: vscode.Uri.joinPath(this.extensionUri, 'media', 'icons', 'preview-light.svg'),
            dark: vscode.Uri.joinPath(this.extensionUri, 'media', 'icons', 'preview-dark.svg')
        };
    }
    
    public async update(): Promise<void> {
        const html = await this.getPreviewHtml();
        this.panel.webview.html = html;
    }
    
    private async getPreviewHtml(): Promise<string> {
        const content = this.document.getText();
        const mockData = await this.mockDataManager.getCurrentData();
        const processed = await this.tagProcessor.process(content, mockData, this.document);
        
        // Process resource placeholders
        let html = processed.html;
        html = this.processResourcePlaceholders(html);
        
        const nonce = this.getNonce();
        
        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel.webview.cspSource} https: 'unsafe-inline'; script-src 'nonce-${nonce}' ${this.panel.webview.cspSource} https://code.jquery.com https://cdnjs.cloudflare.com https://stackpath.bootstrapcdn.com; img-src ${this.panel.webview.cspSource} https: data:; font-src ${this.panel.webview.cspSource} https:; connect-src https: data:;">
                    
                    <link href="${this.getResourceUri('media/styles/preview.css')}" rel="stylesheet">
                    <link href="${this.getResourceUri('media/styles/aeon.css')}" rel="stylesheet">
                    
                    <style nonce="${nonce}">
                        ${this.tagVisualizer.getVisualizationStyles()}
                        ${this.themeManager.getThemeStyles()}
                    </style>
                    
                    <script nonce="${nonce}">
                        // Override the initCookieConsent function to prevent cookie popup
                        window.initCookieConsent = function() {
                            return {
                                run: function() {
                                    console.log('Cookie consent disabled in preview');
                                },
                                show: function() {},
                                hide: function() {},
                                showSettings: function() {},
                                hideSettings: function() {},
                                accept: function() {},
                                allowedCategory: function() { return true; },
                                get: function() { return {}; },
                                set: function() {},
                                getUserPreferences: function() { 
                                    return { 
                                        accept_type: 'all',
                                        accepted_categories: ['necessary'],
                                        rejected_categories: []
                                    };
                                },
                                loadScript: function(src, callback) { if(callback) callback(); },
                                updateScripts: function() {},
                                eraseCookies: function() {},
                                validCookie: function() { return false; },
                                getConfig: function() { return {}; }
                            };
                        };
                        
                        // Intercept AJAX calls before any scripts load
                        (function() {
                            // Mock responses for different endpoints
                            const mockResponses = {
                                'webAlerts': { alerts: [] },
                                'ScheduledDate': { 
                                    DefaultSchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                                    MinimumDays: 1,
                                    MaximumDays: 30,
                                    ScheduledClosures: [],
                                    scheduledDate: null,
                                    allowScheduling: true,
                                    dates: [],
                                    minDate: null,
                                    maxDate: null,
                                    excludedDates: [],
                                    message: '',
                                    status: 'success'
                                }
                            };
                            
                            // Override XMLHttpRequest to prevent aeon.dll calls
                            const originalXHROpen = XMLHttpRequest.prototype.open;
                            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                                if (url && url.toString().includes('aeon.dll')) {
                                    console.log('Blocked XHR request to:', url);
                                    // Store the URL for later response handling
                                    this._interceptedUrl = url;
                                    // Change to a dummy URL that will return empty
                                    url = 'data:application/json,{}';
                                }
                                return originalXHROpen.call(this, method, url, ...args);
                            };
                            
                            // Override XHR send to provide appropriate mock data
                            const originalXHRSend = XMLHttpRequest.prototype.send;
                            XMLHttpRequest.prototype.send = function(...args) {
                                if (this._interceptedUrl) {
                                    // Determine which mock response to use
                                    let mockData = {};
                                    for (const key in mockResponses) {
                                        if (this._interceptedUrl.includes(key)) {
                                            mockData = mockResponses[key];
                                            break;
                                        }
                                    }
                                    
                                    // Set up mock response
                                    const xhr = this;
                                    setTimeout(() => {
                                        Object.defineProperty(xhr, 'readyState', { value: 4 });
                                        Object.defineProperty(xhr, 'status', { value: 200 });
                                        Object.defineProperty(xhr, 'responseText', { value: JSON.stringify(mockData) });
                                        Object.defineProperty(xhr, 'response', { value: JSON.stringify(mockData) });
                                        
                                        if (xhr.onreadystatechange) {
                                            xhr.onreadystatechange();
                                        }
                                        if (xhr.onload) {
                                            xhr.onload();
                                        }
                                    }, 10);
                                    
                                    return;
                                }
                                return originalXHRSend.apply(this, args);
                            };
                            
                            // Override fetch before it's used
                            const originalFetch = window.fetch;
                            window.fetch = function(url, ...args) {
                                if (url && url.toString().includes('aeon.dll')) {
                                    console.log('Blocked fetch request to:', url);
                                    
                                    // Determine which mock response to use
                                    let mockData = {};
                                    for (const key in mockResponses) {
                                        if (url.toString().includes(key)) {
                                            mockData = mockResponses[key];
                                            break;
                                        }
                                    }
                                    
                                    // Create a more complete Response object
                                    const mockResponse = new Response(JSON.stringify(mockData), {
                                        status: 200,
                                        statusText: 'OK',
                                        headers: { 
                                            'Content-Type': 'application/json',
                                            'Content-Length': JSON.stringify(mockData).length.toString()
                                        }
                                    });
                                    
                                    // Ensure the response has expected methods
                                    const originalJson = mockResponse.json.bind(mockResponse);
                                    mockResponse.json = function() {
                                        return originalJson().catch(() => mockData);
                                    };
                                    
                                    const originalText = mockResponse.text.bind(mockResponse);
                                    mockResponse.text = function() {
                                        return originalText().catch(() => JSON.stringify(mockData));
                                    };
                                    
                                    return Promise.resolve(mockResponse);
                                }
                                return originalFetch.call(this, url, ...args);
                            };
                        })();
                    </script>
                </head>
                <body>
                    <div id="preview-controls">
                        ${this.getControlsHtml()}
                    </div>
                    <div id="preview-frame">
                        <div id="preview-wrapper">
                            <div id="preview-content" style="width: ${this.viewportManager.getCurrentDevice().width}px;">
                                ${html}
                            </div>
                        </div>
                    </div>
                    
                    ${this.getErrorsHtml(processed)}
                    
                    <script nonce="${nonce}">
                        window.tagMap = ${JSON.stringify(Array.from(processed.context.tagMap.entries()))};
                        window.errors = ${JSON.stringify(processed.context.errors)};
                    </script>
                    <script nonce="${nonce}" src="${this.getResourceUri('media/scripts/preview.js')}"></script>
                    <script nonce="${nonce}">
                        // Intercept AJAX calls that won't work in preview - run after all scripts are loaded
                        window.addEventListener('load', function() {
                            // Store the original jQuery ajax function
                            if (window.$ && window.$.ajax) {
                                const originalAjax = window.$.ajax;
                                window.$.ajax = function(options) {
                                    // Check if this is a call to aeon.dll
                                    if (typeof options === 'string' && options.includes('aeon.dll')) {
                                        console.log('Intercepted AJAX call to:', options);
                                        // Return a mock promise
                                        return $.Deferred().resolve({}).promise();
                                    } else if (options && options.url && options.url.includes('aeon.dll')) {
                                        console.log('Intercepted AJAX call to:', options.url);
                                        // Return a mock promise
                                        return $.Deferred().resolve({}).promise();
                                    }
                                    // Otherwise, call the original function
                                    return originalAjax.apply(this, arguments);
                                };
                            }
                            
                            // Also intercept fetch API
                            const originalFetch = window.fetch;
                            window.fetch = function(url, options) {
                                if (url && url.toString().includes('aeon.dll')) {
                                    console.log('Intercepted fetch call to:', url);
                                    // Return a mock response
                                    return Promise.resolve(new Response('{}', {
                                        status: 200,
                                        headers: { 'Content-Type': 'application/json' }
                                    }));
                                }
                                return originalFetch.apply(this, arguments);
                            };
                            
                            // Prevent form submissions
                            document.addEventListener('submit', function(e) {
                                if (e.target && e.target.action && e.target.action.includes('aeon.dll')) {
                                    e.preventDefault();
                                    console.log('Prevented form submission to:', e.target.action);
                                }
                            });
                        });
                    </script>
                </body>
            </html>
        `;
    }
    
    private getControlsHtml(): string {
        const currentMode = this.tagVisualizer.getMode();
        const currentDevice = this.viewportManager.getCurrentDevice();
        
        return `
            <div class="preview-toolbar">
                <button id="refresh-btn" class="preview-control">
                    <span class="codicon codicon-refresh"></span> Refresh
                </button>
                <select id="device-select" class="preview-control">
                    <option value="Desktop (1920x1080)" ${currentDevice.name === 'Desktop (1920x1080)' ? 'selected' : ''}>Desktop (1920x1080)</option>
                    <option value="Desktop (1366x768)" ${currentDevice.name === 'Desktop (1366x768)' ? 'selected' : ''}>Desktop (1366x768)</option>
                    <option value="iPad Pro 12.9&quot;" ${currentDevice.name === 'iPad Pro 12.9"' ? 'selected' : ''}>iPad Pro</option>
                    <option value="iPad Air" ${currentDevice.name === 'iPad Air' ? 'selected' : ''}>iPad Air</option>
                    <option value="iPhone 14 Pro" ${currentDevice.name === 'iPhone 14 Pro' ? 'selected' : ''}>iPhone 14 Pro</option>
                    <option value="iPhone SE" ${currentDevice.name === 'iPhone SE' ? 'selected' : ''}>iPhone SE</option>
                    <option value="Custom" ${currentDevice.name === 'Custom' ? 'selected' : ''}>Custom Size</option>
                </select>
                <select id="tag-viz-select" class="preview-control">
                    <option value="none" ${currentMode === 'none' ? 'selected' : ''}>No Tag Overlay</option>
                    <option value="highlight" ${currentMode === 'highlight' ? 'selected' : ''}>Highlight Tags</option>
                    <option value="labels" ${currentMode === 'labels' ? 'selected' : ''}>Show Tag Labels</option>
                </select>
                <button id="mock-data-btn" class="preview-control">
                    <span class="codicon codicon-edit"></span> Mock Data
                </button>
                <select id="zoom-select" class="preview-control">
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1" selected>100%</option>
                    <option value="1.25">125%</option>
                    <option value="1.5">150%</option>
                </select>
            </div>
        `;
    }
    
    private getErrorsHtml(result: ProcessingResult): string {
        if (result.context.errors.length === 0) {
            return '';
        }
        
        // Group errors by type
        const includeErrors = result.context.errors.filter(e => e.tag === 'INCLUDE');
        const otherErrors = result.context.errors.filter(e => e.tag !== 'INCLUDE');
        
        let errorContent = '';
        
        if (includeErrors.length > 0) {
            errorContent += `<p><strong>Missing Include Files (${includeErrors.length}):</strong></p>`;
            errorContent += '<ul>';
            includeErrors.forEach(error => {
                const filename = error.message.match(/File not found: (.+)/)?.[1] || error.message;
                errorContent += `<li>${filename}</li>`;
            });
            errorContent += '</ul>';
            errorContent += '<p class="error-tip">💡 Tip: Create these files or adjust include paths in settings.</p>';
        }
        
        if (otherErrors.length > 0) {
            errorContent += '<p><strong>Other Errors:</strong></p>';
            errorContent += '<ul>';
            otherErrors.forEach(error => {
                errorContent += `<li><strong>${error.tag}:</strong> ${error.message}</li>`;
            });
            errorContent += '</ul>';
        }
        
        return `
            <div id="preview-errors">
                <button class="error-close" id="error-close-btn">×</button>
                <h3>Preview Issues</h3>
                ${errorContent}
            </div>
        `;
    }
    
    private getResourceUri(relativePath: string): vscode.Uri {
        return this.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, relativePath)
        );
    }
    
    private processResourcePlaceholders(html: string): string {
        // Get the directory of the current document
        const documentDir = path.dirname(this.document.uri.fsPath);
        
        // Process CSS resources
        html = html.replace(/\${CSS_RESOURCE:([^}]+)}/g, (match, resourcePath) => {
            try {
                const absolutePath = this.resolveResourcePath(resourcePath, documentDir);
                const webviewUri = this.panel.webview.asWebviewUri(vscode.Uri.file(absolutePath));
                console.log(`CSS Resource: ${resourcePath} -> ${absolutePath} -> ${webviewUri}`);
                return webviewUri.toString();
            } catch (error) {
                console.error(`Failed to process CSS resource: ${resourcePath}`, error);
                return match; // Return original if processing fails
            }
        });
        
        // Process JS resources
        html = html.replace(/\${JS_RESOURCE:([^}]+)}/g, (match, resourcePath) => {
            try {
                const absolutePath = this.resolveResourcePath(resourcePath, documentDir);
                const webviewUri = this.panel.webview.asWebviewUri(vscode.Uri.file(absolutePath));
                console.log(`JS Resource: ${resourcePath} -> ${absolutePath} -> ${webviewUri}`);
                return webviewUri.toString();
            } catch (error) {
                console.error(`Failed to process JS resource: ${resourcePath}`, error);
                return match;
            }
        });
        
        // Process image resources
        html = html.replace(/\${IMG_RESOURCE:([^}]+)}/g, (match, resourcePath) => {
            try {
                const absolutePath = this.resolveResourcePath(resourcePath, documentDir);
                const webviewUri = this.panel.webview.asWebviewUri(vscode.Uri.file(absolutePath));
                console.log(`Image Resource: ${resourcePath} -> ${absolutePath} -> ${webviewUri}`);
                return webviewUri.toString();
            } catch (error) {
                console.error(`Failed to process image resource: ${resourcePath}`, error);
                return match;
            }
        });
        
        return html;
    }
    
    private resolveResourcePath(resourcePath: string, documentDir: string): string {
        // Remove any leading ./ or ../
        const cleanPath = resourcePath.replace(/^\.\//, '');
        
        // If it's an absolute path, use it as is
        if (path.isAbsolute(cleanPath)) {
            return cleanPath;
        }
        
        // Otherwise, resolve it relative to the document directory
        return path.join(documentDir, cleanPath);
    }
    
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    
    public reveal(): void {
        this.panel.reveal(vscode.ViewColumn.Beside);
    }
    
    public async setDevice(device: string): Promise<void> {
        await this.viewportManager.setDevice(device);
        // Don't update the entire preview, just send the viewport change
        // await this.update();
    }
    
    public async setTagVisualization(mode: 'none' | 'highlight' | 'labels'): Promise<void> {
        this.tagVisualizer.setMode(mode);
        await this.update();
    }
    
    public async showMockDataEditor(): Promise<void> {
        await this.panel.webview.postMessage({
            command: 'showMockDataEditor'
        });
    }
    
    private async highlightSourceTag(tagId: string): Promise<void> {
        // Find tag position in source document and highlight it
        // This would integrate with the source editor
    }
    
    private async openIncludeFile(filename: string): Promise<void> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(this.document.uri);
        if (!workspaceFolder) return;
        
        const includeUri = vscode.Uri.joinPath(workspaceFolder.uri, filename);
        try {
            const doc = await vscode.workspace.openTextDocument(includeUri);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Could not open include file: ${filename}`);
        }
    }
    
    public onDidDispose(callback: () => void): vscode.Disposable {
        return this.panel.onDidDispose(callback);
    }
    
    public dispose(): void {
        // Clean up resources
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
        
        this.panel.dispose();
    }
}