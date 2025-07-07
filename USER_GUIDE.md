# Aeon Web VS Code Extension - User Guide

## Table of Contents
1. [Installation](#installation)
2. [Getting Started](#getting-started)
3. [Core Features](#core-features)
4. [Live Preview Features](#live-preview-features)
5. [Testing Guide](#testing-guide)
6. [Troubleshooting](#troubleshooting)

## Installation

### Prerequisites
- Visual Studio Code 1.74.0 or higher
- Node.js 14.x or higher (for development)

### Installing the Extension (Development Mode)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mjasonglover/AeonWebVSCodeExtension.git
   cd AeonWebVSCodeExtension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile the extension:**
   ```bash
   npm run compile
   ```

4. **Open in VS Code:**
   ```bash
   code .
   ```

5. **Run the extension:**
   - Press `F5` or go to Run → Start Debugging
   - A new VS Code window will open with the extension loaded
   - Open any `.html` or `.htm` file to activate the extension

## Getting Started

### File Recognition
The extension automatically activates for:
- Files with `.html` or `.htm` extensions
- Files containing Aeon tags (e.g., `<#PARAM>`, `<#INCLUDE>`)

### Basic Usage
1. Open an Aeon HTML file (e.g., `DefaultRequest.html`)
2. The extension will provide syntax highlighting and IntelliSense
3. Right-click in the editor and select "Preview Aeon Page" or use `Ctrl+Shift+P` → "Aeon: Preview Current Page"

## Core Features

### 1. Syntax Highlighting
- **Aeon Tags**: All Aeon tags are highlighted in distinct colors
  - `<#PARAM>` - Blue
  - `<#INCLUDE>` - Green
  - `<#STATUS>` - Cyan
  - `<#ERROR>` - Red
  - `<#USER>` - Indigo
  - `<#ACTIVITY>` - Pink
  - And more...

### 2. IntelliSense & Auto-completion
- **Tag Completion**: Type `<#` to see all available Aeon tags
- **Attribute Hints**: Get suggestions for required and optional attributes
- **Field Name Completion**: Auto-complete database field names in tags

**Try it:**
```html
<!-- Type <# and see tag suggestions -->
<#PARAM name="[cursor here]">  <!-- Get field name suggestions -->
```

### 3. Hover Information
- Hover over any Aeon tag to see:
  - Tag description
  - Required attributes
  - Usage examples
  - Related documentation

### 4. Go to Definition
- **Include Files**: Ctrl+Click (Cmd+Click on Mac) on include filenames
  ```html
  <#INCLUDE filename="include_head.html">  <!-- Ctrl+Click on filename -->
  ```

### 5. Diagnostics & Validation
- **Real-time validation** for:
  - Unknown tags (warns about typos)
  - Missing required attributes
  - Invalid field names
  - Syntax errors

### 6. Code Snippets
Quick snippets for common patterns:
- `aeon-form` - Complete form template
- `aeon-include` - Include tag with filename
- `aeon-param` - Parameter tag with name
- `aeon-table` - Table tag structure
- `aeon-conditional` - Conditional block

## Live Preview Features

### 1. Opening the Preview
- **Method 1**: Right-click → "Preview Aeon Page"
- **Method 2**: Command Palette → "Aeon: Preview Current Page"
- **Method 3**: Click the preview icon in the editor toolbar

### 2. Preview Controls

#### Device Selection
Choose from preset device sizes:
- Desktop (1920x1080)
- Desktop (1366x768)
- iPad Pro
- iPad Air
- iPhone 14 Pro
- iPhone SE
- Custom Size (enter your own dimensions)

#### Tag Visualization Modes
Toggle how Aeon tags are displayed:
- **No Tag Overlay**: Tags are invisible (normal view)
- **Highlight Tags**: Tags have colored borders and backgrounds
- **Show Tag Labels**: Tags show their type labels above them

#### Zoom Control
Scale the preview for better visibility:
- 50% - See more content at once
- 75% - Compact view
- 100% - Normal size
- 125% - Slightly enlarged
- 150% - Detailed view

#### Mock Data Editor
Click "Mock Data" to edit field values in real-time:
- Common fields are pre-populated
- Shift+Click on any field value to edit inline
- Changes update immediately in the preview

### 3. Mock Data Profiles
The extension includes 5 built-in data profiles:
1. **Default** - Standard test data
2. **New User** - First-time user scenario
3. **Returning User** - Existing user with history
4. **Admin** - Administrative user
5. **Test Data** - Edge cases and special characters

### 4. Local Resource Loading
- CSS files from your project load automatically
- JavaScript files are loaded (AJAX calls to aeon.dll are mocked)
- Images are replaced with placeholders
- Include files are processed recursively

### 5. Error Display
- Missing include files are listed
- Tag processing errors show in the preview
- Click the × to dismiss error messages

## Testing Guide

### Basic Functionality Tests

1. **Syntax Highlighting Test**
   - Open any Aeon HTML file
   - Verify tags are colored differently from regular HTML
   - Check that tag attributes are highlighted

2. **IntelliSense Test**
   ```html
   <!-- Test 1: Type <# and verify tag list appears -->
   <#
   
   <!-- Test 2: In PARAM tag, verify field name suggestions -->
   <#PARAM name="">
   
   <!-- Test 3: Verify attribute suggestions -->
   <#INCLUDE [cursor here]>
   ```

3. **Preview Test**
   - Open `DefaultRequest.html` or any Aeon page
   - Right-click → "Preview Aeon Page"
   - Verify preview opens to the right
   - Check that CSS is loaded (styling should be visible)

4. **Device Switching Test**
   - In preview, select different devices from dropdown
   - Verify content resizes appropriately
   - Try "Custom Size" and enter dimensions

5. **Tag Visualization Test**
   - Toggle between visualization modes
   - Verify tags show/hide appropriately
   - Check that "No Tag Overlay" completely hides tag indicators

6. **Zoom Test**
   - Select different zoom levels
   - Verify content scales smoothly
   - Check that scrolling works at different zoom levels

7. **Mock Data Test**
   - Click "Mock Data" button
   - Edit field values
   - Verify changes appear in preview
   - Try Shift+Click on field values for inline editing

### Advanced Testing

1. **Include File Navigation**
   ```html
   <#INCLUDE filename="include_head.html">
   <!-- Ctrl+Click on filename to open the file -->
   ```

2. **Nested Includes**
   - Create an include file that includes other files
   - Verify all includes are processed correctly

3. **Error Handling**
   - Reference a non-existent include file
   - Verify error appears in preview
   - Check that error can be dismissed

4. **Form Interaction**
   - Fill out form fields in preview
   - Note: Form submission is blocked (shows console message)

## Troubleshooting

### Common Issues

1. **Extension Not Activating**
   - Ensure file has .html or .htm extension
   - Check VS Code version (1.74.0+)
   - Try reloading window: Ctrl+Shift+P → "Developer: Reload Window"

2. **Preview Not Loading CSS**
   - Verify CSS files exist in the specified paths
   - Check that workspace folder contains the CSS files
   - Look for errors in VS Code Developer Tools (Help → Toggle Developer Tools)

3. **IntelliSense Not Working**
   - Wait a moment after opening file
   - Try typing `<#` to trigger suggestions
   - Ensure no syntax errors above cursor position

4. **Device Sizes Not Changing**
   - Refresh the preview
   - Check console for errors
   - Try a different device option

### Debug Mode
For developers debugging the extension:
1. Open VS Code Developer Tools: Help → Toggle Developer Tools
2. Check Console tab for errors
3. Extension logs appear with [Extension Host] prefix

### Reporting Issues
Please report issues at: https://github.com/mjasonglover/AeonWebVSCodeExtension/issues

Include:
- VS Code version
- Extension version
- Sample file causing issue
- Steps to reproduce
- Error messages from console

## Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|--------------|-----|
| Open Preview | Ctrl+Shift+P → "Aeon: Preview" | Cmd+Shift+P → "Aeon: Preview" |
| Go to Definition | Ctrl+Click | Cmd+Click |
| Trigger Suggestions | Ctrl+Space | Cmd+Space |
| Quick Fix | Ctrl+. | Cmd+. |

## Configuration

### Extension Settings
Access via: File → Preferences → Settings → Extensions → Aeon

- `aeon.preview.autoRefresh`: Auto-refresh preview on save (default: true)
- `aeon.preview.defaultDevice`: Default preview device (default: "Desktop")
- `aeon.mockData.defaultProfile`: Default mock data profile (default: "Default")
- `aeon.includeSearchPaths`: Paths to search for include files (default: [".", "includes"])

### Mock Data Customization
Edit `.vscode/aeon-mock-data.json` in your workspace:
```json
{
  "TransactionNumber": "12345",
  "Username": "custom.user",
  "ItemTitle": "Custom Document Title"
}
```

## Tips & Best Practices

1. **Use Tag Visualization** during development to quickly identify all Aeon tags
2. **Test with Different Profiles** to ensure pages work for various user types
3. **Use Zoom Out (50%)** to see full page layout on mobile devices
4. **Shift+Click Field Values** for quick mock data changes
5. **Check Error Panel** for missing includes or validation issues

---

**Version**: 0.0.1  
**Last Updated**: July 2025  
**Repository**: https://github.com/mjasonglover/AeonWebVSCodeExtension