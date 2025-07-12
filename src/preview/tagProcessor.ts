import * as vscode from 'vscode';
import * as path from 'path';
import { MockData } from '../mockData/mockDataManager';
import { TextDecoder } from 'util';

export interface ProcessingError {
    tag: string;
    message: string;
    position: number;
}

export interface TagInfo {
    type: string;
    attributes: string;
    originalText: string;
    position: { line: number; column: number };
}

export interface ProcessingContext {
    mockData: MockData;
    includedFiles: Set<string>;
    errors: ProcessingError[];
    tagMap: Map<string, TagInfo>;
    workspaceFolder?: vscode.WorkspaceFolder;
    currentDocument?: vscode.TextDocument;
}

export interface ProcessingResult {
    html: string;
    context: ProcessingContext;
    timestamp: number;
}

export abstract class TagHandler {
    abstract process(attributes: string, context: ProcessingContext): Promise<string>;
    
    protected parseAttributes(attrString: string): Map<string, string> {
        const attrs = new Map<string, string>();
        const regex = /(\w+)=["']([^"']+)["']/g;
        let match;
        
        while ((match = regex.exec(attrString)) !== null) {
            attrs.set(match[1].toLowerCase(), match[2]);
        }
        
        return attrs;
    }
    
    protected escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

class ParamTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const paramName = attrs.get('name');
        
        if (!paramName) {
            context.errors.push({
                tag: 'PARAM',
                message: 'Missing required attribute: name',
                position: 0
            });
            return '<span class="error">PARAM: Missing name attribute</span>';
        }
        
        const value = context.mockData.getField(paramName) || '';
        return `<span class="param-value" data-field="${paramName}" title="Field: ${paramName}">${this.escapeHtml(String(value))}</span>`;
    }
}

class IncludeTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const filename = attrs.get('filename');
        const type = attrs.get('type');
        
        if (type) {
            return this.processSpecialInclude(type, context);
        }
        
        if (!filename) {
            context.errors.push({
                tag: 'INCLUDE',
                message: 'Missing filename or type attribute',
                position: 0
            });
            return '<!-- INCLUDE: Missing filename or type attribute -->';
        }
        
        // Prevent circular includes
        if (context.includedFiles.has(filename)) {
            return `<!-- Circular include detected: ${filename} -->`;
        }
        
        context.includedFiles.add(filename);
        
        try {
            const content = await this.loadIncludeFile(filename, context);
            // Process tags in included content
            const processor = new TagProcessor();
            const processed = await processor.processTags(content, context);
            
            return `<div class="include-content" data-include="${filename}" title="Included from: ${filename}">${processed}</div>`;
        } catch (error) {
            context.errors.push({
                tag: 'INCLUDE',
                message: `File not found: ${filename}`,
                position: 0
            });
            return `<!-- Include file not found: ${filename} -->`;
        }
    }
    
    private async loadIncludeFile(filename: string, context: ProcessingContext): Promise<string> {
        // Get the directory of the current document
        const currentDocumentPath = context.currentDocument?.uri.fsPath;
        if (!currentDocumentPath) {
            throw new Error('No current document');
        }
        
        const currentDirectory = path.dirname(currentDocumentPath);
        
        // Search in configured include paths
        const config = vscode.workspace.getConfiguration('aeon');
        const searchPaths = config.get<string[]>('includeSearchPaths', ['.', 'includes']);
        
        for (const searchPath of searchPaths) {
            let basePath: string;
            
            if (searchPath === '.') {
                // Current directory (where the HTML file is)
                basePath = currentDirectory;
            } else if (path.isAbsolute(searchPath)) {
                // Absolute path
                basePath = searchPath;
            } else if (context.workspaceFolder) {
                // Relative to workspace
                basePath = path.join(context.workspaceFolder.uri.fsPath, searchPath);
            } else {
                // Relative to current document
                basePath = path.join(currentDirectory, searchPath);
            }
            
            const filePath = path.join(basePath, filename);
            try {
                const fileUri = vscode.Uri.file(filePath);
                const fileContent = await vscode.workspace.fs.readFile(fileUri);
                return new TextDecoder().decode(fileContent);
            } catch {
                // Continue to next search path
            }
        }
        
        throw new Error(`File not found in search paths: ${filename}`);
    }
    
    private processSpecialInclude(type: string, context: ProcessingContext): string {
        switch (type.toLowerCase()) {
            case 'detaileddoctypeinformation':
                const docType = context.mockData.getField('DocumentType') || 'Default';
                return `<div class="doc-type-info">
                    <h4>Document Type Information</h4>
                    <p>Type: ${docType}</p>
                    <p>Special handling instructions for ${docType} documents.</p>
                </div>`;
            
            case 'photoduplication':
                if (context.mockData.getField('RequestType') === 'PhotoduplicationRequest') {
                    return `<div class="photodup-info">
                        <h4>Photoduplication Options</h4>
                        <p>Format, resolution, and delivery options...</p>
                    </div>`;
                }
                return '';
            
            case 'requestbuttons':
                return `<div class="request-buttons">
                    <button type="submit" class="btn btn-primary">Submit Request</button>
                    <button type="button" class="btn btn-secondary">Cancel</button>
                </div>`;
            
            default:
                return `<!-- Unknown include type: ${type} -->`;
        }
    }
}

class StatusTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const className = attrs.get('class') || 'status';
        
        const statusMessage = context.mockData.getField('StatusMessage') || '';
        if (!statusMessage) {
            return '';
        }
        
        return `<div class="${className}">${this.escapeHtml(statusMessage)}</div>`;
    }
}

class ErrorTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const field = attrs.get('field') || attrs.get('name');
        
        if (field) {
            const errorMessages = context.mockData.getField('ErrorMessages') as Map<string, string> | undefined;
            const error = errorMessages?.get(field);
            if (error) {
                return `<span class="field-error">${this.escapeHtml(error)}</span>`;
            }
        }
        
        return '';
    }
}

class UserTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const field = attrs.get('field');
        
        if (!field) {
            context.errors.push({
                tag: 'USER',
                message: 'Missing required attribute: field',
                position: 0
            });
            return '<span class="error">USER: Missing field attribute</span>';
        }
        
        const value = context.mockData.getField(field) || '';
        return `<span class="user-field" data-field="${field}">${this.escapeHtml(String(value))}</span>`;
    }
}

class ActivityTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const field = attrs.get('field');
        
        if (!field) {
            context.errors.push({
                tag: 'ACTIVITY',
                message: 'Missing required attribute: field',
                position: 0
            });
            return '<span class="error">ACTIVITY: Missing field attribute</span>';
        }
        
        const value = context.mockData.getField(`Activity${field}`) || '';
        return `<span class="activity-field" data-field="${field}">${this.escapeHtml(String(value))}</span>`;
    }
}

class TableTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const name = attrs.get('name') || 'DefaultTable';
        const className = attrs.get('class') || 'table table-striped';
        
        // Simulate table data based on table name
        const tableData = this.getTableData(name, context);
        
        if (tableData.length === 0) {
            return '<p>No data available for this table.</p>';
        }
        
        const headers = Object.keys(tableData[0]);
        
        return `
            <table class="${className}">
                <thead>
                    <tr>
                        ${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableData.map(row => `
                        <tr>
                            ${headers.map(h => `<td>${this.escapeHtml(String(row[h]))}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    private getTableData(tableName: string, context: ProcessingContext): any[] {
        switch (tableName.toLowerCase()) {
            case 'transactions':
                return [{
                    'Transaction #': context.mockData.getField('TransactionNumber') || '12345',
                    'Title': context.mockData.getField('ItemTitle') || 'Sample Document',
                    'Status': context.mockData.getField('TransactionStatus') || 'Submitted',
                    'Date': context.mockData.getField('TransactionDate') || new Date().toLocaleDateString()
                }];
            
            case 'activities':
                return [{
                    'Activity': context.mockData.getField('ActivityName') || 'Reading Room',
                    'Type': context.mockData.getField('ActivityType') || 'Research',
                    'Date': context.mockData.getField('ActivityBeginDate') || new Date().toLocaleDateString()
                }];
            
            default:
                return [];
        }
    }
}

class OptionTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const name = attrs.get('name');
        const selectedValue = attrs.get('selectedvalue') || '';
        const defaultName = attrs.get('defaultname') || 'Select an option';
        const defaultValue = attrs.get('defaultvalue') || '';
        
        if (!name) {
            return '<option value="">No options available</option>';
        }
        
        const options = this.getOptions(name, context);
        
        // If a default option is specified, add it first
        let optionsHtml = '';
        if (defaultName) {
            optionsHtml += `<option value="${this.escapeHtml(defaultValue)}">${this.escapeHtml(defaultName)}</option>`;
        }
        
        // Add the rest of the options
        optionsHtml += options.map(opt => 
            `<option value="${opt.value}" ${opt.value === selectedValue ? 'selected' : ''}>${this.escapeHtml(opt.label)}</option>`
        ).join('');
        
        return optionsHtml;
    }
    
    private getOptions(optionName: string, context: ProcessingContext): Array<{value: string, label: string}> {
        // Return mock options based on option name
        switch (optionName.toLowerCase()) {
            case 'statuses':
                return [
                    { value: 'Student', label: 'Student' },
                    { value: 'Faculty', label: 'Faculty' },
                    { value: 'Staff', label: 'Staff' },
                    { value: 'Researcher', label: 'Researcher' },
                    { value: 'Other', label: 'Other' }
                ];
            
            case 'departments':
                return [
                    { value: 'History', label: 'History' },
                    { value: 'English', label: 'English' },
                    { value: 'Art History', label: 'Art History' },
                    { value: 'Music', label: 'Music' },
                    { value: 'Library Science', label: 'Library Science' },
                    { value: 'Other', label: 'Other' }
                ];
            
            case 'states':
                return [
                    { value: 'CA', label: 'California' },
                    { value: 'NY', label: 'New York' },
                    { value: 'TX', label: 'Texas' },
                    { value: 'FL', label: 'Florida' },
                    { value: 'WA', label: 'Washington' }
                    // Add more states as needed
                ];
            
            case 'countries':
                return [
                    { value: 'US', label: 'United States' },
                    { value: 'CA', label: 'Canada' },
                    { value: 'MX', label: 'Mexico' },
                    { value: 'UK', label: 'United Kingdom' },
                    { value: 'AU', label: 'Australia' }
                    // Add more countries as needed
                ];
                
            case 'format':
                return [
                    { value: 'PDF', label: 'PDF' },
                    { value: 'JPEG', label: 'JPEG' },
                    { value: 'TIFF', label: 'TIFF' }
                ];
            
            case 'deliverymethod':
                return [
                    { value: 'Email', label: 'Email' },
                    { value: 'Download', label: 'Download' },
                    { value: 'USB', label: 'USB Drive' }
                ];
            
            default:
                return [{ value: '', label: 'Select an option' }];
        }
    }
}

class ConditionalTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const test = attrs.get('test');
        
        if (!test) {
            return '<!-- CONDITIONAL: Missing test attribute -->';
        }
        
        // Simple conditional evaluation (in real implementation, this would be more sophisticated)
        const result = this.evaluateCondition(test, context);
        
        return `<div class="conditional" data-test="${test}" data-result="${result}">${result ? '<!-- Condition is true -->' : '<!-- Condition is false -->'}</div>`;
    }
    
    private evaluateCondition(test: string, context: ProcessingContext): boolean {
        // Very basic evaluation - in production this would need proper expression parsing
        if (test.includes('=')) {
            const [field, value] = test.split('=').map(s => s.trim());
            const fieldValue = context.mockData.getField(field);
            return String(fieldValue) === value.replace(/['"]/g, '');
        }
        
        return false;
    }
}

class CheckedTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const attrs = this.parseAttributes(attributes);
        const name = attrs.get('name');
        const defaultValue = attrs.get('default') === 'true';
        
        if (!name) {
            return defaultValue ? 'true' : '';
        }
        
        const fieldValue = context.mockData.getField(name);
        const isChecked = fieldValue === 'Yes' || fieldValue === true || (fieldValue === undefined && defaultValue);
        
        // Return a boolean-like string that the processor will convert to proper attribute
        return isChecked ? 'true' : '';
    }
}

class FormStateTagHandler extends TagHandler {
    async process(attributes: string, context: ProcessingContext): Promise<string> {
        const formState = context.mockData.getField('FormState') || 'Default';
        return `<input type="hidden" name="FormState" value="${formState}" />`;
    }
}

export class TagProcessor {
    private tagHandlers: Map<string, TagHandler> = new Map();
    
    constructor() {
        this.registerHandlers();
    }
    
    private registerHandlers(): void {
        this.tagHandlers = new Map([
            ['PARAM', new ParamTagHandler()],
            ['INCLUDE', new IncludeTagHandler()],
            ['STATUS', new StatusTagHandler()],
            ['ERROR', new ErrorTagHandler()],
            ['OPTION', new OptionTagHandler()],
            ['TABLE', new TableTagHandler()],
            ['CONDITIONAL', new ConditionalTagHandler()],
            ['USER', new UserTagHandler()],
            ['ACTIVITY', new ActivityTagHandler()],
            ['CHECKED', new CheckedTagHandler()],
            ['FORMSTATE', new FormStateTagHandler()],
        ]);
    }
    
    public async process(content: string, mockData: MockData, document?: vscode.TextDocument): Promise<ProcessingResult> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        const context: ProcessingContext = {
            mockData,
            includedFiles: new Set(),
            errors: [],
            tagMap: new Map(),
            workspaceFolder,
            currentDocument: document
        };
        
        // First process tags (which includes processing includes)
        const processed = await this.processTags(content, context);
        
        // Then handle external resources in the final content
        const finalHtml = this.processExternalResources(processed);
        
        return {
            html: finalHtml,
            context,
            timestamp: Date.now()
        };
    }
    
    private processExternalResources(content: string): string {
        // Process external resources to work with VS Code's webview security model
        let processed = content;
        
        // Log what we're processing
        console.log('Processing external resources...');
        
        // Process CSS files - we'll handle the URI conversion in the preview panel
        processed = processed.replace(/<link\s+([^>]*\s+)?href=["'](?!https?:\/\/|data:|vscode-webview:)([^"']+\.css)["']([^>]*)>/gi, 
            (match, prefix, resource, suffix) => {
                console.log(`Found CSS resource: ${resource}`);
                return `<link ${prefix || ''}href="\${CSS_RESOURCE:${resource}}" ${suffix || ''}>`;
            });
        
        // Process JS files
        processed = processed.replace(/<script\s+([^>]*\s+)?src=["'](?!https?:\/\/|data:|vscode-webview:)([^"']+\.js)["']([^>]*?)><\/script>/gi, 
            (match, prefix, resource, suffix) => {
                console.log(`Found JS resource: ${resource}`);
                return `<script ${prefix || ''}src="\${JS_RESOURCE:${resource}}" ${suffix || ''}></script>`;
            });
        
        // Process image sources
        processed = processed.replace(/<img\s+([^>]*\s+)?src=["'](?!https?:\/\/|data:|vscode-webview:)([^"']+)["']([^>]*)>/gi, 
            (match, prefix, resource, suffix) => {
                console.log(`Found image resource: ${resource}`);
                return `<img ${prefix || ''}src="\${IMG_RESOURCE:${resource}}" ${suffix || ''}>`;
            });
        
        return processed;
    }
    
    public async processTags(content: string, context: ProcessingContext): Promise<string> {
        // First, process nested tags from innermost to outermost
        let processed = content;
        let hasChanges = true;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops
        
        while (hasChanges && iterations < maxIterations) {
            hasChanges = false;
            iterations++;
            
            // Find all tags in the current content
            const tagMatches: Array<{match: RegExpExecArray, start: number, end: number}> = [];
            const tagRegex = /<#(\w+)([^>]*)>/g;
            let match;
            
            while ((match = tagRegex.exec(processed)) !== null) {
                tagMatches.push({
                    match: match,
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
            
            // Process tags in reverse order (innermost first)
            const replacements: Array<{start: number, end: number, replacement: string}> = [];
            
            for (let i = tagMatches.length - 1; i >= 0; i--) {
                const tagMatch = tagMatches[i];
                const tagName = tagMatch.match[1].toUpperCase();
                const attributes = tagMatch.match[2];
                
                // Check the context of this tag
                const tagContext = this.getTagContext(processed, tagMatch.start);
                
                const handler = this.tagHandlers.get(tagName);
                if (handler) {
                    try {
                        const replacement = await handler.process(attributes, context);
                        
                        // Determine final replacement based on context
                        let finalReplacement: string;
                        
                        if (tagContext === 'textarea') {
                            // Inside textarea, we need plain text only
                            if (replacement === '') {
                                finalReplacement = '';
                            } else {
                                // Extract text content, removing all HTML
                                finalReplacement = replacement.replace(/<[^>]*>/g, '').trim();
                            }
                        } else if (tagContext === 'attribute') {
                            // Inside attributes, we need clean text or attribute values
                            if (tagName === 'CHECKED') {
                                // For CHECKED tag, we need the actual attribute syntax
                                finalReplacement = replacement ? ' checked="checked"' : '';
                            } else if (tagName === 'SELECTED') {
                                finalReplacement = replacement ? ' selected="selected"' : '';
                            } else if (replacement === '') {
                                finalReplacement = '';
                            } else {
                                // For other tags inside attributes, extract text content
                                finalReplacement = replacement.replace(/<[^>]*>/g, '').trim();
                            }
                        } else {
                            // Normal context - wrap with span for visualization
                            finalReplacement = `<span class="aeon-tag" data-tag="${tagName}">${replacement}</span>`;
                        }
                        
                        replacements.push({
                            start: tagMatch.start,
                            end: tagMatch.end,
                            replacement: finalReplacement
                        });
                        
                        hasChanges = true;
                    } catch (error: any) {
                        context.errors.push({
                            tag: tagName,
                            message: error.message,
                            position: tagMatch.start
                        });
                    }
                } else {
                    // Unknown tag - remove it based on context
                    let finalReplacement = '';
                    if (tagContext === 'normal') {
                        finalReplacement = `<!-- Unknown tag: ${tagName} -->`;
                    }
                    // For textarea and attribute contexts, just remove the tag (empty string)
                    
                    replacements.push({
                        start: tagMatch.start,
                        end: tagMatch.end,
                        replacement: finalReplacement
                    });
                    hasChanges = true;
                }
            }
            
            // Apply all replacements for this iteration
            for (const replacement of replacements) {
                processed = processed.substring(0, replacement.start) + 
                           replacement.replacement + 
                           processed.substring(replacement.end);
            }
        }
        
        return processed;
    }
    
    private getTagContext(content: string, position: number): 'textarea' | 'attribute' | 'normal' {
        const beforeTag = content.substring(0, position);
        
        // Check if we're inside a textarea
        const lastTextareaOpen = beforeTag.lastIndexOf('<textarea');
        const lastTextareaClose = beforeTag.lastIndexOf('</textarea>');
        if (lastTextareaOpen > -1 && lastTextareaOpen > lastTextareaClose) {
            // We're inside a textarea if the last opening is after the last closing
            return 'textarea';
        }
        
        // Check if we're inside an HTML tag attribute
        const lastTagStart = beforeTag.lastIndexOf('<');
        if (lastTagStart === -1) return 'normal';
        
        // Get the content from the last tag opening
        const fromLastTag = beforeTag.substring(lastTagStart);
        
        // Check if we're still inside the tag (no closing > yet)
        const closingBracket = fromLastTag.indexOf('>');
        if (closingBracket === -1) {
            // We're inside a tag, but need to check if we're in an attribute value
            // Look for the pattern: attribute="..." or attribute='...'
            
            // Count quotes to determine if we're inside an attribute value
            const doubleQuotes = (fromLastTag.match(/"/g) || []).length;
            const singleQuotes = (fromLastTag.match(/'/g) || []).length;
            
            // If we have an odd number of either quote type, we're inside an attribute
            if (doubleQuotes % 2 === 1 || singleQuotes % 2 === 1) {
                return 'attribute';
            }
            
            // If we're inside a tag but not in quotes, it's still an attribute context
            // This handles cases like <input ... checked>
            return 'attribute';
        }
        
        return 'normal';
    }
    
    private isInsideAttributeOrTextarea(beforeTag: string, afterTag: string): boolean {
        // Check if we're inside a textarea by looking for the most recent textarea tag
        const lastTextareaOpen = beforeTag.lastIndexOf('<textarea');
        const lastTextareaClose = beforeTag.lastIndexOf('</textarea>');
        
        // If we found a textarea open tag and it's after any close tag, we're inside a textarea
        if (lastTextareaOpen > -1 && lastTextareaOpen > lastTextareaClose) {
            return true;
        }
        
        // Check if we're inside an HTML attribute
        const lastTagStart = beforeTag.lastIndexOf('<');
        if (lastTagStart === -1) return false;
        
        const relevantPart = beforeTag.substring(lastTagStart);
        
        // Check quotes for attributes
        const singleQuotes = (relevantPart.match(/'/g) || []).length;
        const doubleQuotes = (relevantPart.match(/"/g) || []).length;
        
        // If odd number of quotes, we're inside an attribute
        return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1);
    }
    
    private extractTextContent(html: string): string {
        // Extract just the text content from HTML
        // Remove HTML tags but keep the content
        return html.replace(/<[^>]*>/g, '').trim();
    }
}