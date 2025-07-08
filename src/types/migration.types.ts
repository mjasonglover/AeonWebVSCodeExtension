// Migration & Modernization Types

export interface PageAnalysis {
    originalPage: string;
    customizations: {
        branding: BrandingGuide;
        content: ContentChange[];
        structure: StructuralChange[];
        javascript: ScriptChange[];
    };
    aeonVersion: string;
    detectedFeatures: string[];
}

export interface BrandingGuide {
    colors: {
        primary: string;
        secondary: string;
        accent?: string;
        text: string;
        background: string;
        error?: string;
        success?: string;
    };
    typography: {
        fontFamily: string;
        headingFont?: string;
        baseFontSize: string;
        lineHeight: string;
    };
    logos: {
        primary: LogoAsset;
        alternate?: LogoAsset;
    };
    spacing?: SpacingScale;
}

export interface LogoAsset {
    url: string;
    width: number;
    height: number;
    placement: 'header' | 'footer' | 'both';
}

export interface SpacingScale {
    small: string;
    medium: string;
    large: string;
    xlarge: string;
}

export interface ContentChange {
    type: 'text' | 'label' | 'help' | 'error';
    location: string;
    oldValue: string;
    newValue: string;
    elementPath: string;
}

export interface StructuralChange {
    type: 'field-moved' | 'field-added' | 'field-removed' | 'section-reordered';
    fieldId: string;
    fieldName: string;
    oldPosition?: FieldPosition;
    newPosition?: FieldPosition;
}

export interface FieldPosition {
    section: string;
    index: number;
    row?: number;
    column?: number;
}

export interface ScriptChange {
    type: 'inline' | 'external' | 'event-handler';
    content: string;
    purpose?: string; // AI-analyzed purpose
    suggestedRewrite?: string;
    location: string;
}

export interface MigrationWorkspace {
    oldPage: PageData;
    newTemplate: PageData; // From bundled latest version
    selectedCustomizations: Set<string>;
    diffView: boolean;
    previewMode: 'split' | 'merged' | 'diff';
    brandingGuide?: BrandingGuide;
}

export interface PageData {
    fileName: string;
    content: string;
    version: string;
    type: 'form' | 'list' | 'report' | 'include';
}

export interface MigrationSelection {
    customizationId: string;
    type: 'keep' | 'discard' | 'modify';
    modifiedValue?: string;
}

export interface FeaturePackage {
    id: string;
    name: string;
    version: string;
    description: string;
    files: FeatureFile[];
    requirements: string[];
    incompatible?: string[];
    configuration?: FeatureConfig[];
}

export interface FeatureFile {
    path: string;
    action: 'replace' | 'add' | 'modify';
    content?: string;
    backup: boolean;
}

export interface FeatureConfig {
    key: string;
    value: string;
    description: string;
}

export interface MigrationProject {
    id: string;
    name: string;
    sourceVersion: string;
    targetVersion: string;
    features: string[]; // feature package ids
    pages: MigrationPage[];
    brandingGuide?: BrandingGuide;
    created: Date;
    lastModified: Date;
    workspaceRoot?: string;
}

export interface MigrationPage {
    sourceFile: string;
    targetFile: string;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    customizations: MigrationSelection[];
    lastModified?: Date;
}

export interface TemplateManifest {
    version: string;
    pages: TemplatePageInfo[];
    includes: string[];
    assets: string[];
    releaseDate: Date;
    releaseNotes?: string;
}

export interface TemplatePageInfo {
    fileName: string;
    type: 'form' | 'list' | 'report' | 'admin';
    description: string;
    aeonForm?: string;
}