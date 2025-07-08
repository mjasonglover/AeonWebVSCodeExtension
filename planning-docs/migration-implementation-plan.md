# Aeon Page Migration & Modernization Tools - Implementation Plan

## Overview

This implementation plan outlines the development of interactive tools to help internal developers and customers migrate their customized Aeon web pages to the latest version (bundled with the extension) while preserving their content customizations and applying fresh branding from their institutional branding guides. This addresses the common challenge of updating older Aeon installations that have accumulated years of customizations, outdated CSS, and structural changes. The extension includes the latest Aeon default pages, ensuring everyone migrates to the same current version with clean, modern styling.

## Core Objectives

1. **Interactive Migration**: Provide a visual interface to selectively migrate content from old pages to new templates
2. **Smart Migration**: Allow users to choose which content customizations to keep while applying fresh branding from their guide
3. **Feature Integration**: Enable automatic integration of new features (like appointment scheduling) at project start
4. **Visual Comparison**: Offer side-by-side diff views to see changes between old and new pages
5. **Seamless Integration**: Work with existing preview system from Stage 2

## Architecture Overview

### Components

1. **Page Analyzer**
   - Parses old Aeon pages to identify customizations
   - Compares against bundled latest version templates
   - Focuses on content and structural changes
   - Identifies custom JavaScript functionality

2. **Branding Guide Processor**
   - Extracts branding elements from guides (PDF, web, manual input)
   - Generates modern CSS with CSS variables
   - Creates responsive, accessible styles
   - Produces consistent branding across all pages

2. **Migration Workspace**
   - Side-by-side view of old vs new pages
   - Branding guide application panel
   - Interactive selection of content to migrate
   - Real-time preview with new branding applied

3. **Feature Installer**
   - Manages feature packages (appointment scheduling, etc.)
   - Handles file replacements at project initialization
   - Tracks which features are installed

4. **Diff Engine**
   - Visual comparison of HTML/CSS differences
   - Highlights customizations vs standard content
   - Toggle between diff view and preview

5. **Migration Engine**
   - Applies selected customizations to new templates
   - Preserves Aeon tag structure while updating HTML/CSS
   - Generates migration report

## User Workflow

### 1. Project Initialization
```
1. User starts new migration project
2. User specifies their current Aeon version
3. Extension uses bundled latest pages (e.g., v6.0.20)
4. User chooses features to include (appointment scheduling, dualauth portals, etc.)
5. System installs base files and features
6. User begins page-by-page migration
```

### 2. Page Migration Process
```
1. User selects old page to migrate
2. User provides/selects branding guide (one time)
3. System analyzes page and identifies content customizations
4. User sees side-by-side comparison
5. User interactively selects what to keep:
   - Text changes and content
   - Field arrangements
   - Custom functionality (JS will be rewritten)
6. System applies selections to new template
7. System applies branding from guide
8. User previews result and adjusts as needed
9. User saves migrated page
```

### 3. Feature Integration (Project Start Only)
```
1. User selects features to add:
   - Appointment Scheduling
   - Dual Authentication (Portal1 or SimpleSquares)
2. System shows affected files and requirements
3. User confirms installation
4. System:
   - Installs feature files
   - Shows configuration requirements
   - Updates web.config if needed
5. Features are available throughout migration
```

### 4. Dual Authentication Feature Details

**Portal1 DAP**
- Modern design with gradient banner
- Atlas Systems branding
- Cookie consent integration
- Minimal text, clean interface
- Files: AtlasAuthPortal/Views/Portal/Index.cshtml

**SimpleSquares DAP**
- Functional design with detailed policies
- Larger square buttons (175x150px)
- Extensive user instructions
- Blue color scheme
- Files: AtlasAuthPortal/Views/Portal/Index.cshtml

**Both require**:
- .NET Framework 4.7.2+
- AtlasAuthPortal application setup
- Web.config configuration
- RemoteAuth and AtlasAuth endpoints

