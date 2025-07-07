# Aeon VS Code Extension - Stage 2 Implementation Plan

## Overview
Stage 2 builds upon the foundation from Stage 1 by introducing Live Preview & Visualization capabilities. This stage focuses on providing real-time feedback through a webview-based preview system, simulated tag processing, responsive testing, and mock data management.

## Architecture Overview

### Extension Structure (Stage 2 Additions)
```
aeon-vscode-extension/
├── src/
│   ├── preview/
│   │   ├── previewManager.ts        # Manages webview lifecycle
│   │   ├── previewPanel.ts          # Webview panel implementation
│   │   ├── tagProcessor.ts          # Simulates Aeon DLL tag processing
│   │   ├── contentRenderer.ts       # Renders processed content
│   │   └── previewServer.ts         # Local server for assets
│   ├── mockData/
│   │   ├── mockDataManager.ts       # Mock data management
│   │   ├── dataProfiles.ts          # Pre-defined data scenarios
│   │   ├── mockDataProvider.ts      # Provides data for tags
│   │   └── schemas/
│   │       ├── transactionSchema.ts
│   │       ├── userSchema.ts
│   │       └── activitySchema.ts
│   ├── responsive/
│   │   ├── deviceFrames.ts          # Device frame definitions
│   │   ├── viewportManager.ts       # Viewport size management
│   │   └── responsiveTools.ts       # Responsive testing utilities
│   ├── visualization/
│   │   ├── tagVisualizer.ts         # Tag highlighting/overlay
│   │   ├── includeTracker.ts        # Track include hierarchy
│   │   └── flowVisualizer.ts        # Form submission flow
│   ├── styling/
│   │   ├── themeManager.ts          # Theme switching
│   │   ├── cssInjector.ts           # Live CSS injection
│   │   └── styleValidator.ts        # CSS validation for Aeon
│   └── webview/
│       ├── preview.html             # Webview HTML template
│       ├── preview.css              # Webview styles
│       └── preview.js               # Webview client scripts
├── media/                           # Static resources
│   ├── devices/                     # Device frame images
│   ├── icons/                       # UI icons
│   └── styles/                      # Preview styles
└── test/
    └── preview/                     # Preview-specific tests
```

## Feature Implementation Details

### 1. Live Preview Panel

#### 1.1 Preview Manager
```typescript
export class PreviewManager {
  private static instance: PreviewManager;
  private panels: Map<string, PreviewPanel> = new Map();
  private tagProcessor: TagProcessor;
  private mockDataManager: MockDataManager;
  
  constructor(
    private context: vscode.ExtensionContext,
    private extensionUri: vscode.Uri
  ) {
    this.tagProcessor = new TagProcessor();
    this.mockDataManager = new MockDataManager();
  }
  
  public async showPreview(document: vscode.TextDocument): Promise<void> {
    const key = document.uri.toString();
    let panel = this.panels.get(key);
    
    if (!panel) {
      panel = new PreviewPanel(
        this.context,
        this.extensionUri,
        document,
        this.tagProcessor,
        this.mockDataManager
      );
      this.panels.set(key, panel);
      
      panel.onDidDispose(() => {
        this.panels.delete(key);
      });
    }
    
    panel.reveal();
    await panel.update();
  }
  
  public async updatePreview(document: vscode.TextDocument): Promise<void> {
    const panel = this.panels.get(document.uri.toString());
    if (panel) {
      await panel.update();
    }
  }
}
```

