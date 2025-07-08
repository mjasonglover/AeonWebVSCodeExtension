import * as vscode from 'vscode';
import { JSDOM } from 'jsdom';

// Type helpers
type DOMDocument = Document;
type DOMElement = Element;
import { 
    MigrationProject, 
    MigrationPage,
    PageAnalysis,
    ContentChange,
    StructuralChange,
    ScriptChange,
    MigrationSelection
} from '../types/migration.types';
import { MigrationStorage } from './migrationStorage';
import { TemplateLoader } from './templateLoader';
import { BrandingProcessor } from './brandingProcessor';

export class MigrationEngine {
    private templateLoader!: TemplateLoader;
    private brandingProcessor: BrandingProcessor;

    constructor(
        private storage: MigrationStorage
    ) {
        this.brandingProcessor = new BrandingProcessor();
    }

    setTemplateLoader(loader: TemplateLoader): void {
        this.templateLoader = loader;
    }

    /**
     * Migrate a single page based on user selections
     */
    async migratePage(project: MigrationProject, page: MigrationPage): Promise<string> {
        if (!this.templateLoader) {
            throw new Error('Template loader not initialized');
        }

        // Load the analysis
        const analysis = await this.storage.loadPageAnalysis(project.id, page.sourceFile);
        if (!analysis) {
            throw new Error('No analysis found for page');
        }

        // Load the new template
        const newTemplate = await this.templateLoader.loadTemplate(page.targetFile);
        
        // Apply selected customizations
        let migratedContent = newTemplate;
        
        for (const selection of page.customizations) {
            if (selection.type === 'keep') {
                migratedContent = await this.applyCustomization(
                    migratedContent,
                    analysis,
                    selection.customizationId
                );
            }
        }

        // Apply branding if available
        if (project.brandingGuide) {
            migratedContent = this.brandingProcessor.applyBrandingToHTML(
                migratedContent,
                project.brandingGuide
            );
        }

        return migratedContent;
    }

    /**
     * Apply a specific customization to the template
     */
    private async applyCustomization(
        template: string,
        analysis: PageAnalysis,
        customizationId: string
    ): Promise<string> {
        // Parse customization ID to determine type
        const [type, ...idParts] = customizationId.split('-');
        const id = idParts.join('-');

        switch (type) {
            case 'content':
                return this.applyContentCustomization(template, analysis.customizations.content, id);
            
            case 'structure':
                return this.applyStructuralCustomization(template, analysis.customizations.structure, id);
            
            case 'javascript':
                return this.applyJavaScriptCustomization(template, analysis.customizations.javascript, id);
            
            default:
                return template;
        }
    }

    /**
     * Apply content customizations (text, labels, help text)
     */
    private applyContentCustomization(
        template: string,
        contentChanges: ContentChange[],
        location: string
    ): string {
        const change = contentChanges.find(c => c.location === location);
        if (!change) return template;

        const dom = new JSDOM(template);
        const doc = dom.window.document;

        switch (change.type) {
            case 'label':
                const label = doc.querySelector(`label[for="${location}"]`);
                if (label) {
                    // Preserve the structure but update text
                    const errorSpan = label.querySelector('span[class*="ERROR"]');
                    if (errorSpan) {
                        // Update text inside error span
                        const textNode = errorSpan.childNodes[0];
                        if (textNode && textNode.nodeType === 3) {
                            textNode.textContent = change.oldValue;
                        }
                    } else {
                        label.textContent = change.oldValue;
                    }
                }
                break;

            case 'help':
                const helpElement = doc.querySelector(`#${location}`);
                if (helpElement) {
                    helpElement.textContent = change.oldValue;
                }
                break;

            case 'text':
                if (location === 'page-title') {
                    const h1 = doc.querySelector('h1');
                    if (h1) {
                        h1.textContent = change.oldValue;
                    }
                }
                break;
        }

        return dom.serialize();
    }

    /**
     * Apply structural customizations (field movements, additions)
     */
    private applyStructuralCustomization(
        template: string,
        structuralChanges: StructuralChange[],
        fieldId: string
    ): string {
        const change = structuralChanges.find(c => c.fieldId === fieldId);
        if (!change) return template;

        const dom = new JSDOM(template);
        const doc = dom.window.document;

        switch (change.type) {
            case 'field-moved':
                // Move field to old position
                const field = doc.querySelector(`[name="${fieldId}"]`);
                if (field && change.oldPosition && change.newPosition) {
                    const fieldContainer = this.findFieldContainer(field);
                    if (fieldContainer) {
                        // Find target position and move
                        this.moveFieldToPosition(doc, fieldContainer, change.oldPosition);
                    }
                }
                break;

            case 'field-added':
                // This would need the original field HTML
                // For now, we'll skip field additions
                break;

            case 'field-removed':
                // Remove the field from template
                const fieldToRemove = doc.querySelector(`[name="${fieldId}"]`);
                if (fieldToRemove) {
                    const container = this.findFieldContainer(fieldToRemove);
                    if (container) {
                        container.remove();
                    }
                }
                break;
        }

        return dom.serialize();
    }

