import * as diff from 'diff';
import { JSDOM } from 'jsdom';

// Type helpers for DOM elements
type DOMDocument = Document;
type DOMElement = Element;

export interface DiffResult {
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    content: string;
    lineNumbers?: { old?: number; new?: number };
}

export interface VisualDiff {
    html: DiffResult[];
    css: DiffResult[];
    structure: StructuralDiff[];
}

export interface StructuralDiff {
    type: 'element-added' | 'element-removed' | 'element-moved' | 'attribute-changed';
    element: string;
    details: string;
}

export class DiffEngine {
    
    /**
     * Generate a unified diff between two HTML files
     */
    generateUnifiedDiff(oldContent: string, newContent: string): string {
        return diff.createPatch('page.html', oldContent, newContent, 'Old Version', 'New Version');
    }

    /**
     * Generate a side-by-side diff for visual comparison
     */
    generateSideBySideDiff(oldContent: string, newContent: string): { old: string; new: string; changes: DiffResult[] } {
        const changes = diff.diffLines(oldContent, newContent);
        const oldLines: string[] = [];
        const newLines: string[] = [];
        const diffResults: DiffResult[] = [];

        let oldLineNum = 1;
        let newLineNum = 1;

        changes.forEach(part => {
            const lines = part.value.split('\n').filter(line => line !== '');
            
            if (part.added) {
                // Added lines
                lines.forEach(line => {
                    newLines.push(line);
                    diffResults.push({
                        type: 'added',
                        content: line,
                        lineNumbers: { new: newLineNum++ }
                    });
                });
            } else if (part.removed) {
                // Removed lines
                lines.forEach(line => {
                    oldLines.push(line);
                    diffResults.push({
                        type: 'removed',
                        content: line,
                        lineNumbers: { old: oldLineNum++ }
                    });
                });
            } else {
                // Unchanged lines
                lines.forEach(line => {
                    oldLines.push(line);
                    newLines.push(line);
                    diffResults.push({
                        type: 'unchanged',
                        content: line,
                        lineNumbers: { old: oldLineNum++, new: newLineNum++ }
                    });
                });
            }
        });

        return {
            old: oldLines.join('\n'),
            new: newLines.join('\n'),
            changes: diffResults
        };
    }

    /**
     * Generate a visual diff highlighting structural changes
     */
    generateVisualDiff(oldContent: string, newContent: string): VisualDiff {
        const oldDOM = new JSDOM(oldContent);
        const newDOM = new JSDOM(newContent);
        
        const oldDoc = oldDOM.window.document;
        const newDoc = newDOM.window.document;

        return {
            html: this.compareHTML(oldContent, newContent),
            css: this.compareCSS(oldDoc, newDoc),
            structure: this.compareStructure(oldDoc, newDoc)
        };
    }

    private compareHTML(oldContent: string, newContent: string): DiffResult[] {
        const results: DiffResult[] = [];
        const changes = diff.diffLines(oldContent, newContent);

        changes.forEach(part => {
            if (part.added) {
                results.push({ type: 'added', content: part.value });
            } else if (part.removed) {
                results.push({ type: 'removed', content: part.value });
            } else {
                results.push({ type: 'unchanged', content: part.value });
            }
        });

        return results;
    }

    private compareCSS(oldDoc: DOMDocument, newDoc: DOMDocument): DiffResult[] {
        const results: DiffResult[] = [];
        
        // Extract inline styles
        const oldStyles = this.extractStyles(oldDoc);
        const newStyles = this.extractStyles(newDoc);

        // Compare styles
        oldStyles.forEach((content, selector) => {
            const newContent = newStyles.get(selector);
            if (!newContent) {
                results.push({ type: 'removed', content: `${selector} { ${content} }` });
            } else if (content !== newContent) {
                results.push({ type: 'modified', content: `${selector} { ${newContent} }` });
            }
        });

        newStyles.forEach((content, selector) => {
            if (!oldStyles.has(selector)) {
                results.push({ type: 'added', content: `${selector} { ${content} }` });
            }
        });

        return results;
    }

    private extractStyles(doc: DOMDocument): Map<string, string> {
        const styles = new Map<string, string>();
        
        // Extract from style tags
        const styleTags = doc.querySelectorAll('style');
        styleTags.forEach((tag: HTMLStyleElement) => {
            const css = tag.textContent || '';
            // Simple CSS parser
            const ruleRegex = /([^{]+)\{([^}]+)\}/g;
            let match;
            while ((match = ruleRegex.exec(css)) !== null) {
                styles.set(match[1].trim(), match[2].trim());
            }
        });

        // Extract inline styles
        const elementsWithStyle = doc.querySelectorAll('[style]');
        elementsWithStyle.forEach((element: DOMElement, index: number) => {
            const style = element.getAttribute('style');
            if (style) {
                const selector = `${element.tagName.toLowerCase()}[style]:nth-of-type(${index + 1})`;
                styles.set(selector, style);
            }
        });

        return styles;
    }

