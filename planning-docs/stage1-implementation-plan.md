# Aeon VS Code Extension - Stage 1 Implementation Plan

## Overview
Stage 1 establishes the foundation for the Aeon VS Code Extension by implementing core editing intelligence, language support, and basic validation. This plan is based on comprehensive analysis of the Aeon 6.0 source code and documentation.

## Architecture Overview

### Extension Structure
```
aeon-vscode-extension/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── language/
│   │   ├── aeonLanguageProvider.ts
│   │   ├── tagDefinitions.ts     # All Aeon tag definitions
│   │   └── syntax/
│   │       └── aeon.tmLanguage.json
│   ├── providers/
│   │   ├── completionProvider.ts
│   │   ├── hoverProvider.ts
│   │   ├── definitionProvider.ts
│   │   ├── referenceProvider.ts
│   │   └── diagnosticProvider.ts
│   ├── validators/
│   │   ├── tagValidator.ts
│   │   ├── formValidator.ts
│   │   └── includeValidator.ts
│   ├── snippets/
│   │   └── aeonSnippets.ts
│   ├── database/
│   │   └── fieldDefinitions.ts  # Database field metadata
│   └── utils/
│       ├── fileUtils.ts
│       └── tagParser.ts
├── package.json
├── syntaxes/
│   └── aeon.tmLanguage.json
├── snippets/
│   └── aeon.code-snippets
└── README.md
```

## Feature Implementation Details

### 1. Aeon Language Support

#### 1.1 Syntax Highlighting (aeon.tmLanguage.json)
```json
{
  "scopeName": "text.html.aeon",
  "patterns": [
    {
      "name": "tag.aeon.param",
      "match": "<#PARAM\\s+name=['\"]([^'\"]+)['\"]\\s*>",
      "captures": {
        "1": { "name": "variable.parameter.aeon" }
      }
    },
    {
      "name": "tag.aeon.include",
      "match": "<#INCLUDE\\s+(filename|type)=['\"]([^'\"]+)['\"]\\s*>",
      "captures": {
        "1": { "name": "keyword.control.aeon" },
        "2": { "name": "string.quoted.aeon" }
      }
    },
    {
      "name": "tag.aeon.status",
      "match": "<#STATUS\\s*>"
    },
    {
      "name": "tag.aeon.error",
      "match": "<#ERROR\\s+name=['\"]([^'\"]+)['\"]\\s*>",
      "captures": {
        "1": { "name": "variable.parameter.error.aeon" }
      }
    },
    {
      "name": "tag.aeon.option",
      "match": "<#OPTION\\s+name=['\"]([^'\"]+)['\"]([^>]*)>",
      "captures": {
        "1": { "name": "variable.parameter.aeon" },
        "2": { "name": "meta.tag.attributes.aeon" }
      }
    },
    {
      "name": "tag.aeon.table",
      "match": "<#TABLE\\s+name=['\"]([^'\"]+)['\"]([^>]*)>",
      "captures": {
        "1": { "name": "entity.name.tag.aeon" },
        "2": { "name": "meta.tag.attributes.aeon" }
      }
    }
  ]
}
```

#### 1.2 Tag Definitions (tagDefinitions.ts)
```typescript
export interface AeonTag {
  name: string;
  description: string;
  attributes: TagAttribute[];
  examples: string[];
  category: TagCategory;
}

export interface TagAttribute {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'enum';
  values?: string[];
  description: string;
}

export enum TagCategory {
  Display = 'display',
  Include = 'include',
  Control = 'control',
  Table = 'table',
  User = 'user',
  Activity = 'activity'
}

export const AEON_TAGS: Map<string, AeonTag> = new Map([
  ['PARAM', {
    name: 'PARAM',
    description: 'Displays the value of a parameter passed to the page',
    category: TagCategory.Display,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The parameter name to display'
      }
    ],
    examples: ['<#PARAM name="TransactionNumber">']
  }],
  ['INCLUDE', {
    name: 'INCLUDE',
    description: 'Includes content from another HTML file',
    category: TagCategory.Include,
    attributes: [
      {
        name: 'filename',
        required: false,
        type: 'string',
        description: 'The HTML file to include'
      },
      {
        name: 'type',
        required: false,
        type: 'enum',
        values: ['DetailedDocTypeInformation', 'Photoduplication', 'RISDocTypeInformation'],
        description: 'Special include type'
      }
    ],
    examples: [
      '<#INCLUDE filename="include_header.html">',
      '<#INCLUDE type="DetailedDocTypeInformation">'
    ]
  }],
  // ... additional tags
]);
```

