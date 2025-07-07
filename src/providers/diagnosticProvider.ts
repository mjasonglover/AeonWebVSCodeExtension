import * as vscode from 'vscode';
import * as path from 'path';
import { AEON_TAGS, getTag } from '../language/tagDefinitions';
import { getFieldByName } from '../database/fieldDefinitions';

export class AeonDiagnosticProvider {
    private diagnosticCollection: vscode.DiagnosticCollection;
    private tagRegex = /<#(\w+)([^>]*)>/g;
    private attributeRegex = /(\w+)=["']([^"']+)["']/g;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('aeon');
    }

    public updateDiagnostics(document: vscode.TextDocument): void {
        if (!this.isAeonDocument(document)) {
            this.diagnosticCollection.clear();
            return;
        }

        const diagnostics: vscode.Diagnostic[] = [];

        // Validate tags
        diagnostics.push(...this.validateTags(document));
        
        // Validate form structure
        diagnostics.push(...this.validateFormStructure(document));
        
        // Validate includes
        diagnostics.push(...this.validateIncludes(document));
        
        // Validate field names
        diagnostics.push(...this.validateFieldNames(document));
        
        // Validate duplicate IDs
        diagnostics.push(...this.validateDuplicateIds(document));

        this.diagnosticCollection.set(document.uri, diagnostics);
    }

    private isAeonDocument(document: vscode.TextDocument): boolean {
        const text = document.getText();
        return text.includes('<#') || text.includes('aeon.dll');
    }

    private validateTags(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        let match;

        this.tagRegex.lastIndex = 0;
        while ((match = this.tagRegex.exec(text)) !== null) {
            const tagName = match[1];
            const attributes = match[2];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            // Check if tag exists
            const tagDef = getTag(tagName);
            if (!tagDef) {
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Unknown Aeon tag: ${tagName}`,
                    vscode.DiagnosticSeverity.Error
                ));
                continue;
            }

            // Validate required attributes
            const presentAttrs = new Set<string>();
            let attrMatch;
            this.attributeRegex.lastIndex = 0;
            while ((attrMatch = this.attributeRegex.exec(attributes)) !== null) {
                presentAttrs.add(attrMatch[1]);
            }

            for (const attr of tagDef.attributes) {
                if (attr.required && !presentAttrs.has(attr.name)) {
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Missing required attribute '${attr.name}' for <#${tagName}> tag`,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            }

            // Special validation for specific tags
            if (tagName === 'PARAM' || tagName === 'ERROR') {
                const nameMatch = /name=["']([^"']+)["']/.exec(attributes);
                if (nameMatch) {
                    const fieldName = nameMatch[1];
                    if (tagName === 'PARAM') {
                        this.validateParamField(fieldName, range, diagnostics);
                    } else if (tagName === 'ERROR') {
                        this.validateErrorField(fieldName, range, diagnostics);
                    }
                }
            }
        }

        return diagnostics;
    }

    private validateParamField(fieldName: string, range: vscode.Range, diagnostics: vscode.Diagnostic[]): void {
        // Skip validation for special parameters
        const specialParams = ['RequestLinksVisible', 'ResearcherTag', 'COPYRIGHT'];
        if (specialParams.includes(fieldName)) {
            return;
        }

        const field = getFieldByName(fieldName);
        if (!field) {
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Unknown field name: ${fieldName}. This field may not exist in the Aeon database.`,
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }

    private validateErrorField(fieldName: string, range: vscode.Range, diagnostics: vscode.Diagnostic[]): void {
        if (!fieldName.startsWith('ERROR')) {
            diagnostics.push(new vscode.Diagnostic(
                range,
                `Error field names should start with 'ERROR' (e.g., 'ERRORItemTitle')`,
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }

    private validateFormStructure(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();

        // Check for forms
        const formMatches = [...text.matchAll(/<form[^>]*>/gi)];
        
        for (const formMatch of formMatches) {
            const formStartIndex = formMatch.index!;
            const formEndMatch = text.indexOf('</form>', formStartIndex);
            
            if (formEndMatch === -1) {
                const pos = document.positionAt(formStartIndex);
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(pos, pos),
                    'Unclosed <form> tag',
                    vscode.DiagnosticSeverity.Error
                ));
                continue;
            }

            const formContent = text.substring(formStartIndex, formEndMatch);

            // Check for action="aeon.dll"
            if (!formMatch[0].includes('action="aeon.dll"') && !formMatch[0].includes("action='aeon.dll'")) {
                const pos = document.positionAt(formStartIndex);
                const endPos = document.positionAt(formStartIndex + formMatch[0].length);
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(pos, endPos),
                    'Aeon forms should have action="aeon.dll"',
                    vscode.DiagnosticSeverity.Warning
                ));
            }

            // Check for AeonForm hidden field
            if (!formContent.includes('name="AeonForm"')) {
                const pos = document.positionAt(formStartIndex);
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(pos, pos),
                    'Form is missing required hidden field: <input type="hidden" name="AeonForm" value="FormName">',
                    vscode.DiagnosticSeverity.Warning
                ));
            }

            // Check for method="post"
            if (!formMatch[0].includes('method="post"') && !formMatch[0].includes("method='post'")) {
                const pos = document.positionAt(formStartIndex);
                const endPos = document.positionAt(formStartIndex + formMatch[0].length);
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(pos, endPos),
                    'Aeon forms should use method="post"',
                    vscode.DiagnosticSeverity.Information
                ));
            }
        }

        return diagnostics;
    }

    private validateIncludes(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const includeRegex = /<#INCLUDE\s+filename=["']([^"']+)["'][^>]*>/gi;
        let match;

        while ((match = includeRegex.exec(text)) !== null) {
            const filename = match[1];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            // Check if file exists (basic check for common includes)
            const commonIncludes = [
                'include_head.html',
                'include_header.html',
                'include_footer.html',
                'include_nav.html',
                'include_menu.html',
                'include_head_request.html',
                'include_request_buttons.html',
                'include_ResearcherTags.html',
                'include_scheduled_date.html'
            ];

            if (!commonIncludes.some(common => filename.includes(common))) {
                // For non-common includes, add an info message
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Verify that include file exists: ${filename}`,
                    vscode.DiagnosticSeverity.Information
                ));
            }
        }

        return diagnostics;
    }

    private validateFieldNames(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        
        // Check input field names
        const inputRegex = /<input[^>]+name=["']([^"']+)["'][^>]*>/gi;
        let match;

        while ((match = inputRegex.exec(text)) !== null) {
            const fieldName = match[1];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            // Skip special form fields
            const specialFields = ['AeonForm', 'SubmitButton', 'CancelButton', 'TransactionLink', 
                                  'ReferenceNumber', 'ItemNumber', 'RequestType', 'FormDataField'];
            if (specialFields.includes(fieldName)) {
                continue;
            }

            // Check if it's a known field
            const field = getFieldByName(fieldName);
            if (!field && !fieldName.startsWith('Custom') && !fieldName.includes('Info')) {
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `Unknown field name '${fieldName}'. Verify this field exists in the Aeon database.`,
                    vscode.DiagnosticSeverity.Information
                ));
            }
        }

        return diagnostics;
    }

    private validateDuplicateIds(document: vscode.TextDocument): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const text = document.getText();
        const idRegex = /\bid=["']([^"']+)["']/gi;
        const ids = new Map<string, vscode.Range[]>();
        let match;

        while ((match = idRegex.exec(text)) !== null) {
            const id = match[1];
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);

            if (!ids.has(id)) {
                ids.set(id, []);
            }
            ids.get(id)!.push(range);
        }

        // Report duplicates
        for (const [id, ranges] of ids) {
            if (ranges.length > 1) {
                for (const range of ranges) {
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        `Duplicate ID '${id}' found. IDs must be unique within a document.`,
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            }
        }

        return diagnostics;
    }

    public dispose(): void {
        this.diagnosticCollection.dispose();
    }
}