    private compareStructure(oldDoc: DOMDocument, newDoc: DOMDocument): StructuralDiff[] {
        const diffs: StructuralDiff[] = [];
        
        // Compare form structure
        const oldFields = this.extractFieldMap(oldDoc);
        const newFields = this.extractFieldMap(newDoc);

        // Find removed fields
        oldFields.forEach((oldField, name) => {
            if (!newFields.has(name)) {
                diffs.push({
                    type: 'element-removed',
                    element: oldField.tagName,
                    details: `Field "${name}" was removed`
                });
            }
        });

        // Find added fields
        newFields.forEach((newField, name) => {
            if (!oldFields.has(name)) {
                diffs.push({
                    type: 'element-added',
                    element: newField.tagName,
                    details: `Field "${name}" was added`
                });
            }
        });

        // Compare field positions
        oldFields.forEach((oldField, name) => {
            const newField = newFields.get(name);
            if (newField) {
                const oldIndex = this.getElementIndex(oldField);
                const newIndex = this.getElementIndex(newField);
                
                if (oldIndex !== newIndex) {
                    diffs.push({
                        type: 'element-moved',
                        element: oldField.tagName,
                        details: `Field "${name}" moved from position ${oldIndex} to ${newIndex}`
                    });
                }

                // Compare attributes
                const attrDiffs = this.compareAttributes(oldField, newField);
                attrDiffs.forEach(diff => diffs.push(diff));
            }
        });

        return diffs;
    }

    private extractFieldMap(doc: DOMDocument): Map<string, DOMElement> {
        const fields = new Map<string, DOMElement>();
        const inputs = doc.querySelectorAll('input, select, textarea');
        
        inputs.forEach((input: DOMElement) => {
            const name = input.getAttribute('name');
            if (name && name !== 'AeonForm') {
                fields.set(name, input);
            }
        });

        return fields;
    }

    private getElementIndex(element: DOMElement): number {
        let index = 0;
        let sibling = element.previousElementSibling;
        
        while (sibling) {
            if (sibling.tagName === element.tagName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }
        
        return index;
    }

    private compareAttributes(oldElement: DOMElement, newElement: DOMElement): StructuralDiff[] {
        const diffs: StructuralDiff[] = [];
        const name = oldElement.getAttribute('name') || 'unknown';

        // Get all attributes
        const oldAttrs = new Map<string, string>();
        const newAttrs = new Map<string, string>();

        Array.from(oldElement.attributes).forEach((attr: Attr) => {
            oldAttrs.set(attr.name, attr.value);
        });

        Array.from(newElement.attributes).forEach((attr: Attr) => {
            newAttrs.set(attr.name, attr.value);
        });

        // Compare attributes
        oldAttrs.forEach((value, attrName) => {
            const newValue = newAttrs.get(attrName);
            if (newValue === undefined) {
                diffs.push({
                    type: 'attribute-changed',
                    element: oldElement.tagName,
                    details: `Field "${name}": attribute "${attrName}" was removed`
                });
            } else if (value !== newValue) {
                diffs.push({
                    type: 'attribute-changed',
                    element: oldElement.tagName,
                    details: `Field "${name}": attribute "${attrName}" changed from "${value}" to "${newValue}"`
                });
            }
        });

        newAttrs.forEach((value, attrName) => {
            if (!oldAttrs.has(attrName)) {
                diffs.push({
                    type: 'attribute-changed',
                    element: newElement.tagName,
                    details: `Field "${name}": attribute "${attrName}" was added with value "${value}"`
                });
            }
        });

        return diffs;
    }

    /**
     * Generate HTML for diff visualization
     */
    generateDiffHTML(oldContent: string, newContent: string): string {
        const changes = diff.diffLines(oldContent, newContent);
        let html = '<div class="diff-container">';

        changes.forEach(part => {
            const className = part.added ? 'diff-added' : part.removed ? 'diff-removed' : 'diff-unchanged';
            const prefix = part.added ? '+' : part.removed ? '-' : ' ';
            const lines = part.value.split('\n');
            
            lines.forEach(line => {
                if (line) {
                    html += `<div class="${className}"><span class="diff-prefix">${prefix}</span>${this.escapeHtml(line)}</div>`;
                }
            });
        });

        html += '</div>';
        return html;
    }

    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        return text.replace(/[&<>"'/]/g, (s) => map[s]);
    }

    /**
     * Generate CSS for diff visualization
     */
    generateDiffCSS(): string {
        return `
.diff-container {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    line-height: 1.4;
    background: #f8f8f8;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    overflow-x: auto;
}

.diff-added {
    background-color: #e6ffed;
    color: #24292e;
}

.diff-removed {
    background-color: #ffeef0;
    color: #24292e;
}

.diff-unchanged {
    color: #586069;
}

.diff-prefix {
    display: inline-block;
    width: 20px;
    text-align: center;
    color: #959da5;
    user-select: none;
}

.diff-added .diff-prefix {
    color: #28a745;
}

.diff-removed .diff-prefix {
    color: #d73a49;
}
        `;
    }
}