### 2. IntelliSense & Autocomplete

#### 2.1 Completion Provider
```typescript
export class AeonCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const lineText = document.lineAt(position).text;
    const linePrefix = lineText.substr(0, position.character);
    
    // Tag completion
    if (linePrefix.endsWith('<#')) {
      return this.getTagCompletions();
    }
    
    // Attribute completion
    if (this.isInsideTag(linePrefix)) {
      return this.getAttributeCompletions(linePrefix);
    }
    
    // Field name completion for PARAM tags
    if (this.isParamTag(linePrefix)) {
      return this.getFieldCompletions();
    }
    
    // Include file completion
    if (this.isIncludeTag(linePrefix)) {
      return this.getIncludeFileCompletions();
    }
    
    return [];
  }
  
  private getFieldCompletions(): vscode.CompletionItem[] {
    return TRANSACTION_FIELDS.map(field => {
      const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
      item.detail = `${field.type} - ${field.description}`;
      item.documentation = new vscode.MarkdownString(field.documentation);
      return item;
    });
  }
}
```

#### 2.2 Database Field Definitions (fieldDefinitions.ts)
```typescript
export interface FieldDefinition {
  name: string;
  type: string;
  category: 'transaction' | 'user' | 'activity';
  description: string;
  documentation: string;
}

export const TRANSACTION_FIELDS: FieldDefinition[] = [
  {
    name: 'TransactionNumber',
    type: 'int',
    category: 'transaction',
    description: 'Unique transaction identifier',
    documentation: 'Primary key for the transaction'
  },
  {
    name: 'ItemTitle',
    type: 'nvarchar(255)',
    category: 'transaction',
    description: 'Title of the requested item',
    documentation: 'The main title of the material being requested'
  },
  {
    name: 'ItemAuthor',
    type: 'nvarchar(255)',
    category: 'transaction',
    description: 'Author or creator of the item',
    documentation: 'Person or organization responsible for creating the item'
  },
  // ... additional fields
];

export const USER_FIELDS: FieldDefinition[] = [
  {
    name: 'Username',
    type: 'nvarchar(50)',
    category: 'user',
    description: 'User login name',
    documentation: 'Primary key - unique identifier for the user'
  },
  {
    name: 'FirstName',
    type: 'nvarchar(50)',
    category: 'user',
    description: 'User first name',
    documentation: 'The user\'s given name'
  },
  // ... additional fields
];
```

### 3. Snippets Library

#### 3.1 Snippet Definitions
```json
{
  "Aeon Form Template": {
    "prefix": "aeon-form",
    "body": [
      "<!DOCTYPE html>",
      "<html lang=\"en-US\">",
      "<head>",
      "    <title>Aeon - ${1:Page Title}</title>",
      "    <#INCLUDE filename=\"include_head.html\">",
      "</head>",
      "<body>",
      "    <#INCLUDE filename=\"include_header.html\">",
      "    <#INCLUDE filename=\"include_nav.html\">",
      "    <div class=\"container\">",
      "        <main id=\"content\" aria-label=\"Content\">",
      "            <form action=\"aeon.dll\" method=\"post\" name=\"${2:FormName}\">",
      "                <input type=\"hidden\" name=\"AeonForm\" value=\"${2:FormName}\">",
      "                <h2>${3:Form Title}</h2>",
      "                <div id=\"statusLine\"><#STATUS></div>",
      "                $0",
      "            </form>",
      "        </main>",
      "        <#INCLUDE filename=\"include_footer.html\">",
      "    </div>",
      "</body>",
      "</html>"
    ],
    "description": "Basic Aeon form template"
  },
  "Form Field": {
    "prefix": "aeon-field",
    "body": [
      "<div class=\"form-group col-md-${1:6}\">",
      "    <label for=\"${2:FieldName}\">",
      "        <span class=\"<#ERROR name='ERROR${2:FieldName}'>\">",
      "            ${3:Field Label}",
      "        </span>",
      "        ${4:<span class=\"req\">(required)</span>}",
      "    </label>",
      "    <input type=\"${5:text}\" class=\"form-control\" name=\"${2:FieldName}\" id=\"${2:FieldName}\" value=\"<#PARAM name='${2:FieldName}'>\">",
      "</div>"
    ],
    "description": "Standard form field with error handling"
  }
}
```

### 4. File Navigation

