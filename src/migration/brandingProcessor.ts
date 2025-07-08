import * as vscode from 'vscode';
import { BrandingGuide, LogoAsset } from '../types/migration.types';

export class BrandingProcessor {
    
    /**
     * Process a branding guide from various sources
     */
    async processBrandingGuide(source: string | vscode.Uri): Promise<BrandingGuide> {
        if (typeof source === 'string') {
            // URL or manual input
            if (source.startsWith('http')) {
                return await this.extractFromWebpage(source);
            } else {
                return this.parseManualInput(source);
            }
        } else {
            // File upload (PDF or image)
            return await this.extractFromFile(source);
        }
    }

    /**
     * Extract branding from a webpage
     */
    private async extractFromWebpage(url: string): Promise<BrandingGuide> {
        // In a real implementation, this would fetch and parse the webpage
        // For now, we'll return a sample structure
        return {
            colors: {
                primary: '#003366',
                secondary: '#0066cc',
                accent: '#ff6600',
                text: '#333333',
                background: '#ffffff',
                error: '#cc0000',
                success: '#00cc00'
            },
            typography: {
                fontFamily: "'Helvetica Neue', Arial, sans-serif",
                headingFont: "Georgia, serif",
                baseFontSize: '16px',
                lineHeight: '1.5'
            },
            logos: {
                primary: {
                    url: '/images/logo.png',
                    width: 200,
                    height: 60,
                    placement: 'header'
                }
            }
        };
    }

    /**
     * Parse manual branding input from user
     */
    private parseManualInput(input: string): BrandingGuide {
        // Parse JSON or structured text input
        try {
            return JSON.parse(input);
        } catch {
            // Fallback to default structure
            return this.createDefaultBranding();
        }
    }

    /**
     * Extract branding from uploaded file (PDF, image)
     */
    private async extractFromFile(fileUri: vscode.Uri): Promise<BrandingGuide> {
        // In production, this would use OCR or PDF parsing
        // For now, return a default structure
        return this.createDefaultBranding();
    }

    /**
     * Create default branding structure
     */
    private createDefaultBranding(): BrandingGuide {
        return {
            colors: {
                primary: '#003366',
                secondary: '#0066cc',
                text: '#333333',
                background: '#ffffff'
            },
            typography: {
                fontFamily: 'Arial, sans-serif',
                baseFontSize: '16px',
                lineHeight: '1.5'
            },
            logos: {
                primary: {
                    url: '',
                    width: 200,
                    height: 60,
                    placement: 'header'
                }
            }
        };
    }

    /**
     * Generate CSS from branding guide
     */
    generateCSS(branding: BrandingGuide): string {
        const css: string[] = [
            '/* Generated from Branding Guide */',
            ':root {',
            `  --primary-color: ${branding.colors.primary};`,
            `  --secondary-color: ${branding.colors.secondary};`,
            `  --accent-color: ${branding.colors.accent || branding.colors.secondary};`,
            `  --text-color: ${branding.colors.text};`,
            `  --background-color: ${branding.colors.background};`,
            `  --error-color: ${branding.colors.error || '#dc3545'};`,
            `  --success-color: ${branding.colors.success || '#28a745'};`,
            `  --font-family: ${branding.typography.fontFamily};`,
            `  --heading-font: ${branding.typography.headingFont || branding.typography.fontFamily};`,
            `  --base-font-size: ${branding.typography.baseFontSize};`,
            `  --line-height: ${branding.typography.lineHeight};`,
            '}'
        ];

        // Apply to common elements
        css.push(
            '',
            '/* Base Styles */',
            'body {',
            '  font-family: var(--font-family);',
            '  font-size: var(--base-font-size);',
            '  line-height: var(--line-height);',
            '  color: var(--text-color);',
            '  background-color: var(--background-color);',
            '}',
            '',
            'h1, h2, h3, h4, h5, h6 {',
            '  font-family: var(--heading-font);',
            '  color: var(--primary-color);',
            '}',
            '',
            '/* Buttons */',
            '.btn-primary {',
            '  background-color: var(--primary-color);',
            '  border-color: var(--primary-color);',
            '}',
            '',
            '.btn-primary:hover {',
            '  background-color: var(--secondary-color);',
            '  border-color: var(--secondary-color);',
            '}',
            '',
            '/* Forms */',
            '.form-control:focus {',
            '  border-color: var(--primary-color);',
            '  box-shadow: 0 0 0 0.2rem rgba(var(--primary-color), 0.25);',
            '}',
            '',
            '/* Links */',
            'a {',
            '  color: var(--primary-color);',
            '}',
            '',
            'a:hover {',
            '  color: var(--secondary-color);',
            '}',
            '',
            '/* Alerts */',
            '.alert-danger {',
            '  color: var(--error-color);',
            '  background-color: rgba(var(--error-color), 0.1);',
            '  border-color: var(--error-color);',
            '}',
            '',
            '.alert-success {',
            '  color: var(--success-color);',
            '  background-color: rgba(var(--success-color), 0.1);',
            '  border-color: var(--success-color);',
            '}'
        );

        // Logo styles
        if (branding.logos.primary.url) {
            css.push(
                '',
                '/* Logo */',
                '.site-logo {',
                `  background-image: url('${branding.logos.primary.url}');`,
                `  width: ${branding.logos.primary.width}px;`,
                `  height: ${branding.logos.primary.height}px;`,
                '  background-size: contain;',
                '  background-repeat: no-repeat;',
                '}'
            );
        }

        // Spacing if provided
        if (branding.spacing) {
            css.push(
                '',
                '/* Spacing */',
                '.mt-small { margin-top: ' + branding.spacing.small + '; }',
                '.mt-medium { margin-top: ' + branding.spacing.medium + '; }',
                '.mt-large { margin-top: ' + branding.spacing.large + '; }',
                '.mb-small { margin-bottom: ' + branding.spacing.small + '; }',
                '.mb-medium { margin-bottom: ' + branding.spacing.medium + '; }',
                '.mb-large { margin-bottom: ' + branding.spacing.large + '; }'
            );
        }

        return css.join('\n');
    }