## Technical Implementation

### 1. Page Analyzer Service

```typescript
interface PageAnalysis {
    originalPage: string;
    customizations: {
        branding: BrandingChange[];
        content: ContentChange[];
        structure: StructuralChange[];
        javascript: ScriptChange[];
    };
    aeonVersion: string;
    detectedFeatures: string[];
}

interface BrandingGuide {
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

interface LogoAsset {
    url: string;
    width: number;
    height: number;
    placement: 'header' | 'footer' | 'both';
}

interface ContentChange {
    type: 'text' | 'label' | 'help' | 'error';
    location: string;
    oldValue: string;
    newValue: string;
}

interface StructuralChange {
    type: 'field-moved' | 'field-added' | 'field-removed' | 'section-reordered';
    fieldId: string;
    oldPosition: FieldPosition;
    newPosition?: FieldPosition;
}

interface ScriptChange {
    type: 'inline' | 'external' | 'event-handler';
    content: string;
    purpose?: string; // AI-analyzed purpose
    suggestedRewrite?: string;
    location: string;
}
```

### 2. Migration Workspace UI

```typescript
interface MigrationWorkspace {
    oldPage: PageData;
    newTemplate: PageData; // From bundled latest version
    selectedCustomizations: Set<string>;
    diffView: boolean;
    previewMode: 'split' | 'merged' | 'diff';
}

interface MigrationSelection {
    customizationId: string;
    type: 'keep' | 'discard' | 'modify';
    modifiedValue?: string;
}
```

### 3. Feature Package System

```typescript
interface FeaturePackage {
    id: string;
    name: string;
    version: string;
    description: string;
    files: FeatureFile[];
    requirements: string[];
    incompatible?: string[];
}

// Planned feature packages:
// - appointment-scheduling
// - dualauth-portal1 (Modern design with banner)
// - dualauth-simplesquares (Information-rich design)

interface FeatureFile {
    path: string;
    action: 'replace' | 'add' | 'modify';
    content?: string;
    backup: boolean;
}

// Example feature packages:
const dualAuthPortal1: FeaturePackage = {
    id: 'dualauth-portal1',
    name: 'Modern Dual Authentication Portal',
    version: '6.0.20',
    description: 'Modern design with Atlas branding and cookie consent',
    files: [{
        path: 'AtlasAuthPortal/Views/Portal/Index.cshtml',
        action: 'replace',
        backup: true
    }],
    requirements: ['.NET Framework 4.7.2', 'IIS Application Setup'],
    incompatible: ['dualauth-simplesquares']
};

const dualAuthSimpleSquares: FeaturePackage = {
    id: 'dualauth-simplesquares',
    name: 'Simple Squares Dual Authentication Portal',
    version: '6.0.20',
    description: 'Information-rich design with usage policies',
    files: [{
        path: 'AtlasAuthPortal/Views/Portal/Index.cshtml',
        action: 'replace',
        backup: true
    }],
    requirements: ['.NET Framework 4.7.2', 'IIS Application Setup'],
    incompatible: ['dualauth-portal1']
};
```

## Implementation Phases

### Phase 1: Core Infrastructure (Weeks 1-3) ✅ COMPLETED
- [x] Set up bundled page template loader with auto-update mechanism
- [x] Create page analyzer service  
- [x] Build customization detection algorithms
- [x] Implement JavaScript analysis for purpose detection
- [x] Implement diff engine
- [x] Set up storage for migration projects

**Completed Components:**
- `templateLoader.ts` - Loads bundled Aeon pages with version detection
- `pageAnalyzer.ts` - Analyzes pages for customizations and changes
- `contentDetector.ts` - Detects text, label, and field customizations
- `brandingProcessor.ts` - Processes branding guides and generates CSS
- `diffEngine.ts` - Creates visual diffs between old and new pages
- `migrationStorage.ts` - Manages project persistence and page data

