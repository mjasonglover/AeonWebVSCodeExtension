import * as vscode from 'vscode';
import { JSDOM } from 'jsdom';

// Type helpers
type DOMDocument = Document;
type DOMElement = Element;
import { 
    PageAnalysis, 
    ContentChange, 
    StructuralChange, 
    ScriptChange,
    PageData 
} from '../types/migration.types';
import { TemplateLoader } from './templateLoader';

export class PageAnalyzer {
    private templateLoader: TemplateLoader;

    constructor(templateLoader: TemplateLoader) {
        this.templateLoader = templateLoader;
    }

    async analyzePage(oldPageContent: string, templateFileName: string): Promise<PageAnalysis> {
        const newPageContent = await this.templateLoader.loadTemplate(templateFileName);
        
        const oldDOM = new JSDOM(oldPageContent);
        const newDOM = new JSDOM(newPageContent);
        
        const oldDoc = oldDOM.window.document;
        const newDoc = newDOM.window.document;

        // Detect Aeon version from old page
        const aeonVersion = this.detectAeonVersion(oldPageContent);

        // Analyze different types of customizations
        const contentChanges = await this.detectContentChanges(oldDoc, newDoc);
        const structuralChanges = await this.detectStructuralChanges(oldDoc, newDoc);
        const scriptChanges = await this.detectScriptChanges(oldDoc, newDoc);
        
        return {
            originalPage: templateFileName,
            customizations: {
                branding: {} as any, // Will be filled by branding processor
                content: contentChanges,
                structure: structuralChanges,
                javascript: scriptChanges
            },
            aeonVersion,
            detectedFeatures: this.detectFeatures(oldDoc)
        };
    }

