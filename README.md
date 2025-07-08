# Aeon VS Code Extension

Language support and development tools for Aeon web pages.

## 🚀 Quick Start

### Installation from VSIX

1. **Download the Extension**
   - Download `aeon-vscode-0.2.1.vsix` from this repository

2. **Install in VS Code**
   - Open VS Code
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Extensions: Install from VSIX..."
   - Select the downloaded `aeon-vscode-0.2.1.vsix` file
   - Reload VS Code when prompted

3. **Start Using**
   - Open any `.html` file with Aeon tags
   - Right-click in editor or file explorer → "Aeon: Show Preview"
   - Or press `Cmd+Shift+P` → "Aeon: Show Preview"

### Development Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/mjasonglover/AeonWebVSCodeExtension.git
   cd AeonWebVSCodeExtension
   npm install
   npm run compile
   ```

2. **Launch Extension**
   - Open folder in VS Code
   - Press `F5` to launch
   - Open any `.html` file with Aeon tags

### Essential Aeon Tags

```html
<#PARAM name="ItemTitle">           <!-- Display field value -->
<#USER field="Username">            <!-- User information -->
<#INCLUDE filename="header.html">   <!-- Include file -->
<#STATUS>                          <!-- Status messages -->
<#ERROR field="ItemTitle">         <!-- Field errors -->
<#TABLE name="Transactions">       <!-- Data tables -->
<#CONDITIONAL test="HasAccess">    <!-- Conditional content -->
```

### Key Features to Try

- **IntelliSense**: Type `<#` to see all tags
- **Live Preview**: Switch between Desktop/iPad/iPhone views
- **Tag Visualization**: Toggle between None/Highlight/Labels
- **Quick Edits**: Shift+Click any blue field value to edit inline
- **Navigation**: Ctrl+Click on include filenames to open them

## Features

### <� Syntax Highlighting
- Full syntax highlighting for all Aeon tags (`<#PARAM>`, `<#INCLUDE>`, `<#STATUS>`, etc.)
- Distinguishes between different tag types with appropriate colors
- Highlights tag attributes and values

### >� IntelliSense & Autocomplete
- **Tag Completion**: Auto-complete for all Aeon tags with descriptions
- **Attribute Suggestions**: Context-aware attribute suggestions for each tag
- **Database Field Completion**: Auto-complete for Aeon database fields (Transaction, User, Activity fields)
- **Include File Paths**: Auto-complete for include file paths
- **Form Actions & Types**: Numeric value completion for action and form attributes

### =� Hover Documentation
- Hover over any Aeon tag to see detailed documentation
- Field information displayed when hovering over database field names
- Action number descriptions when hovering over action values

### = Go to Definition
- Ctrl/Cmd+Click on include file paths to navigate directly to the file
- Right-click menu option "Go to Include File"

###  Real-time Validation
- **Tag Validation**: Identifies unknown tags and missing required attributes
- **Form Structure**: Validates form elements have required attributes (action="aeon.dll", AeonForm field)
- **Field Names**: Warns about potentially unknown database fields
- **Include Files**: Checks for common include file patterns
- **Duplicate IDs**: Detects duplicate HTML IDs in the document

### =� Code Snippets
- `aeon-form`: Complete Aeon form page template
- `aeon-request-form`: Request form with hidden fields
- `aeon-field`: Form field with error handling
- `aeon-textarea`: Textarea field
- `aeon-select`: Select dropdown with OPTION tag
- `aeon-includes`: Common include file set
- `aeon-table`: Table display tag
- `aeon-item-section`: Complete item information section
- And many more!

### 🚀 Stage 2: Live Preview & Visualization (NEW!)

#### 👁️ Live Preview Panel
- **Real-time Preview**: See your Aeon pages rendered live as you code
- **Split View**: Side-by-side editor and preview panels
- **Auto-refresh**: Preview updates automatically on save
- **Tag Processing**: Simulates Aeon DLL tag processing with mock data

#### 📊 Mock Data Management
- **Built-in Profiles**: 
  - Default - Standard user with sample data
  - New User - Empty registration form
  - Returning User - Partially completed request
  - Admin - Full access testing
  - Test Data - Edge cases and validation testing