### Phase 2: Migration Workspace (Weeks 4-6) ✅ COMPLETED
- [x] Build webview-based migration UI
- [x] Implement side-by-side comparison view
- [x] Create interactive selection interface
- [x] Add real-time preview updates

**Completed Components:**
- `migrationPanel.ts` - Webview-based UI for migration workflow
- `migrationPanel.css/js` - Frontend assets for interactive UI
- `migrationWorkspace.ts` - Orchestrates migration projects
- `migrationEngine.ts` - Applies customizations to templates
- `featureInstaller.ts` - Manages feature package installation

### Phase 3: Feature Package System (Weeks 7-8)
- [ ] Design feature package format
- [ ] Build feature installer
- [ ] Create appointment scheduling package
- [ ] Implement rollback mechanism

### Phase 4: Migration Engine (Weeks 9-11)
- [ ] Build customization application logic
- [ ] Implement CSS merging algorithm
- [ ] Create content migration system
- [ ] Add validation for migrated pages

### Phase 5: Integration & Polish (Weeks 12-13)
- [ ] Integrate with existing preview system
- [ ] Add migration history/undo
- [ ] Create migration reports
- [ ] Build help documentation

### Phase 6: Testing & Refinement (Weeks 14-15)
- [ ] Test with various Aeon versions
- [ ] Handle edge cases
- [ ] Performance optimization
- [ ] User acceptance testing

## Key Features

### 1. Smart Content Detection
- Detects modified text and labels
- Recognizes field reordering and additions
- Identifies custom Aeon tag modifications
- Analyzes custom JavaScript to understand its purpose
- Suggests modern rewrites for custom JavaScript

### 2. Branding Guide Integration
- Accepts PDF, web links, or manual brand input
- Extracts colors, fonts, logos automatically
- Generates clean, modern CSS with variables
- Applies consistent branding across all pages
- Creates maintainable, accessible styles

### 2. Interactive Selection UI
- Visual highlighting of customizations
- Checkbox selection for each change
- Group selections (all branding, all content, etc.)
- Inline editing of migrated values

### 3. Diff View Options
- Side-by-side HTML comparison
- Unified diff view
- Visual preview comparison
- CSS diff highlighting

### 4. Feature Management
- Pre-migration feature installation
- Feature compatibility checking
- Automatic file backup before changes
- Feature removal/rollback option

### 5. Migration Reports
- Summary of changes applied
- List of customizations preserved
- Warnings about incompatible changes
- Suggested manual reviews