    private detectAeonVersion(content: string): string {
        // Look for version indicators in the HTML
        const versionPatterns = [
            /Aeon\s+v?(\d+\.\d+(?:\.\d+)?)/i,
            /Version:\s*(\d+\.\d+(?:\.\d+)?)/i,
            /<!--\s*Aeon\s+(\d+\.\d+(?:\.\d+)?)\s*-->/i
        ];

        for (const pattern of versionPatterns) {
            const match = content.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // Check for version-specific features to infer version
        if (content.includes('CustomDropDown')) {
            return '5.0+';
        }
        
        return 'Unknown';
    }

    private async detectContentChanges(oldDoc: DOMDocument, newDoc: DOMDocument): Promise<ContentChange[]> {
        const changes: ContentChange[] = [];
        
        // Compare page titles (h1)
        const oldH1 = oldDoc.querySelector('h1');
        const newH1 = newDoc.querySelector('h1');
        if (oldH1 && newH1 && oldH1.textContent !== newH1.textContent) {
            changes.push({
                type: 'text',
                location: 'page-title',
                oldValue: oldH1.textContent?.trim() || '',
                newValue: newH1.textContent?.trim() || '',
                elementPath: 'h1'
            });
        }
        
        // Compare ALL headings (h2-h6)
        for (let level = 2; level <= 6; level++) {
            const oldHeadings = oldDoc.querySelectorAll(`h${level}`);
            oldHeadings.forEach((oldHeading: DOMElement, index) => {
                const text = oldHeading.textContent?.trim() || '';
                if (text) {
                    changes.push({
                        type: 'heading',
                        location: `h${level}-${index}`,
                        oldValue: text,
                        newValue: '[Check if exists in new template]',
                        elementPath: this.getElementPath(oldHeading)
                    });
                }
            });
        }
        
        // Compare paragraphs with substantial content
        const oldParagraphs = oldDoc.querySelectorAll('p');
        oldParagraphs.forEach((oldP: DOMElement, index) => {
            const text = oldP.textContent?.trim() || '';
            // Only track paragraphs with meaningful content (more than 30 chars)
            if (text.length > 30 && !text.startsWith('<!--')) {
                changes.push({
                    type: 'paragraph',
                    location: `paragraph-${index}`,
                    oldValue: text,
                    newValue: '[Check if exists in new template]',
                    elementPath: this.getElementPath(oldP)
                });
            }
        });
        
        // Compare list items (ul/ol)
        const oldLists = oldDoc.querySelectorAll('ul, ol');
        oldLists.forEach((oldList: DOMElement, listIndex) => {
            const items = oldList.querySelectorAll('li');
            const listContent: string[] = [];
            items.forEach((item: DOMElement) => {
                const text = item.textContent?.trim() || '';
                if (text) {
                    listContent.push(text);
                }
            });
            
            if (listContent.length > 0) {
                changes.push({
                    type: 'list',
                    location: `list-${listIndex}`,
                    oldValue: listContent.join('\n• '),
                    newValue: '[Check if exists in new template]',
                    elementPath: this.getElementPath(oldList)
                });
            }
        });
        
        // Compare table cells with content
        const oldTables = oldDoc.querySelectorAll('table');
        oldTables.forEach((oldTable: DOMElement, tableIndex) => {
            // Get table headers if any
            const headers = Array.from(oldTable.querySelectorAll('th')).map((th: DOMElement) => th.textContent?.trim() || '');
            
            // Get table data cells
            const rows = oldTable.querySelectorAll('tr');
            rows.forEach((row: DOMElement, rowIndex) => {
                const cells = row.querySelectorAll('td');
                cells.forEach((cell: DOMElement, cellIndex) => {
                    const text = cell.textContent?.trim() || '';
                    if (text && text.length > 20 && !text.includes('<!--')) {
                        const header = headers[cellIndex] || '';
                        changes.push({
                            type: 'table-cell',
                            location: `table-${tableIndex}-row-${rowIndex}-cell-${cellIndex}`,
                            oldValue: header ? `${header}: ${text}` : text,
                            newValue: '[Check if exists in new template]',
                            elementPath: this.getElementPath(cell)
                        });
                    }
                });
            });
        });
        
        // Compare divs with substantial content
        const contentDivs = oldDoc.querySelectorAll('div');
        contentDivs.forEach((div: DOMElement, index) => {
            // Skip if it has child block elements (likely a container)
            if (div.querySelector('div, p, table, ul, ol, h1, h2, h3, h4, h5, h6')) {
                return;
            }
            
            const text = div.textContent?.trim() || '';
            // Only track divs with substantial text content
            if (text.length > 50 && !text.includes('<!--')) {
                const id = div.id || div.className || `content-div-${index}`;
                changes.push({
                    type: 'content-block',
                    location: id,
                    oldValue: text,
                    newValue: '[Check if exists in new template]',
                    elementPath: this.getElementPath(div)
                });
            }
        });
        
        // Compare blockquotes
        const oldBlockquotes = oldDoc.querySelectorAll('blockquote');
        oldBlockquotes.forEach((quote: DOMElement, index) => {
            const text = quote.textContent?.trim() || '';
            if (text) {
                changes.push({
                    type: 'blockquote',
                    location: `blockquote-${index}`,
                    oldValue: text,
                    newValue: '[Check if exists in new template]',
                    elementPath: this.getElementPath(quote)
                });
            }
        });
        
        // Compare form labels (keep existing logic)
        const oldLabels = oldDoc.querySelectorAll('label');
        const newLabels = newDoc.querySelectorAll('label');
        
        oldLabels.forEach((oldLabel: DOMElement) => {
            const forAttr = oldLabel.getAttribute('for');
            if (!forAttr) return;
            
            const newLabel = Array.from(newLabels).find((l: DOMElement) => l.getAttribute('for') === forAttr);
            if (newLabel && oldLabel.textContent !== newLabel.textContent) {
                changes.push({
                    type: 'label',
                    location: forAttr,
                    oldValue: oldLabel.textContent?.trim() || '',
                    newValue: newLabel.textContent?.trim() || '',
                    elementPath: this.getElementPath(oldLabel)
                });
            }
        });

        // Compare help text and informational elements
        const helpSelectors = '.small-notes, .help-text, .field-help, .info, .note, .instructions, .description';
        const oldHelpTexts = oldDoc.querySelectorAll(helpSelectors);
        
        oldHelpTexts.forEach((oldHelp: DOMElement, index) => {
            const text = oldHelp.textContent?.trim() || '';
            if (text && text.length > 20) {
                const id = oldHelp.id || oldHelp.className || `help-${index}`;
                changes.push({
                    type: 'help',
                    location: id,
                    oldValue: text,
                    newValue: '[Check if exists in new template]',
                    elementPath: this.getElementPath(oldHelp)
                });
            }
        });

        return changes;
    }

    private async detectStructuralChanges(oldDoc: DOMDocument, newDoc: DOMDocument): Promise<StructuralChange[]> {
        const changes: StructuralChange[] = [];
        
        // Detect field movements and additions/removals
        const oldFields = this.extractFormFields(oldDoc);
        const newFields = this.extractFormFields(newDoc);
        
        // Check for removed fields
        oldFields.forEach((oldField, fieldName) => {
            if (!newFields.has(fieldName)) {
                changes.push({
                    type: 'field-removed',
                    fieldId: fieldName,
                    fieldName: fieldName,
                    oldPosition: oldField.position
                });
            }
        });

        // Check for added fields
        newFields.forEach((newField, fieldName) => {
            if (!oldFields.has(fieldName)) {
                changes.push({
                    type: 'field-added',
                    fieldId: fieldName,
                    fieldName: fieldName,
                    newPosition: newField.position
                });
            }
        });

        // Check for moved fields
        oldFields.forEach((oldField, fieldName) => {
            const newField = newFields.get(fieldName);
            if (newField && !this.isSamePosition(oldField.position, newField.position)) {
                changes.push({
                    type: 'field-moved',
                    fieldId: fieldName,
                    fieldName: fieldName,
                    oldPosition: oldField.position,
                    newPosition: newField.position
                });
            }
        });

        return changes;
    }

    private extractFormFields(doc: DOMDocument): Map<string, { element: DOMElement; position: any }> {
        const fields = new Map();
        const formElements = doc.querySelectorAll('input, select, textarea');
        
        formElements.forEach((element: DOMElement, index: number) => {
            const name = element.getAttribute('name');
            if (!name || name === 'AeonForm') return;
            
            const section = this.findParentSection(element);
            fields.set(name, {
                element,
                position: {
                    section: section?.textContent?.trim() || 'main',
                    index: index,
                    row: this.findParentRow(element)
                }
            });
        });
        
        return fields;
    }

    private findParentSection(element: DOMElement): DOMElement | null {
        let parent = element.parentElement;
        while (parent) {
            if (parent.tagName === 'SECTION' || parent.querySelector('h3, h2')) {
                return parent.querySelector('h3, h2') || parent;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    private findParentRow(element: DOMElement): number {
        let parent = element.parentElement;
        let rowIndex = 0;
        
        while (parent) {
            if (parent.classList.contains('form-row') || parent.classList.contains('row')) {
                const siblings = Array.from(parent.parentElement?.children || []);
                rowIndex = siblings.indexOf(parent);
                break;
            }
            parent = parent.parentElement;
        }
        
        return rowIndex;
    }

    private isSamePosition(pos1: any, pos2: any): boolean {
        return pos1.section === pos2.section && pos1.index === pos2.index;
    }

    private async detectScriptChanges(oldDoc: DOMDocument, newDoc: DOMDocument): Promise<ScriptChange[]> {
        const changes: ScriptChange[] = [];
        
        // Find all script tags in old document
        const oldScripts = oldDoc.querySelectorAll('script');
        const newScripts = Array.from(newDoc.querySelectorAll('script'));
        
        oldScripts.forEach((oldScript: HTMLScriptElement) => {
            const src = oldScript.getAttribute('src');
            
            if (src) {
                // External script
                const exists = newScripts.some((s: HTMLScriptElement) => s.getAttribute('src') === src);
                if (!exists) {
                    changes.push({
                        type: 'external',
                        content: src,
                        location: 'head/body',
                        purpose: this.analyzeScriptPurpose(src, '')
                    });
                }
            } else {
                // Inline script
                const content = oldScript.textContent || '';
                const exists = newScripts.some((s: HTMLScriptElement) => s.textContent?.trim() === content.trim());
                
                if (!exists && content.trim()) {
                    changes.push({
                        type: 'inline',
                        content: content,
                        location: oldScript.parentElement?.tagName || 'unknown',
                        purpose: this.analyzeScriptPurpose('', content),
                        suggestedRewrite: this.suggestModernRewrite(content)
                    });
                }
            }
        });

        // Find event handlers
        const elementsWithHandlers = oldDoc.querySelectorAll('[onclick], [onchange], [onsubmit]');
        elementsWithHandlers.forEach((element: DOMElement) => {
            ['onclick', 'onchange', 'onsubmit'].forEach(event => {
                const handler = element.getAttribute(event);
                if (handler) {
                    changes.push({
                        type: 'event-handler',
                        content: handler,
                        location: `${element.tagName}#${element.id || 'unknown'}`,
                        purpose: this.analyzeScriptPurpose('', handler),
                        suggestedRewrite: this.suggestEventHandlerRewrite(event, handler)
                    });
                }
            });
        });

        return changes;
    }

    private analyzeScriptPurpose(src: string, content: string): string {
        // Simple heuristic analysis - in production this could use AI
        if (src.includes('analytics') || content.includes('ga(') || content.includes('gtag(')) {
            return 'Analytics tracking';
        }
        if (content.includes('validate') || content.includes('required')) {
            return 'Form validation';
        }
        if (content.includes('toggle') || content.includes('hide') || content.includes('show')) {
            return 'UI interaction/toggle';
        }
        if (content.includes('ajax') || content.includes('fetch') || content.includes('XMLHttpRequest')) {
            return 'AJAX/Dynamic content loading';
        }
        if (content.includes('cookie')) {
            return 'Cookie management';
        }
        
        return 'Custom functionality';
    }

    private suggestModernRewrite(oldScript: string): string {
        // Suggest modern alternatives to common patterns
        if (oldScript.includes('document.getElementById')) {
            return oldScript.replace(/document\.getElementById\(['"]([^'"]+)['"]\)/g, "document.querySelector('#$1')");
        }
        
        // More suggestions would be added here
        return oldScript;
    }

    private suggestEventHandlerRewrite(event: string, handler: string): string {
        // Suggest moving inline handlers to addEventListener
        return `element.addEventListener('${event.substring(2)}', function(e) { ${handler} });`;
    }

    private detectFeatures(doc: DOMDocument): string[] {
        const features: string[] = [];
        
        // Detect various Aeon features
        if (doc.querySelector('input[name="ScheduledDate"]')) {
            features.push('scheduled-retrieval');
        }
        if (doc.querySelector('.duplication-section')) {
            features.push('photoduplication');
        }
        if (doc.querySelector('[name="CustomDropDown"]')) {
            features.push('custom-dropdowns');
        }
        if (doc.querySelector('.billing-section')) {
            features.push('billing');
        }
        
        return features;
    }

    private getElementPath(element: DOMElement): string {
        const path: string[] = [];
        let current: DOMElement | null = element;
        
        while (current && current.tagName !== 'BODY') {
            const selector = current.tagName.toLowerCase();
            if (current.id) {
                path.unshift(`${selector}#${current.id}`);
                break;
            } else if (current.className) {
                path.unshift(`${selector}.${Array.from(current.classList).join('.')}`);
            } else {
                path.unshift(selector);
            }
            current = current.parentElement;
        }
        
        return path.join(' > ');
    }
}