    /**
     * Apply JavaScript customizations
     */
    private applyJavaScriptCustomization(
        template: string,
        scriptChanges: ScriptChange[],
        location: string
    ): string {
        const change = scriptChanges.find(c => c.location === location);
        if (!change) return template;

        const dom = new JSDOM(template);
        const doc = dom.window.document;

        // Use suggested rewrite if available
        const scriptContent = change.suggestedRewrite || change.content;

        switch (change.type) {
            case 'inline':
                // Add script to appropriate location
                const script = doc.createElement('script');
                script.textContent = `\n// Migrated custom script: ${change.purpose || 'Custom functionality'}\n${scriptContent}\n`;
                
                if (location === 'head') {
                    doc.head.appendChild(script);
                } else {
                    doc.body.appendChild(script);
                }
                break;

            case 'external':
                // Add external script reference
                const extScript = doc.createElement('script');
                extScript.src = change.content;
                doc.head.appendChild(extScript);
                break;

            case 'event-handler':
                // Convert to modern event listener
                const modernScript = doc.createElement('script');
                modernScript.textContent = `
// Migrated event handler
document.addEventListener('DOMContentLoaded', function() {
    ${scriptContent}
});`;
                doc.body.appendChild(modernScript);
                break;
        }

        return dom.serialize();
    }

    /**
     * Find the container element for a form field
     */
    private findFieldContainer(field: DOMElement): DOMElement | null {
        let parent = field.parentElement;
        
        while (parent) {
            if (parent.classList.contains('form-group') || 
                parent.classList.contains('field-container') ||
                parent.tagName === 'TR' ||
                parent.tagName === 'DIV') {
                return parent;
            }
            parent = parent.parentElement;
        }
        
        return field.parentElement;
    }

    /**
     * Move a field to a specific position
     */
    private moveFieldToPosition(doc: DOMDocument, fieldContainer: DOMElement, position: any): void {
        // Find the target section
        const sections = doc.querySelectorAll('section, .form-section, fieldset');
        let targetSection: DOMElement | null = null;

        sections.forEach((section: DOMElement) => {
            const header = section.querySelector('h2, h3, legend');
            if (header && header.textContent?.includes(position.section)) {
                targetSection = section;
            }
        });

        if (targetSection !== null) {
            const section = targetSection as DOMElement;
            // Find all form groups in section
            const formGroups = section.querySelectorAll('.form-group, .field-container');
            
            if (position.index < formGroups.length) {
                // Insert before the target position
                const targetGroup = formGroups[position.index] as DOMElement;
                targetGroup.parentElement?.insertBefore(
                    fieldContainer,
                    targetGroup
                );
            } else {
                // Append to end of section
                section.appendChild(fieldContainer);
            }
        }
    }

    /**
     * Generate a migration report
     */
    async generateMigrationReport(project: MigrationProject): Promise<string> {
        const report: string[] = [
            `# Migration Report: ${project.name}`,
            `Generated: ${new Date().toLocaleString()}`,
            '',
            `## Project Summary`,
            `- Source Version: ${project.sourceVersion}`,
            `- Target Version: ${project.targetVersion}`,
            `- Total Pages: ${project.pages.length}`,
            `- Features: ${project.features.join(', ') || 'None'}`,
            '',
            `## Pages Migrated`
        ];

        for (const page of project.pages) {
            report.push(`### ${page.sourceFile}`);
            report.push(`- Status: ${page.status}`);
            report.push(`- Customizations Applied: ${page.customizations.length}`);
            
            if (page.customizations.length > 0) {
                report.push('- Types:');
                const types = new Set(page.customizations.map(c => c.customizationId.split('-')[0]));
                types.forEach(type => {
                    const count = page.customizations.filter(c => c.customizationId.startsWith(type)).length;
                    report.push(`  - ${type}: ${count}`);
                });
            }
            report.push('');
        }

        if (project.brandingGuide) {
            report.push('## Branding Applied');
            report.push(`- Primary Color: ${project.brandingGuide.colors.primary}`);
            report.push(`- Secondary Color: ${project.brandingGuide.colors.secondary}`);
            report.push(`- Font Family: ${project.brandingGuide.typography.fontFamily}`);
            report.push('');
        }

        return report.join('\n');
    }

    /**
     * Validate migrated content
     */
    validateMigratedContent(content: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Check for required Aeon elements
        if (!content.includes('name="AeonForm"')) {
            errors.push('Missing AeonForm hidden field');
        }
        
        if (!content.includes('action="aeon.dll"')) {
            errors.push('Form action not set to aeon.dll');
        }
        
        // Check for broken includes
        const includeRegex = /<#INCLUDE\s+FILENAME="([^"]+)">/g;
        let match;
        while ((match = includeRegex.exec(content)) !== null) {
            const filename = match[1];
            if (filename.includes('../') || filename.includes('..\\')) {
                errors.push(`Potentially broken include path: ${filename}`);
            }
        }
        
        // Check for unconverted template tags
        if (content.includes('<%') || content.includes('%>')) {
            errors.push('Found unconverted ASP-style tags');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}