    /**
     * Apply branding to HTML content
     */
    applyBrandingToHTML(html: string, branding: BrandingGuide): string {
        let brandedHTML = html;

        // Add custom CSS
        const customCSS = this.generateCSS(branding);
        const cssTag = `<style>\n${customCSS}\n</style>`;
        
        // Insert before closing head tag or at beginning
        if (brandedHTML.includes('</head>')) {
            brandedHTML = brandedHTML.replace('</head>', `${cssTag}\n</head>`);
        } else {
            brandedHTML = cssTag + '\n' + brandedHTML;
        }

        // Add logo if specified
        if (branding.logos.primary.url && branding.logos.primary.placement !== 'footer') {
            const logoHTML = `<div class="site-logo" role="img" aria-label="Site Logo"></div>`;
            
            // Try to insert after opening body or in header
            if (brandedHTML.includes('<header')) {
                brandedHTML = brandedHTML.replace(/<header([^>]*)>/, `<header$1>\n${logoHTML}\n`);
            } else if (brandedHTML.includes('<body')) {
                brandedHTML = brandedHTML.replace(/<body([^>]*)>/, `<body$1>\n${logoHTML}\n`);
            }
        }

        return brandedHTML;
    }

    /**
     * Interactive branding guide builder
     */
    async buildBrandingGuideInteractively(): Promise<BrandingGuide> {
        const guide: Partial<BrandingGuide> = {};

        // Primary color
        const primaryColor = await vscode.window.showInputBox({
            prompt: 'Enter primary brand color (hex)',
            placeHolder: '#003366',
            validateInput: (value) => {
                return /^#[0-9A-F]{6}$/i.test(value) ? null : 'Please enter a valid hex color';
            }
        });

        if (!primaryColor) {
            throw new Error('Branding guide creation cancelled');
        }

        // Secondary color
        const secondaryColor = await vscode.window.showInputBox({
            prompt: 'Enter secondary brand color (hex)',
            placeHolder: '#0066cc',
            validateInput: (value) => {
                return /^#[0-9A-F]{6}$/i.test(value) ? null : 'Please enter a valid hex color';
            }
        });

        // Font family
        const fontFamily = await vscode.window.showInputBox({
            prompt: 'Enter primary font family',
            placeHolder: 'Arial, sans-serif'
        });

        // Logo URL
        const logoUrl = await vscode.window.showInputBox({
            prompt: 'Enter logo URL (optional)',
            placeHolder: '/images/logo.png'
        });

        return {
            colors: {
                primary: primaryColor,
                secondary: secondaryColor || primaryColor,
                text: '#333333',
                background: '#ffffff'
            },
            typography: {
                fontFamily: fontFamily || 'Arial, sans-serif',
                baseFontSize: '16px',
                lineHeight: '1.5'
            },
            logos: {
                primary: {
                    url: logoUrl || '',
                    width: 200,
                    height: 60,
                    placement: 'header'
                }
            }
        };
    }
}