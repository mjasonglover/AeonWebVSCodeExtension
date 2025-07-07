# Aeon VS Code Extension - Quick Start

## 🚀 5-Minute Setup

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

3. **Start Preview**
   - Right-click in editor → "Preview Aeon Page"
   - Or press `Ctrl+Shift+P` → "Aeon: Preview Current Page"

## 🎯 Key Features to Try

### IntelliSense
```html
<#     <!-- Type this and see all tags -->
<#PARAM name="    <!-- Get field suggestions -->
```

### Live Preview Controls
- **Device**: Switch between Desktop/iPad/iPhone
- **Tags**: Toggle visualization (None/Highlight/Labels)  
- **Zoom**: Scale preview (50%-150%)
- **Mock Data**: Click to edit test data

### Quick Edits
- **Shift+Click** any blue field value to edit inline
- **Ctrl+Click** on include filenames to open them

## 📝 Essential Aeon Tags

```html
<#PARAM name="ItemTitle">           <!-- Display field value -->
<#USER field="Username">            <!-- User information -->
<#INCLUDE filename="header.html">   <!-- Include file -->
<#STATUS>                          <!-- Status messages -->
<#ERROR field="ItemTitle">         <!-- Field errors -->
<#TABLE name="Transactions">       <!-- Data tables -->
<#CONDITIONAL test="HasAccess">    <!-- Conditional content -->
```

## 🎨 Tag Color Reference

- 🔵 Blue: PARAM
- 🟢 Green: INCLUDE  
- 🔷 Cyan: STATUS
- 🔴 Red: ERROR
- 🟣 Purple: USER
- 🟠 Orange: TABLE

## ⚡ Keyboard Shortcuts

- **Trigger IntelliSense**: `Ctrl+Space`
- **Go to Definition**: `Ctrl+Click` on includes
- **Command Palette**: `Ctrl+Shift+P`

## 🧪 Test Scenarios

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

## 🐛 Quick Troubleshooting

- **No syntax highlighting?** → File must be .html/.htm
- **Preview not styled?** → Check CSS file paths
- **Can't see full mobile view?** → Use 50% zoom
- **IntelliSense not working?** → Type `<#` to trigger

---

**Need Help?** Check the full [USER_GUIDE.md](USER_GUIDE.md) or report issues at [GitHub](https://github.com/mjasonglover/AeonWebVSCodeExtension/issues)