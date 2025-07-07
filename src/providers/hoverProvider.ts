import * as vscode from 'vscode';
import { getTag } from '../language/tagDefinitions';
import { getFieldByName, FORM_ACTIONS } from '../database/fieldDefinitions';

export class AeonHoverProvider implements vscode.HoverProvider {
    
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        
        const range = document.getWordRangeAtPosition(position, /<#\w+[^>]*>/);
        if (range) {
            const text = document.getText(range);
            return this.getTagHover(text, range);
        }
        
        // Check if hovering over a field name in a name attribute
        const lineText = document.lineAt(position).text;
        const fieldMatch = this.getFieldNameAtPosition(lineText, position.character);
        if (fieldMatch) {
            return this.getFieldHover(fieldMatch);
        }
        
        // Check if hovering over an action number
        const actionMatch = this.getActionNumberAtPosition(lineText, position.character);
        if (actionMatch) {
            return this.getActionHover(actionMatch);
        }
        
        return null;
    }
    
    private getTagHover(tagText: string, range: vscode.Range): vscode.Hover | null {
        const tagNameMatch = tagText.match(/<#(\w+)/);
        if (!tagNameMatch) return null;
        
        const tagName = tagNameMatch[1];
        const tagDef = getTag(tagName);
        
        if (!tagDef) return null;
        
        const content = new vscode.MarkdownString();
        
        // Tag name and category
        content.appendMarkdown(`### Aeon Tag: ${tagDef.name}\n\n`);
        content.appendMarkdown(`**Category:** ${tagDef.category}\n\n`);
        
        // Description
        content.appendMarkdown(`${tagDef.description}\n\n`);
        
        // Attributes
        if (tagDef.attributes.length > 0) {
            content.appendMarkdown('**Attributes:**\n\n');
            for (const attr of tagDef.attributes) {
                const required = attr.required ? ' *(required)*' : '';
                content.appendMarkdown(`- **${attr.name}**${required}: ${attr.description}\n`);
                if (attr.values) {
                    content.appendMarkdown(`  - Values: ${attr.values.map(v => `\`${v}\``).join(', ')}\n`);
                }
            }
            content.appendMarkdown('\n');
        }
        
        // Examples
        if (tagDef.examples.length > 0) {
            content.appendMarkdown('**Examples:**\n\n');
            for (const example of tagDef.examples) {
                content.appendCodeblock(example, 'html');
            }
        }
        
        // Add specific information based on tag
        this.addTagSpecificInfo(tagName, tagText, content);
        
        return new vscode.Hover(content, range);
    }
    
    private getFieldNameAtPosition(lineText: string, charPosition: number): string | null {
        // Look for name="fieldname" pattern
        const namePattern = /name=["']([^"']+)["']/g;
        let match;
        
        while ((match = namePattern.exec(lineText)) !== null) {
            const start = match.index + 6; // After name="
            const end = start + match[1].length;
            
            if (charPosition >= start && charPosition <= end) {
                return match[1];
            }
        }
        
        return null;
    }
    
    private getFieldHover(fieldName: string): vscode.Hover | null {
        const field = getFieldByName(fieldName);
        
        if (!field) {
            // Check if it's an ERROR field
            if (fieldName.startsWith('ERROR')) {
                const baseFieldName = fieldName.substring(5);
                const baseField = getFieldByName(baseFieldName);
                if (baseField) {
                    const content = new vscode.MarkdownString();
                    content.appendMarkdown(`### Error Field: ${fieldName}\n\n`);
                    content.appendMarkdown(`Error indicator for the **${baseFieldName}** field.\n\n`);
                    content.appendMarkdown(`Used with the \`<#ERROR>\` tag to apply error styling when validation fails.`);
                    return new vscode.Hover(content);
                }
            }
            return null;
        }
        
        const content = new vscode.MarkdownString();
        
        // Field information
        content.appendMarkdown(`### Database Field: ${field.name}\n\n`);
        content.appendMarkdown(`**Type:** ${field.type}`);
        if (field.maxLength) {
            content.appendMarkdown(` (max length: ${field.maxLength})`);
        }
        content.appendMarkdown(`\n\n`);
        
        content.appendMarkdown(`**Category:** ${field.category}\n\n`);
        content.appendMarkdown(`**Description:** ${field.description}\n\n`);
        
        if (field.documentation) {
            content.appendMarkdown(`${field.documentation}\n\n`);
        }
        
        // Add usage examples
        content.appendMarkdown('**Usage Examples:**\n\n');
        content.appendCodeblock(`<#PARAM name="${field.name}">`, 'html');
        content.appendCodeblock(`<input type="text" name="${field.name}" value="<#PARAM name='${field.name}'>">`, 'html');
        
        return new vscode.Hover(content);
    }
    