## User Interface Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Aeon Page Migration - RequestForm.html                      │
├─────────────────────────────────────────────────────────────┤
│ [← Back] [Toggle Diff] [Preview Mode ▼] [Save Migration]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┬─────────────────────┬─────────────┐│
│ │   Original (v5.0)   │   New (v6.0.20)     │ Selections  ││
│ ├─────────────────────┼─────────────────────┼─────────────┤│
│ │                     │                     │ Branding:   ││
│ │  [Original Page     │  [New Template      │ ☑ Logo      ││
│ │   Preview]          │   Preview]          │ ☑ Colors    ││
│ │                     │                     │ ☐ Fonts     ││
│ │                     │                     │             ││
│ │  • Custom header    │  • Standard header  │ Content:    ││
│ │  • Modified fields  │  • New fields       │ ☑ Labels    ││
│ │  • Custom CSS       │  • Updated CSS      │ ☑ Help Text ││
│ │                     │                     │ ☐ Errors    ││
│ │                     │                     │             ││
│ │                     │                     │ Structure:  ││
│ │                     │                     │ ☑ Field Ord ││
│ │                     │                     │ ☐ Sections  ││
│ └─────────────────────┴─────────────────────┴─────────────┘│
│ [Apply Selected] [Reset] [View Migration Preview]           │
└─────────────────────────────────────────────────────────────┘
```

## Feature Package Specifications

### Dual Authentication Portals

Both dual auth features provide a front-end authentication choice page that routes users to either RemoteAuth (institutional) or AtlasAuth (external) authentication.

#### Portal1 DAP
- **Design**: Modern with gradient banner and Atlas Systems branding
- **Cookie Consent**: Integrated cookie acceptance functionality
- **Button Style**: Horizontal buttons (175x75px)
- **Color Scheme**: Dark blue (#08415c)
- **Content**: Minimal text for clean appearance
- **Target Users**: Institutions wanting professional, modern look

#### SimpleSquares DAP
- **Design**: Functional with emphasis on information
- **Content**: Detailed special collections policies and instructions
- **Button Style**: Large square buttons (175x150px)
- **Color Scheme**: Bright blue (#0062b8)
- **Policy Display**: Extensive new user instructions
- **Target Users**: Institutions needing to communicate policies upfront

#### Installation Requirements (Both)
1. Deploy AtlasAuthPortal application
2. Configure IIS application settings
3. Update web.config:
   ```xml
   <add key="SessionCookieName" value="AeonSessionID" />
   <add key="UsePersistentRedirectCookie" value="true" />
   <add key="AuthTypeCookieName" value="AtlasAuthType" />
   ```
4. Configure authentication endpoints

## Success Metrics

1. **Migration Speed**: 80% reduction in time to update pages
2. **Accuracy**: 95% of customizations correctly preserved
3. **User Satisfaction**: Positive feedback from beta users
4. **Feature Adoption**: 50% of migrations use new features
5. **Error Reduction**: 90% fewer manual migration errors

## Technical Requirements

- VS Code 1.85.0+
- Node.js 16+
- Existing Aeon preview system (Stage 2)
- Bundled latest Aeon default pages (included with extension)

## File Structure

```
Aeon_DefaultWebPages_v6.0.20/  # Bundled latest pages
├── DefaultRequest.html
├── ViewRequests.html
├── css/
├── js/
└── includes/

src/
├── migration/
│   ├── pageAnalyzer.ts
│   ├── migrationWorkspace.ts
│   ├── diffEngine.ts
│   ├── migrationEngine.ts
│   ├── contentDetector.ts
│   └── brandingProcessor.ts
├── features/
│   ├── featureInstaller.ts
│   ├── featurePackage.ts
│   └── packages/
│       ├── appointment-scheduling/
│       ├── dualauth-portal1/
│       └── dualauth-simplesquares/
├── ui/
│   ├── migrationPanel.ts
│   ├── diffViewer.ts
│   └── selectionInterface.ts
└── types/
    └── migration.types.ts
```

## Next Steps

1. Review and approve this implementation plan
2. Begin Phase 1 development
3. Create detailed technical specifications
4. Set up development environment
5. Start building page analyzer

## Implementation Notes (Based on Stakeholder Feedback)

1. **Customization Patterns**: No specific patterns prioritized initially
2. **Additional Features**: 
   - **Portal1 DualAuth**: Modern design with Atlas branding, cookie consent
   - **SimpleSquares DualAuth**: Information-rich design with usage policies
3. **Version Detection**: Users will specify their current version
4. **JavaScript Handling**: Detect custom JS, analyze its purpose, and provide modern rewrites
5. **Auto-Update**: Extension will auto-update when new default pages are released

## Branding Guide Integration

Instead of preserving old custom CSS (which may be outdated or poorly structured), the migration tool will:

1. **Accept branding guides** in common formats (PDF, web links, or manual input)
2. **Extract branding elements**:
   - Primary/secondary colors
   - Typography (fonts, sizes, hierarchy)
   - Logo files and placement rules
   - Spacing and layout guidelines
3. **Generate clean, modern CSS** that applies the branding to the new pages
4. **Create CSS variables** for easy future updates

This approach ensures migrated pages have fresh, maintainable styling that follows current web standards.