#### 1.2 Preview Panel Implementation
```typescript
export class PreviewPanel {
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  
  constructor(
    private context: vscode.ExtensionContext,
    private extensionUri: vscode.Uri,
    private document: vscode.TextDocument,
    private tagProcessor: TagProcessor,
    private mockDataManager: MockDataManager
  ) {
    this.panel = vscode.window.createWebviewPanel(
      'aeonPreview',
      `Preview: ${path.basename(document.fileName)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'media'),
          vscode.Uri.joinPath(extensionUri, 'node_modules'),
          vscode.workspace.getWorkspaceFolder(document.uri)!.uri
        ]
      }
    );
    
    this.setupWebview();
    this.setupMessageHandling();
  }
  
  private setupMessageHandling(): void {
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'updateMockData':
            await this.mockDataManager.updateField(message.field, message.value);
            await this.update();
            break;
          case 'changeViewport':
            await this.updateViewport(message.width, message.height);
            break;
          case 'highlightTag':
            await this.highlightSourceTag(message.tagId);
            break;
          case 'navigateToInclude':
            await this.openIncludeFile(message.filename);
            break;
        }
      },
      null,
      this.disposables
    );
  }
  
  public async update(): Promise<void> {
    const html = await this.getPreviewHtml();
    this.panel.webview.html = html;
  }
  
  private async getPreviewHtml(): Promise<string> {
    const content = this.document.getText();
    const mockData = await this.mockDataManager.getCurrentData();
    const processed = await this.tagProcessor.process(content, mockData);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="${this.getResourceUri('media/styles/preview.css')}" rel="stylesheet">
          <link href="${this.getResourceUri('media/styles/aeon.css')}" rel="stylesheet">
          <link href="${this.getResourceUri('node_modules/bootstrap/dist/css/bootstrap.min.css')}" rel="stylesheet">
        </head>
        <body>
          <div id="preview-controls">
            ${this.getControlsHtml()}
          </div>
          <div id="preview-frame">
            <div id="preview-content">
              ${processed.html}
            </div>
          </div>
          <script src="${this.getResourceUri('media/scripts/preview.js')}"></script>
        </body>
      </html>
    `;
  }
}
```

### 2. Tag Processing Engine

#### 2.1 Tag Processor Implementation
```typescript
export interface ProcessingContext {
  mockData: MockData;
  includedFiles: Set<string>;
  errors: ProcessingError[];
  tagMap: Map<string, TagInfo>;
}

export class TagProcessor {
  private tagHandlers: Map<string, TagHandler>;
  
  constructor() {
    this.registerHandlers();
  }
  
  private registerHandlers(): void {
    this.tagHandlers = new Map([
      ['PARAM', new ParamTagHandler()],
      ['INCLUDE', new IncludeTagHandler()],
      ['STATUS', new StatusTagHandler()],
      ['ERROR', new ErrorTagHandler()],
      ['OPTION', new OptionTagHandler()],
      ['TABLE', new TableTagHandler()],
      ['CONDITIONAL', new ConditionalTagHandler()],
      ['USER', new UserTagHandler()],
      ['ACTIVITY', new ActivityTagHandler()],
      ['FORMSTATE', new FormStateTagHandler()],
    ]);
  }
  
  public async process(
    content: string, 
    mockData: MockData
  ): Promise<ProcessingResult> {
    const context: ProcessingContext = {
      mockData,
      includedFiles: new Set(),
      errors: [],
      tagMap: new Map()
    };
    
    // Process tags recursively
    const processed = await this.processTags(content, context);
    
    return {
      html: processed,
      context,
      timestamp: Date.now()
    };
  }
  
  private async processTags(
    content: string, 
    context: ProcessingContext
  ): Promise<string> {
    const tagRegex = /<#(\w+)([^>]*)>/g;
    let processed = content;
    let match;
    let tagIndex = 0;
    
    const replacements: Array<{start: number, end: number, replacement: string}> = [];
    
    while ((match = tagRegex.exec(content)) !== null) {
      const tagName = match[1];
      const attributes = match[2];
      const tagId = `tag-${tagIndex++}`;
      
      const handler = this.tagHandlers.get(tagName);
      if (handler) {
        try {
          const replacement = await handler.process(attributes, context);
          const wrappedReplacement = `<span class="aeon-tag" data-tag="${tagName}" data-tag-id="${tagId}">${replacement}</span>`;
          
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: wrappedReplacement
          });
          
          context.tagMap.set(tagId, {
            type: tagName,
            attributes,
            originalText: match[0],
            position: { line: 0, column: match.index } // Calculate actual line/column
          });
        } catch (error) {
          context.errors.push({
            tag: tagName,
            message: error.message,
            position: match.index
          });
        }
      }
    }
    
    // Apply replacements in reverse order
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { start, end, replacement } = replacements[i];
      processed = processed.substring(0, start) + replacement + processed.substring(end);
    }
    
    return processed;
  }
}
```

#### 2.2 Tag Handlers
```typescript
abstract class TagHandler {
  abstract process(attributes: string, context: ProcessingContext): Promise<string>;
  
  protected parseAttributes(attrString: string): Map<string, string> {
    const attrs = new Map<string, string>();
    const regex = /(\w+)=["']([^"']+)["']/g;
    let match;
    
    while ((match = regex.exec(attrString)) !== null) {
      attrs.set(match[1], match[2]);
    }
    
    return attrs;
  }
}

class ParamTagHandler extends TagHandler {
  async process(attributes: string, context: ProcessingContext): Promise<string> {
    const attrs = this.parseAttributes(attributes);
    const paramName = attrs.get('name');
    
    if (!paramName) {
      throw new Error('PARAM tag requires a name attribute');
    }
    
    // Get value from mock data
    const value = context.mockData.getField(paramName) || '';
    
    return `<span class="param-value" data-field="${paramName}">${this.escapeHtml(value)}</span>`;
  }
  
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

class IncludeTagHandler extends TagHandler {
  async process(attributes: string, context: ProcessingContext): Promise<string> {
    const attrs = this.parseAttributes(attributes);
    const filename = attrs.get('filename');
    const type = attrs.get('type');
    
    if (type) {
      return this.processSpecialInclude(type, context);
    }
    
    if (!filename) {
      throw new Error('INCLUDE tag requires filename or type attribute');
    }
    
    // Prevent circular includes
    if (context.includedFiles.has(filename)) {
      return `<!-- Circular include detected: ${filename} -->`;
    }
    
    context.includedFiles.add(filename);
    
    try {
      const content = await this.loadIncludeFile(filename);
      // Process tags in included content
      const processor = new TagProcessor();
      const processed = await processor.processTags(content, context);
      
      return `<div class="include-content" data-include="${filename}">${processed}</div>`;
    } catch (error) {
      return `<!-- Include file not found: ${filename} -->`;
    }
  }
  
  private async loadIncludeFile(filename: string): Promise<string> {
    // Load file from workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) throw new Error('No workspace folder');
    
    const filePath = path.join(workspaceFolder.uri.fsPath, filename);
    try {
      const fileUri = vscode.Uri.file(filePath);
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      return new TextDecoder().decode(fileContent);
    } catch {
      throw new Error(`File not found: ${filename}`);
    }
  }
  
  private processSpecialInclude(type: string, context: ProcessingContext): string {
    switch (type) {
      case 'DetailedDocTypeInformation':
        const docType = context.mockData.getField('DocumentType') || 'Default';
        return `<div class="doc-type-info">Document Type: ${docType}</div>`;
      
      case 'Photoduplication':
        if (context.mockData.getField('RequestType') === 'PhotoduplicationRequest') {
          return '<div class="photodup-info">Photoduplication options...</div>';
        }
        return '';
      
      default:
        return `<!-- Unknown include type: ${type} -->`;
    }
  }
}
```

### 3. Mock Data Management

#### 3.1 Mock Data Manager
```typescript
export class MockDataManager {
  private currentProfile: string = 'default';
  private customData: Map<string, any> = new Map();
  private profiles: Map<string, MockDataProfile>;
  
  constructor() {
    this.loadProfiles();
  }
  
  private loadProfiles(): void {
    this.profiles = new Map([
      ['default', new DefaultProfile()],
      ['newUser', new NewUserProfile()],
      ['returningUser', new ReturningUserProfile()],
      ['admin', new AdminProfile()],
      ['testData', new TestDataProfile()]
    ]);
  }
  
  public getCurrentData(): MockData {
    const profile = this.profiles.get(this.currentProfile)!;
    const baseData = profile.getData();
    
    // Merge with custom overrides
    this.customData.forEach((value, key) => {
      baseData.setField(key, value);
    });
    
    return baseData;
  }
  
  public async updateField(field: string, value: any): Promise<void> {
    this.customData.set(field, value);
  }
  
  public setProfile(profileName: string): void {
    if (this.profiles.has(profileName)) {
      this.currentProfile = profileName;
      this.customData.clear();
    }
  }
  
  public async saveCustomProfile(name: string): Promise<void> {
    const data = this.getCurrentData();
    const profile = new CustomProfile(name, data);
    this.profiles.set(name, profile);
    
    // Persist to workspace settings
    const config = vscode.workspace.getConfiguration('aeon');
    const customProfiles = config.get<any[]>('mockDataProfiles', []);
    customProfiles.push({
      name,
      data: data.toJSON()
    });
    await config.update('mockDataProfiles', customProfiles);
  }
}
```

#### 3.2 Mock Data Profiles
```typescript
export abstract class MockDataProfile {
  abstract getName(): string;
  abstract getData(): MockData;
}

export class DefaultProfile extends MockDataProfile {
  getName(): string { return 'Default'; }
  
  getData(): MockData {
    return new MockData({
      // Transaction fields
      TransactionNumber: '12345',
      TransactionStatus: 'Submitted',
      TransactionDate: new Date().toISOString(),
      ItemTitle: 'Sample Document Title',
      ItemAuthor: 'John Doe',
      ItemDate: '2023',
      CallNumber: 'MS 123.45',
      Location: 'Special Collections',
      
      // User fields
      Username: 'jdoe',
      FirstName: 'John',
      LastName: 'Doe',
      EmailAddress: 'jdoe@example.com',
      Status: 'Active',
      Department: 'Research',
      
      // Activity fields
      ActivityName: 'Reading Room Session',
      ActivityType: 'Research',
      BeginDate: new Date().toISOString(),
      
      // System fields
      RequestType: 'Loan',
      WebRequestForm: 'DefaultRequest',
      
      // Status messages
      StatusMessage: '',
      ErrorMessages: new Map()
    });
  }
}

export class MockData {
  private fields: Map<string, any>;
  
  constructor(initialData: Record<string, any>) {
    this.fields = new Map(Object.entries(initialData));
  }
  
  getField(name: string): any {
    return this.fields.get(name);
  }
  
  setField(name: string, value: any): void {
    this.fields.set(name, value);
  }
  
  toJSON(): Record<string, any> {
    return Object.fromEntries(this.fields);
  }
}
```

### 4. Responsive Testing Tools

#### 4.1 Device Frames
```typescript
export interface DeviceFrame {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  userAgent: string;
  hasFrame: boolean;
  frameImage?: string;
}

export const DEVICE_FRAMES: DeviceFrame[] = [
  {
    name: 'Desktop (1920x1080)',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    hasFrame: false
  },
  {
    name: 'iPad Pro',
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
    hasFrame: true,
    frameImage: 'ipad-pro-frame.png'
  },
  {
    name: 'iPhone 12',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    hasFrame: true,
    frameImage: 'iphone-12-frame.png'
  },
  {
    name: 'Custom',
    width: 800,
    height: 600,
    deviceScaleFactor: 1,
    userAgent: '',
    hasFrame: false
  }
];
```

#### 4.2 Viewport Manager
```typescript
export class ViewportManager {
  private currentDevice: DeviceFrame;
  private webview: vscode.Webview;
  
  constructor(webview: vscode.Webview) {
    this.webview = webview;
    this.currentDevice = DEVICE_FRAMES[0]; // Default to desktop
  }
  
  public async setDevice(deviceName: string): Promise<void> {
    const device = DEVICE_FRAMES.find(d => d.name === deviceName);
    if (!device) return;
    
    this.currentDevice = device;
    await this.updateViewport();
  }
  
  public async setCustomSize(width: number, height: number): Promise<void> {
    const customDevice = DEVICE_FRAMES.find(d => d.name === 'Custom')!;
    customDevice.width = width;
    customDevice.height = height;
    this.currentDevice = customDevice;
    await this.updateViewport();
  }
  
  private async updateViewport(): Promise<void> {
    await this.webview.postMessage({
      command: 'setViewport',
      device: this.currentDevice
    });
  }
  
  public getPreviewHtml(): string {
    if (this.currentDevice.hasFrame) {
      return `
        <div class="device-frame" style="background-image: url('${this.currentDevice.frameImage}')">
          <iframe 
            id="preview-iframe"
            style="width: ${this.currentDevice.width}px; height: ${this.currentDevice.height}px;"
            data-device-scale="${this.currentDevice.deviceScaleFactor}"
          ></iframe>
        </div>
      `;
    } else {
      return `
        <iframe 
          id="preview-iframe"
          style="width: ${this.currentDevice.width}px; height: ${this.currentDevice.height}px;"
        ></iframe>
      `;
    }
  }
}
```

### 5. Tag Visualization

#### 5.1 Tag Visualizer
```typescript
export class TagVisualizer {
  private overlayMode: 'none' | 'highlight' | 'labels' = 'none';
  
  public setMode(mode: 'none' | 'highlight' | 'labels'): void {
    this.overlayMode = mode;
  }
  
  public getVisualizationStyles(): string {
    switch (this.overlayMode) {
      case 'highlight':
        return `
          .aeon-tag {
            background-color: rgba(0, 123, 255, 0.1);
            border: 1px dashed #007bff;
            padding: 2px;
            position: relative;
          }
          .aeon-tag:hover {
            background-color: rgba(0, 123, 255, 0.2);
          }
        `;
      
      case 'labels':
        return `
          .aeon-tag {
            position: relative;
            background-color: rgba(0, 123, 255, 0.05);
          }
          .aeon-tag::before {
            content: attr(data-tag);
            position: absolute;
            top: -20px;
            left: 0;
            background: #007bff;
            color: white;
            padding: 2px 6px;
            font-size: 11px;
            border-radius: 3px;
            white-space: nowrap;
          }
        `;
      
      default:
        return '';
    }
  }
  
  public getIncludeVisualization(): string {
    return `
      .include-content {
        border: 2px solid #28a745;
        margin: 5px;
        padding: 5px;
        position: relative;
      }
      .include-content::before {
        content: "Include: " attr(data-include);
        position: absolute;
        top: -10px;
        left: 10px;
        background: white;
        color: #28a745;
        padding: 0 5px;
        font-size: 12px;
      }
    `;
  }
}
```

### 6. CSS & Style Tools

#### 6.1 Theme Manager
```typescript
export class ThemeManager {
  private themes: Map<string, Theme> = new Map();
  private currentTheme: string = 'default';
  
  constructor() {
    this.loadThemes();
  }
  
  private loadThemes(): void {
    this.themes.set('default', {
      name: 'Default Aeon',
      cssFile: 'aeon.css',
      customCSS: ''
    });
    
    this.themes.set('dark', {
      name: 'Dark Mode',
      cssFile: 'aeon-dark.css',
      customCSS: `
        body { background: #1e1e1e; color: #d4d4d4; }
        .form-control { background: #2d2d30; color: #d4d4d4; border-color: #3e3e42; }
      `
    });
    
    this.themes.set('highContrast', {
      name: 'High Contrast',
      cssFile: 'aeon.css',
      customCSS: `
        body { background: white; color: black; }
        a { color: #0000ff; text-decoration: underline; }
        .form-control { border: 2px solid black; }
      `
    });
  }
  
  public getThemeStyles(): string {
    const theme = this.themes.get(this.currentTheme)!;
    return theme.customCSS;
  }
  
  public setTheme(themeName: string): void {
    if (this.themes.has(themeName)) {
      this.currentTheme = themeName;
    }
  }
}
```

#### 6.2 Live CSS Editor
```typescript
export class CSSInjector {
  private customStyles: string = '';
  private webview: vscode.Webview;
  
  constructor(webview: vscode.Webview) {
    this.webview = webview;
  }
  
  public async updateStyles(css: string): Promise<void> {
    this.customStyles = css;
    await this.webview.postMessage({
      command: 'updateStyles',
      css: this.customStyles
    });
  }
  
  public async injectStylesheet(uri: vscode.Uri): Promise<void> {
    const content = await vscode.workspace.fs.readFile(uri);
    const css = new TextDecoder().decode(content);
    await this.updateStyles(css);
  }
}
```

## Implementation Timeline

### Week 1-2: Core Preview Infrastructure
- [ ] Create webview panel management system
- [ ] Implement basic tag processor
- [ ] Set up preview HTML generation
- [ ] Create update-on-save functionality

### Week 3-4: Tag Processing Engine
- [ ] Implement all tag handlers
- [ ] Add include file resolution
- [ ] Create error handling and reporting
- [ ] Build tag mapping for visualization

### Week 5-6: Mock Data System
- [ ] Design mock data schema
- [ ] Create default data profiles
- [ ] Implement data editor UI
- [ ] Add custom profile persistence

### Week 7-8: Responsive Testing
- [ ] Implement device frame system
- [ ] Create viewport controls
- [ ] Add custom size settings
- [ ] Build device emulation

### Week 9-10: Visualization Tools
- [ ] Create tag highlighting system
- [ ] Implement include visualization
- [ ] Add form flow visualization
- [ ] Build accessibility checker

### Week 11-12: CSS & Theming
- [ ] Implement theme system
- [ ] Create live CSS editor
- [ ] Add style validation
- [ ] Build print preview mode

## Configuration Schema (Stage 2)

```json
{
  "aeon.preview.autoRefresh": {
    "type": "boolean",
    "default": true,
    "description": "Automatically refresh preview on file save"
  },
  "aeon.preview.defaultDevice": {
    "type": "string",
    "default": "Desktop (1920x1080)",
    "enum": ["Desktop (1920x1080)", "iPad Pro", "iPhone 12", "Custom"],
    "description": "Default device for responsive preview"
  },
  "aeon.preview.showTagOverlay": {
    "type": "string",
    "default": "none",
    "enum": ["none", "highlight", "labels"],
    "description": "Tag visualization mode in preview"
  },
  "aeon.preview.theme": {
    "type": "string",
    "default": "default",
    "enum": ["default", "dark", "highContrast"],
    "description": "Preview theme"
  },
  "aeon.mockData.defaultProfile": {
    "type": "string",
    "default": "default",
    "description": "Default mock data profile"
  },
  "aeon.mockData.profiles": {
    "type": "array",
    "default": [],
    "description": "Custom mock data profiles"
  }
}
```

## Testing Strategy

### Unit Tests
- Tag processor accuracy
- Mock data field resolution
- Include file loading
- CSS injection

### Integration Tests
- Full page preview rendering
- Live update functionality
- Device switching
- Tag visualization

### Visual Tests
- Responsive layouts at different sizes
- Theme switching
- Tag overlay modes
- Print preview accuracy

### Performance Tests
- Preview update speed (< 200ms)
- Large file handling
- Multiple preview panels
- Mock data switching

## Success Metrics
- Preview updates in < 200ms after save
- 100% tag processing accuracy
- All device frames render correctly
- Mock data covers 95% of common fields
- Zero preview crashes in normal use

## Migration Guide from Stage 1
1. Install new dependencies (webview toolkit, etc.)
2. Update extension manifest with new commands
3. Add preview panel registration
4. Configure default mock data profiles
5. Update documentation with preview features

## Next Steps for Stage 3
- Implement version detection algorithms
- Build customization analysis engine
- Create migration mapping system
- Design conflict resolution UI