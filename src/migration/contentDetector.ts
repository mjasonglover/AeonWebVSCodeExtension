import { ContentChange } from '../types/migration.types';

export class ContentDetector {
    
    /**
     * Detects text changes between old and new pages
     */
    detectTextChanges(oldContent: string, newContent: string): ContentChange[] {
        const changes: ContentChange[] = [];
        
        // Extract Aeon-specific content patterns
        const patterns = {
            labels: this.extractLabels,
            helpText: this.extractHelpText,
            errorMessages: this.extractErrorMessages,
            pageText: this.extractPageText
        };

        for (const [type, extractor] of Object.entries(patterns)) {
            const oldItems = extractor(oldContent);
            const newItems = extractor(newContent);
            
            // Compare extracted items
            oldItems.forEach((oldItem) => {
                const newItem = newItems.find(n => n.id === oldItem.id);
                if (newItem && oldItem.text !== newItem.text) {
                    changes.push({
                        type: type as any,
                        location: oldItem.id,
                        oldValue: oldItem.text,
                        newValue: newItem.text,
                        elementPath: oldItem.path
                    });
                }
            });
        }

        return changes;
    }

    private extractLabels(content: string): Array<{id: string, text: string, path: string}> {
        const items: Array<{id: string, text: string, path: string}> = [];
        const labelRegex = /<label\s+for="([^"]+)"[^>]*>([\s\S]*?)<\/label>/gi;
        
        let match;
        while ((match = labelRegex.exec(content)) !== null) {
            const id = match[1];
            const rawText = match[2];
            // Remove nested spans and clean up
            const text = rawText.replace(/<span[^>]*>.*?<\/span>/gi, '')
                               .replace(/<[^>]+>/g, '')
                               .trim();
            
            items.push({ id, text, path: `label[for="${id}"]` });
        }
        
        return items;
    }

    private extractHelpText(content: string): Array<{id: string, text: string, path: string}> {
        const items: Array<{id: string, text: string, path: string}> = [];
        const helpRegex = /<div\s+class="small-notes"\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi;
        
        let match;
        while ((match = helpRegex.exec(content)) !== null) {
            const id = match[1];
            const text = match[2].replace(/<[^>]+>/g, '').trim();
            items.push({ id, text, path: `.small-notes#${id}` });
        }
        
        return items;
    }

    private extractErrorMessages(content: string): Array<{id: string, text: string, path: string}> {
        const items: Array<{id: string, text: string, path: string}> = [];
        
        // Extract error messages from Aeon ERROR tags
        const errorRegex = /<#ERROR\s+name=['"]([^'"]+)['"]>/gi;
        
        let match;
        while ((match = errorRegex.exec(content)) !== null) {
            const errorName = match[1];
            // Look for associated error text
            const errorTextRegex = new RegExp(`${errorName}[^>]*>([^<]+)<`, 'i');
            const textMatch = content.match(errorTextRegex);
            
            if (textMatch) {
                items.push({
                    id: errorName,
                    text: textMatch[1].trim(),
                    path: `<#ERROR name="${errorName}">`
                });
            }
        }
        
        return items;
    }

    private extractPageText(content: string): Array<{id: string, text: string, path: string}> {
        const items: Array<{id: string, text: string, path: string}> = [];
        
        // Extract headers
        const headerRegex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
        let match;
        let headerIndex = 0;
        
        while ((match = headerRegex.exec(content)) !== null) {
            const level = match[1];
            const text = match[2].replace(/<[^>]+>/g, '').trim();
            items.push({
                id: `header-${headerIndex++}`,
                text,
                path: `h${level}`
            });
        }
        
        // Extract section descriptions
        const sectionRegex = /<div\s+class="section-description"[^>]*>([\s\S]*?)<\/div>/gi;
        let sectionIndex = 0;
        
        while ((match = sectionRegex.exec(content)) !== null) {
            const text = match[1].replace(/<[^>]+>/g, '').trim();
            items.push({
                id: `section-desc-${sectionIndex++}`,
                text,
                path: '.section-description'
            });
        }
        
        return items;
    }

    /**
     * Identifies custom CSS rules that differ from default styles
     */
    detectCustomCSS(oldContent: string): string[] {
        const customRules: string[] = [];
        
        // Extract inline styles
        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
        let match;
        
        while ((match = styleRegex.exec(oldContent)) !== null) {
            const css = match[1];
            // Parse CSS rules
            const rules = this.parseCSS(css);
            customRules.push(...rules);
        }
        
        // Extract style attributes
        const inlineStyleRegex = /style="([^"]+)"/gi;
        while ((match = inlineStyleRegex.exec(oldContent)) !== null) {
            customRules.push(`inline: ${match[1]}`);
        }
        
        return customRules;
    }

    private parseCSS(css: string): string[] {
        const rules: string[] = [];
        // Simple CSS parser - in production would use a proper CSS parser
        const ruleRegex = /([^{]+)\{([^}]+)\}/g;
        let match;
        
        while ((match = ruleRegex.exec(css)) !== null) {
            const selector = match[1].trim();
            const declarations = match[2].trim();
            rules.push(`${selector} { ${declarations} }`);
        }
        
        return rules;
    }

    /**
     * Detects field customizations like reordering or custom attributes
     */
    detectFieldCustomizations(oldContent: string, newContent: string): any[] {
        const customizations: any[] = [];
        
        // Extract form fields with their attributes
        const fieldRegex = /<(input|select|textarea)\s+([^>]+)>/gi;
        const oldFields = this.extractFields(oldContent);
        const newFields = this.extractFields(newContent);
        
        // Compare field attributes
        oldFields.forEach(oldField => {
            const newField = newFields.find(f => f.name === oldField.name);
            if (newField) {
                // Check for custom attributes
                const customAttrs = this.findCustomAttributes(oldField.attributes, newField.attributes);
                if (customAttrs.length > 0) {
                    customizations.push({
                        field: oldField.name,
                        type: 'attributes',
                        customAttributes: customAttrs
                    });
                }
            }
        });
        
        return customizations;
    }

    private extractFields(content: string): Array<{name: string, attributes: Map<string, string>}> {
        const fields: Array<{name: string, attributes: Map<string, string>}> = [];
        const fieldRegex = /<(input|select|textarea)\s+([^>]+)>/gi;
        
        let match;
        while ((match = fieldRegex.exec(content)) !== null) {
            const attributes = this.parseAttributes(match[2]);
            const name = attributes.get('name');
            
            if (name && name !== 'AeonForm') {
                fields.push({ name, attributes });
            }
        }
        
        return fields;
    }

    private parseAttributes(attrString: string): Map<string, string> {
        const attributes = new Map<string, string>();
        const attrRegex = /(\w+)(?:="([^"]+)")?/g;
        
        let match;
        while ((match = attrRegex.exec(attrString)) !== null) {
            attributes.set(match[1], match[2] || 'true');
        }
        
        return attributes;
    }

    private findCustomAttributes(oldAttrs: Map<string, string>, newAttrs: Map<string, string>): string[] {
        const customAttrs: string[] = [];
        const standardAttrs = ['type', 'name', 'id', 'class', 'value', 'placeholder'];
        
        oldAttrs.forEach((value, key) => {
            if (!standardAttrs.includes(key) && (!newAttrs.has(key) || newAttrs.get(key) !== value)) {
                customAttrs.push(`${key}="${value}"`);
            }
        });
        
        return customAttrs;
    }
}