- **Custom Profiles**: Create and save your own mock data profiles
- **Quick Field Editing**: Shift+Click any field value in preview to edit inline
- **Mock Data Editor**: Comprehensive editor for all database fields

#### 📱 Responsive Testing
- **Device Presets**: 
  - Desktop (1920x1080, 1366x768)
  - iPad Pro, iPad Air
  - iPhone 14 Pro, iPhone SE
  - Samsung Galaxy S21, Pixel 5
- **Custom Viewport**: Set any custom size for testing
- **Device Rotation**: Test landscape/portrait orientations
- **Zoom Controls**: Test different zoom levels

#### 🎨 Tag Visualization
- **Highlight Mode**: Color-coded highlighting of all Aeon tags
- **Label Mode**: Shows tag type labels above each tag
- **Flow Mode**: Visualizes form structure and conditional logic
- **Include Tracking**: See nested include file hierarchy

#### 🎭 Theme Support
- **Built-in Themes**: 
  - Default Aeon - Standard interface
  - Dark Mode - Low-light optimized
  - High Contrast - Maximum accessibility
  - Print Preview - Print-optimized layout
  - Minimal - Clean, modern design
- **Custom Themes**: Create and save your own CSS themes
- **Live CSS Editor**: Inject custom CSS for testing
- **Theme Import/Export**: Share themes with your team

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Aeon"
4. Click Install

## Usage

### Getting Started
1. Open any HTML file containing Aeon tags
2. The extension automatically activates when it detects Aeon content
3. Start typing `<#` to see tag suggestions

### Configuration
You can configure the extension in VS Code settings:

**Core Settings:**
- `aeon.webRootPath`: Root path for Aeon web files
- `aeon.validateOnSave`: Enable/disable validation when saving files (default: true)
- `aeon.includeSearchPaths`: Paths to search for include files (default: [".", "includes"])
- `aeon.enableSnippets`: Enable/disable code snippets (default: true)

**Preview Settings (Stage 2):**
- `aeon.preview.autoRefresh`: Automatically refresh preview on save (default: true)
- `aeon.preview.defaultDevice`: Default preview device (default: "Desktop (1920x1080)")
- `aeon.preview.showTagOverlay`: Tag visualization mode (default: "none")
- `aeon.preview.theme`: Preview theme (default: "default")
- `aeon.mockData.defaultProfile`: Default mock data profile (default: "default")
- `aeon.mockData.profiles`: Custom mock data profiles (default: [])

### Commands
Access these commands from the Command Palette (Ctrl+Shift+P):

**Core Commands:**
- `Aeon: Validate Current Document` - Run validation on the current file
- `Aeon: Insert Tag` - Show a list of Aeon tags to insert
- `Aeon: Go to Include File` - Navigate to the include file under cursor

**Preview Commands (Stage 2):**
- `Aeon: Show Preview` - Open live preview panel
- `Aeon: Refresh Preview` - Manually refresh the preview
- `Aeon: Change Preview Device` - Select a different device viewport
- `Aeon: Toggle Tag Visualization` - Switch between visualization modes
- `Aeon: Edit Mock Data` - Open the mock data editor
- `Aeon: Change Mock Data Profile` - Switch between data profiles

### Using Live Preview

1. **Open Preview**: 
   - Click the preview icon in the editor title bar, or
   - Right-click in an HTML file and select "Aeon: Show Preview", or
   - Use Command Palette: `Aeon: Show Preview`

2. **Edit Mock Data**:
   - Shift+Click any field value in the preview to edit it inline
   - Use the Mock Data button in the preview toolbar for bulk editing
   - Switch between profiles using the toolbar or command palette

3. **Test Responsive Design**:
   - Select different devices from the device dropdown
   - Use "Custom" to set specific dimensions
   - Preview automatically scales to fit the viewport

4. **Visualize Tags**:
   - Use the visualization dropdown to switch modes
   - "Highlight" mode shows color-coded tags
   - "Labels" mode displays tag names
   - "Flow" mode shows form structure

### Tag Color Reference

- 🔵 Blue: PARAM
- 🟢 Green: INCLUDE  
- 🔷 Cyan: STATUS
- 🔴 Red: ERROR
- 🟣 Purple: USER
- 🟠 Orange: TABLE

### Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Open Preview | Ctrl+Shift+P → "Aeon: Preview" | Cmd+Shift+P → "Aeon: Preview" |
| Go to Definition | Ctrl+Click | Cmd+Click |
| Trigger Suggestions | Ctrl+Space | Cmd+Space |
| Quick Fix | Ctrl+. | Cmd+. |

### Test Scenarios

1. **Basic Page Test**
   - Open `DefaultRequest.html`
   - Preview should show styled form
   - Try different devices and zoom levels

2. **Mock Data Test**  
   - Click "Mock Data" button
   - Change "TransactionNumber" 
   - See it update in preview

3. **Tag Visualization**
   - Select "Highlight Tags"
   - See colored borders on all Aeon tags
   - Select "Show Tag Labels" 
   - See tag types above each tag

## Supported Aeon Tags

- **Display Tags**: `PARAM`, `STATUS`, `ERROR`, `USER`, `ACTIVITY`, `COPYRIGHT`
- **Include Tags**: `INCLUDE` (with special types)
- **Control Tags**: `OPTION`, `CONDITIONAL`, `FORMSTATE`
- **Table Tags**: `TABLE` (with various table types)
- **Utility Tags**: `ACTION`, `REPLACE`, `SESSION`, `COOKIE`
- **Special Tags**: `BILLINGACCOUNT`, `PHOTODUPLICATION`, `PAYMENTPROVIDERURL`

## Database Field Support

The extension provides IntelliSense for all standard Aeon database fields:

- **Transaction Fields**: TransactionNumber, ItemTitle, ItemAuthor, CallNumber, Location, etc.
- **User Fields**: Username, FirstName, LastName, EmailAddress, Department, etc.
- **Activity Fields**: Name, Description, BeginDate, EndDate, Location, etc.
- **Custom Fields**: ItemInfo1-5, UserInfo1-5, and other customizable fields

## Tips

1. **Quick Insert**: Type the first few letters of a tag name after `<#` for quick insertion
2. **Field Validation**: The extension warns about potentially unknown fields but allows custom fields
3. **Include Navigation**: Hold Ctrl/Cmd and click on include filenames to open them
4. **Snippet Expansion**: Type snippet prefixes (e.g., `aeon-form`) and press Tab to expand

## Requirements

- VS Code 1.74.0 or higher
- HTML files containing Aeon tags

## Troubleshooting

### Common Issues

- **No syntax highlighting?** → File must be .html/.htm
- **Preview not styled?** → Check CSS file paths exist
- **Can't see full mobile view?** → Use 50% zoom
- **IntelliSense not working?** → Type `<#` to trigger

### Debug Mode
For developers debugging the extension:
1. Open VS Code Developer Tools: Help → Toggle Developer Tools
2. Check Console tab for errors
3. Extension logs appear with [Extension Host] prefix

## Known Issues

- Include file navigation works best when files are within the workspace
- Some custom fields may show warnings even if they're valid in your Aeon installation

## Release Notes

### 0.2.0 - Stage 2: Live Preview & Visualization
- **NEW: Live Preview Panel** - Real-time preview with split view
- **NEW: Mock Data System** - Built-in profiles and custom data management
- **NEW: Responsive Testing** - Device presets and viewport controls
- **NEW: Tag Visualization** - Multiple visualization modes for debugging
- **NEW: Theme Support** - Built-in themes and custom CSS injection
- **NEW: Enhanced Commands** - Preview controls and data management
- Improved performance and stability
- Bug fixes for edge cases in tag processing

### 0.1.0
- Initial release
- Core language support for Aeon tags
- IntelliSense and validation
- Snippet library
- Navigation features

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/mjasonglover/AeonWebVSCodeExtension/issues).

### Resources

- **Full User Guide**: See [USER_GUIDE.md](USER_GUIDE.md) for comprehensive documentation
- **Quick Reference**: See [QUICK_START.md](QUICK_START.md) for a condensed guide
- **Report Issues**: [GitHub Issues](https://github.com/mjasonglover/AeonWebVSCodeExtension/issues)

## License

This extension is licensed under the MIT License.