    private getActionNumberAtPosition(lineText: string, charPosition: number): string | null {
        // Look for action="number" pattern
        const actionPattern = /action=["'](\d+)["']/g;
        let match;
        
        while ((match = actionPattern.exec(lineText)) !== null) {
            const start = match.index + 8; // After action="
            const end = start + match[1].length;
            
            if (charPosition >= start && charPosition <= end) {
                return match[1];
            }
        }
        
        return null;
    }
    
    private getActionHover(actionNumber: string): vscode.Hover | null {
        const actionNum = parseInt(actionNumber);
        let actionName = '';
        
        // Find the action name
        for (const [name, value] of Object.entries(FORM_ACTIONS)) {
            if (value === actionNum) {
                actionName = name;
                break;
            }
        }
        
        if (!actionName) return null;
        
        const content = new vscode.MarkdownString();
        content.appendMarkdown(`### Aeon Action: ${actionName}\n\n`);
        content.appendMarkdown(`**Action Number:** ${actionNumber}\n\n`);
        
        // Add description based on action
        const descriptions: Record<string, string> = {
            Logon: 'Initiates user login process',
            RSS: 'RSS feed related action',
            Show: 'Display a page or form',
            Submit: 'Submit form data',
            Search: 'Perform a search operation',
            Edit: 'Edit existing data',
            Cancel: 'Cancel current operation',
            Delete: 'Delete data',
            Approve: 'Approve a request or action',
            Exit: 'Exit or logout'
        };
        
        if (descriptions[actionName]) {
            content.appendMarkdown(`**Description:** ${descriptions[actionName]}\n\n`);
        }
        
        content.appendMarkdown('**Example:**\n\n');
        content.appendCodeblock(`<#ACTION action="${actionNumber}" form="1">`, 'html');
        
        return new vscode.Hover(content);
    }
    
    private addTagSpecificInfo(tagName: string, tagText: string, content: vscode.MarkdownString): void {
        switch (tagName) {
            case 'PARAM':
                const paramMatch = tagText.match(/name=["']([^"']+)["']/);
                if (paramMatch) {
                    const fieldName = paramMatch[1];
                    const field = getFieldByName(fieldName);
                    if (field) {
                        content.appendMarkdown(`\n**Field Information:**\n`);
                        content.appendMarkdown(`- Type: ${field.type}\n`);
                        content.appendMarkdown(`- Category: ${field.category}\n`);
                        content.appendMarkdown(`- ${field.description}\n`);
                    }
                }
                break;
                
            case 'TABLE':
                const tableMatch = tagText.match(/name=["']([^"']+)["']/);
                if (tableMatch) {
                    const tableName = tableMatch[1];
                    content.appendMarkdown(`\n**Table Type:** ${tableName}\n\n`);
                    
                    const tableDescriptions: Record<string, string> = {
                        ViewOutstandingRequests: 'Displays all outstanding (active) requests',
                        ViewAllRequests: 'Shows all requests regardless of status',
                        ViewRequestHistory: 'Shows completed and cancelled requests',
                        ViewCheckedOutItems: 'Lists currently checked out items',
                        ViewSearchResults: 'Displays search results',
                        ViewOrderEstimates: 'Shows order estimates pending approval',
                        ViewElectronicDelivery: 'Lists electronic delivery items'
                    };
                    
                    if (tableDescriptions[tableName]) {
                        content.appendMarkdown(`${tableDescriptions[tableName]}\n`);
                    }
                }
                break;
                
            case 'OPTION':
                const optionMatch = tagText.match(/name=["']([^"']+)["']/);
                if (optionMatch) {
                    const groupName = optionMatch[1];
                    content.appendMarkdown(`\n**CustomDropDown Group:** ${groupName}\n\n`);
                    content.appendMarkdown('This tag will load options from the CustomDropDown table in the Aeon database.\n');
                }
                break;
        }
    }
}