#### 4.1 Definition Provider
```typescript
export class AeonDefinitionProvider implements vscode.DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Definition> {
    const range = document.getWordRangeAtPosition(position, /filename=["']([^"']+)["']/);
    if (!range) return;
    
    const text = document.getText(range);
    const match = /filename=["']([^"']+)["']/.exec(text);
    if (!match) return;
    
    const filename = match[1];
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) return;
    
    // Search for the file in the workspace
    const targetPath = path.join(workspaceFolder.uri.fsPath, filename);
    if (fs.existsSync(targetPath)) {
      return new vscode.Location(vscode.Uri.file(targetPath), new vscode.Position(0, 0));
    }
  }
}
```

### 5. Basic Validation

#### 5.1 Diagnostic Provider
```typescript
export class AeonDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('aeon');
  }
  
  public updateDiagnostics(document: vscode.TextDocument): void {
    const diagnostics: vscode.Diagnostic[] = [];
    
    // Validate tags
    diagnostics.push(...this.validateTags(document));
    
    // Validate form structure
    diagnostics.push(...this.validateFormStructure(document));
    
    // Validate includes
    diagnostics.push(...this.validateIncludes(document));
    
    // Validate field names
    diagnostics.push(...this.validateFieldNames(document));
    
    this.diagnosticCollection.set(document.uri, diagnostics);
  }
  
  private validateTags(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    const tagRegex = /<#(\w+)([^>]*)>/g;
    
    let match;
    while ((match = tagRegex.exec(text)) !== null) {
      const tagName = match[1];
      if (!AEON_TAGS.has(tagName)) {
        const start = document.positionAt(match.index);
        const end = document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(start, end);
        
        diagnostics.push(new vscode.Diagnostic(
          range,
          `Unknown Aeon tag: ${tagName}`,
          vscode.DiagnosticSeverity.Error
        ));
      }
    }
    
    return diagnostics;
  }
  
  private validateFormStructure(document: vscode.TextDocument): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    
    // Check for required form fields
    if (text.includes('<form')) {
      // Check for AeonForm hidden field
      if (!text.includes('name="AeonForm"')) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          'Form is missing required hidden field: AeonForm',
          vscode.DiagnosticSeverity.Warning
        ));
      }
      
      // Check for action="aeon.dll"
      if (!text.includes('action="aeon.dll"')) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          'Form action should be "aeon.dll"',
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
    
    return diagnostics;
  }
}
```

## Implementation Timeline

### Week 1-2: Core Language Support
- [ ] Set up extension project structure
- [ ] Implement syntax highlighting (aeon.tmLanguage.json)
- [ ] Create tag definition system
- [ ] Basic tag validation

### Week 3-4: IntelliSense
- [ ] Implement completion provider
- [ ] Add database field completions
- [ ] Include file path completion
- [ ] Form action/type completions

### Week 5-6: Navigation & Snippets
- [ ] Implement go to definition for includes
- [ ] Add find all references
- [ ] Create snippet library
- [ ] Quick open for Aeon files

### Week 7-8: Validation & Testing
- [ ] Complete validation system
- [ ] Add hover provider for documentation
- [ ] Create test suite
- [ ] Documentation and examples

## Configuration Schema

```json
{
  "aeon.webRootPath": {
    "type": "string",
    "default": "",
    "description": "Root path for Aeon web files"
  },
  "aeon.validateOnSave": {
    "type": "boolean",
    "default": true,
    "description": "Enable validation when saving files"
  },
  "aeon.includeSearchPaths": {
    "type": "array",
    "default": [".", "includes"],
    "description": "Paths to search for include files"
  },
  "aeon.enableSnippets": {
    "type": "boolean",
    "default": true,
    "description": "Enable Aeon code snippets"
  }
}
```

## Testing Strategy

### Unit Tests
- Tag parser functionality
- Field completion accuracy
- Validation rules
- Include file resolution

### Integration Tests
- Full document validation
- Multi-file navigation
- Snippet insertion
- IntelliSense in various contexts

### Manual Testing Scenarios
1. Create new Aeon form from template
2. Edit existing form with validation
3. Navigate between include files
4. Use IntelliSense for all tag types
5. Test with real Aeon 6.0 pages

## Success Metrics
- 100% of Aeon tags recognized and highlighted
- < 100ms response time for IntelliSense
- Zero false positives in validation
- 90%+ accuracy in field name suggestions
- Successful navigation for all include types

## Next Steps for Stage 2
- Implement webview for live preview
- Add tag processing simulation
- Create mock data system
- Build responsive testing framework