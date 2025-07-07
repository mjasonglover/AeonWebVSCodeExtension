import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AEON_TAGS, getAllTagNames, getTag } from '../language/tagDefinitions';
import { ALL_FIELDS, TRANSACTION_FIELDS, USER_FIELDS, ACTIVITY_FIELDS, FORM_ACTIONS, FORM_TYPES } from '../database/fieldDefinitions';

export class AeonCompletionProvider implements vscode.CompletionItemProvider {
    
    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): vscode.ProviderResult<vscode.CompletionItem[]> {
        
        const linePrefix = document.lineAt(position).text.substr(0, position.character);
        const wordRange = document.getWordRangeAtPosition(position);
        const currentWord = wordRange ? document.getText(wordRange) : '';
        
        // Tag completion after <#
        if (linePrefix.endsWith('<#') || (linePrefix.includes('<#') && !linePrefix.includes('>'))) {
            return this.getTagCompletions();
        }
        
        // Attribute completion inside tags
        const tagMatch = this.getCurrentTag(linePrefix);
        if (tagMatch) {
            const tagName = tagMatch[1];
            const afterTagName = tagMatch[2];
            
            // If we're inside a tag and after the tag name
            if (afterTagName && !afterTagName.includes('>')) {
                return this.getAttributeCompletions(tagName, linePrefix);
            }
        }
        
        // Field name completion for name attributes
        if (this.isInAttributeValue(linePrefix, 'name')) {
            const containingTag = this.getContainingTagName(linePrefix);
            return this.getFieldNameCompletions(containingTag);
        }
        
        // Include file completion
        if (this.isInAttributeValue(linePrefix, 'filename')) {
            return this.getIncludeFileCompletions(document);
        }
        
        // Form/Action number completions
        if (this.isInAttributeValue(linePrefix, 'action')) {
            return this.getActionCompletions();
        }
        
        if (this.isInAttributeValue(linePrefix, 'form')) {
            return this.getFormCompletions();
        }
        
        // Value completions for specific attributes
        if (this.isInAttributeValue(linePrefix, 'type')) {
            const tagName = this.getContainingTagName(linePrefix);
            if (tagName === 'INCLUDE') {
                return this.getIncludeTypeCompletions();
            }
        }
        
        return [];
    }
    
    private getCurrentTag(linePrefix: string): RegExpMatchArray | null {
        const match = linePrefix.match(/<#(\w+)(\s+.*)?$/);
        return match;
    }
    
    private getContainingTagName(linePrefix: string): string | null {
        const match = linePrefix.match(/<#(\w+)\s+/);
        return match ? match[1] : null;
    }
    
    private isInAttributeValue(linePrefix: string, attributeName: string): boolean {
        const regex = new RegExp(`${attributeName}=["']([^"']*?)$`);
        return regex.test(linePrefix);
    }
    
    private getTagCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        for (const [tagName, tagDef] of AEON_TAGS) {
            const item = new vscode.CompletionItem(tagName, vscode.CompletionItemKind.Method);
            item.detail = `Aeon ${tagDef.category} tag`;
            item.documentation = new vscode.MarkdownString(tagDef.description);
            
            // Add example to documentation
            if (tagDef.examples.length > 0) {
                item.documentation.appendMarkdown('\n\n**Example:**\n```html\n' + tagDef.examples[0] + '\n```');
            }
            
            // Create snippet based on required attributes
            const requiredAttrs = tagDef.attributes.filter(attr => attr.required);
            if (requiredAttrs.length > 0) {
                let snippet = tagName;
                let tabIndex = 1;
                for (const attr of requiredAttrs) {
                    snippet += ` ${attr.name}="$${tabIndex++}"`;
                }
                snippet += '>';
                item.insertText = new vscode.SnippetString(snippet);
            } else {
                item.insertText = tagName + '>';
            }
            
            completions.push(item);
        }
        
        return completions;
    }
    
    private getAttributeCompletions(tagName: string, linePrefix: string): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        const tagDef = getTag(tagName);
        
        if (!tagDef) {
            return completions;
        }
        
        // Extract already present attributes
        const presentAttrs = new Set<string>();
        const attrRegex = /(\w+)=["'][^"']*["']/g;
        let match;
        while ((match = attrRegex.exec(linePrefix)) !== null) {
            presentAttrs.add(match[1]);
        }
        
        // Add completions for missing attributes
        for (const attr of tagDef.attributes) {
            if (!presentAttrs.has(attr.name)) {
                const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property);
                item.detail = `${attr.type}${attr.required ? ' (required)' : ''}`;
                item.documentation = attr.description;
                
                // Create snippet with quotes and cursor position
                item.insertText = new vscode.SnippetString(`${attr.name}="$1"`);
                
                // Mark required attributes
                if (attr.required) {
                    item.label = `${attr.name} *`;
                    item.sortText = `0_${attr.name}`; // Sort required first
                }
                
                completions.push(item);
            }
        }
        
        return completions;
    }
    
    private getFieldNameCompletions(tagName: string | null): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        let fields = ALL_FIELDS;
        
        // Filter fields based on tag type
        if (tagName === 'USER') {
            fields = USER_FIELDS;
        } else if (tagName === 'ACTIVITY') {
            fields = ACTIVITY_FIELDS;
        } else if (tagName === 'PARAM' || tagName === 'ERROR') {
            // For PARAM and ERROR, show all transaction fields primarily
            fields = TRANSACTION_FIELDS;
        }
        
        // Add field completions
        for (const field of fields) {
            const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
            item.detail = `${field.type} - ${field.category}`;
            item.documentation = new vscode.MarkdownString(field.documentation);
            
            // Add additional info
            if (field.maxLength) {
                item.documentation.appendMarkdown(`\n\n**Max Length:** ${field.maxLength}`);
            }
            
            completions.push(item);
        }
        
        // Add special completions for ERROR tag
        if (tagName === 'ERROR') {
            // Add ERROR prefixed versions of common fields
            const commonErrorFields = ['ItemTitle', 'ItemAuthor', 'CallNumber', 'FirstName', 'LastName', 'Username'];
            for (const fieldName of commonErrorFields) {
                const item = new vscode.CompletionItem(`ERROR${fieldName}`, vscode.CompletionItemKind.Field);
                item.detail = 'Error field';
                item.documentation = `Error indicator for the ${fieldName} field`;
                item.sortText = `0_ERROR${fieldName}`; // Sort first
                completions.push(item);
            }
        }
        
        return completions;
    }
    
    private getIncludeFileCompletions(document: vscode.TextDocument): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        // Common include files
        const commonIncludes = [
            { file: 'include_head.html', desc: 'Common head elements and CSS links' },
            { file: 'include_header.html', desc: 'Page header with logo' },
            { file: 'include_footer.html', desc: 'Page footer with copyright' },
            { file: 'include_nav.html', desc: 'Navigation menu' },
            { file: 'include_menu.html', desc: 'Main menu (alternative to nav)' },
            { file: 'include_head_request.html', desc: 'Additional head elements for request forms' },
            { file: 'include_request_buttons.html', desc: 'Submit/Cancel buttons for request forms' },
            { file: 'include_ResearcherTags.html', desc: 'Researcher tag fields' },
            { file: 'include_scheduled_date.html', desc: 'Scheduled date picker' },
            { file: 'include_photoduplication.html', desc: 'Photoduplication options' }
        ];
        
        for (const include of commonIncludes) {
            const item = new vscode.CompletionItem(include.file, vscode.CompletionItemKind.File);
            item.detail = 'Common include file';
            item.documentation = include.desc;
            item.sortText = `0_${include.file}`; // Sort common includes first
            completions.push(item);
        }
        
        // Try to find actual include files in workspace
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        if (workspaceFolder) {
            const includeSearchPaths = vscode.workspace.getConfiguration('aeon').get<string[]>('includeSearchPaths') || ['.', 'includes'];
            
            for (const searchPath of includeSearchPaths) {
                const fullPath = path.join(workspaceFolder.uri.fsPath, searchPath);
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                    try {
                        const files = fs.readdirSync(fullPath);
                        for (const file of files) {
                            if (file.endsWith('.html') || file.endsWith('.htm')) {
                                const relativePath = path.relative(workspaceFolder.uri.fsPath, path.join(fullPath, file));
                                const item = new vscode.CompletionItem(relativePath.replace(/\\/g, '/'), vscode.CompletionItemKind.File);
                                item.detail = 'Include file';
                                completions.push(item);
                            }
                        }
                    } catch (error) {
                        // Ignore errors reading directories
                    }
                }
            }
        }
        
        return completions;
    }
    
    private getIncludeTypeCompletions(): vscode.CompletionItem[] {
        const types = [
            { name: 'DetailedDocTypeInformation', desc: 'Shows detailed information based on document type' },
            { name: 'Photoduplication', desc: 'Shows photoduplication options for photodup requests' },
            { name: 'RISDocTypeInformation', desc: 'Shows RIS information based on document type' }
        ];
        
        return types.map(type => {
            const item = new vscode.CompletionItem(type.name, vscode.CompletionItemKind.EnumMember);
            item.detail = 'Include type';
            item.documentation = type.desc;
            return item;
        });
    }
    
    private getActionCompletions(): vscode.CompletionItem[] {
        const completions: vscode.CompletionItem[] = [];
        
        for (const [name, value] of Object.entries(FORM_ACTIONS)) {
            const item = new vscode.CompletionItem(value.toString(), vscode.CompletionItemKind.EnumMember);
            item.detail = `Action: ${name}`;
            item.documentation = `Aeon form action: ${name} (${value})`;
            item.sortText = value.toString().padStart(2, '0');
            completions.push(item);
        }
        
        return completions;
    }
    
    private getFormCompletions(): vscode.CompletionItem[] {
        const forms = [
            { value: '1', name: 'About', file: 'AboutAeon.html' },
            { value: '2', name: 'Custom', file: '*' },
            { value: '3', name: 'SiteMap', file: 'SiteMap.html' },
            { value: '4', name: 'FAQ', file: 'FAQ.html' },
            { value: '10', name: 'MainMenu', file: 'MainMenu.html' },
            { value: '12', name: 'Logon', file: '' },
            { value: '15', name: 'CreditCardPayment', file: 'CreditCardPayment.html' },
            { value: '20', name: 'RequestGeneric', file: '*' },
            { value: '21', name: 'RequestDefault', file: 'DefaultRequest.html' },
            { value: '22', name: 'RequestOther', file: 'OtherRequest.html' },
            { value: '23', name: 'RequestPhotoduplication', file: 'PhotoduplicationRequest.html' },
            { value: '30', name: 'RequestOpenURL', file: '' },
            { value: '31', name: 'RequestEAD', file: 'EADRequest.html' },
            { value: '35', name: 'RequestArchival', file: 'ArchivalRequest.html' },
            { value: '60', name: 'ViewAll', file: 'ViewAllRequests.html' },
            { value: '62', name: 'ViewOutstanding', file: 'ViewOutstandingRequests.html' },
            { value: '68', name: 'ViewHistory', file: 'ViewRequestHistory.html' },
            { value: '79', name: 'UserFirstTime', file: 'FirstTime.html' },
            { value: '80', name: 'UserRegistration', file: 'NewUserRegistration.html' },
            { value: '81', name: 'UserInformation', file: 'ChangeUserInformation.html' }
        ];
        
        return forms.map(form => {
            const item = new vscode.CompletionItem(form.value, vscode.CompletionItemKind.EnumMember);
            item.detail = `Form: ${form.name}`;
            item.documentation = `${form.name}${form.file ? ` (${form.file})` : ''}`;
            item.sortText = form.value.padStart(3, '0');
            return item;
        });
    }
}