// Aeon Preview Client Script

const vscode = acquireVsCodeApi();

// Initialize preview
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupFieldEditing();
    setupTagInteraction();
    setupControlButtons();
});

// Setup global event listeners
function setupEventListeners() {
    // Handle clicks on include files
    document.addEventListener('click', (e) => {
        const includeElement = e.target.closest('.include-content[data-include]');
        if (includeElement) {
            const filename = includeElement.getAttribute('data-include');
            vscode.postMessage({
                command: 'navigateToInclude',
                filename: filename
            });
        }
    });
    
    // Handle clicks on tags
    document.addEventListener('click', (e) => {
        const tagElement = e.target.closest('.aeon-tag[data-tag-id]');
        if (tagElement) {
            const tagId = tagElement.getAttribute('data-tag-id');
            vscode.postMessage({
                command: 'highlightTag',
                tagId: tagId
            });
        }
    });
}

// Setup field editing capability
function setupFieldEditing() {
    const fields = document.querySelectorAll('.param-value, .user-field, .activity-field');
    
    fields.forEach(field => {
        field.addEventListener('click', (e) => {
            if (e.shiftKey) {
                const fieldName = field.getAttribute('data-field');
                const currentValue = field.textContent;
                showFieldEditor(fieldName, currentValue, field);
            }
        });
        
        // Add tooltip
        field.title = `${field.title}\nShift+Click to edit`;
    });
}

// Setup tag interaction
function setupTagInteraction() {
    const tags = document.querySelectorAll('.aeon-tag');
    
    tags.forEach(tag => {
        const tagType = tag.getAttribute('data-tag');
        const tagId = tag.getAttribute('data-tag-id');
        
        // Find tag info from window.tagMap
        if (window.tagMap) {
            const tagInfo = window.tagMap.find(([id]) => id === tagId);
            if (tagInfo) {
                const [, info] = tagInfo;
                tag.title = `Tag: ${tagType}\n${info.attributes || 'No attributes'}`;
            }
        }
    });
}

// Setup control button event listeners
function setupControlButtons() {
    console.log('Setting up control buttons...');
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        console.log('Found refresh button, adding listener');
        refreshBtn.addEventListener('click', () => {
            console.log('Refresh button clicked');
            vscode.postMessage({ command: 'refresh' });
        });
    } else {
        console.log('Refresh button not found');
    }
    
    // Device select
    const deviceSelect = document.getElementById('device-select');
    if (deviceSelect) {
        deviceSelect.addEventListener('change', (e) => {
            changeDevice(e.target.value);
        });
    }
    
    // Tag visualization select
    const tagVizSelect = document.getElementById('tag-viz-select');
    if (tagVizSelect) {
        tagVizSelect.addEventListener('change', (e) => {
            changeTagVisualization(e.target.value);
        });
    }
    
    // Mock data button
    const mockDataBtn = document.getElementById('mock-data-btn');
    if (mockDataBtn) {
        mockDataBtn.addEventListener('click', () => {
            editMockData();
        });
    }
    
    // Error close button
    const errorCloseBtn = document.getElementById('error-close-btn');
    if (errorCloseBtn) {
        errorCloseBtn.addEventListener('click', () => {
            const errorPanel = document.getElementById('preview-errors');
            if (errorPanel) {
                errorPanel.style.display = 'none';
            }
        });
    }
}

// Control functions
window.refreshPreview = function() {
    vscode.postMessage({ command: 'refresh' });
};

function changeDevice(device) {
    if (device === 'Custom') {
        const width = prompt('Enter width:', '800');
        const height = prompt('Enter height:', '600');
        if (width && height) {
            vscode.postMessage({
                command: 'changeViewport',
                width: parseInt(width),
                height: parseInt(height)
            });
        }
    } else {
        // Request device change which will trigger a full preview update
        vscode.postMessage({
            command: 'changePreviewDevice',
            device: device
        });
    }
};

function changeTagVisualization(mode) {
    vscode.postMessage({
        command: 'changeTagVisualization',
        mode: mode
    });
}

function editMockData() {
    showMockDataEditor();
}

// Show field editor inline
function showFieldEditor(fieldName, currentValue, element) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    input.style.width = '100%';
    input.style.padding = '2px 4px';
    input.style.border = '1px solid #007acc';
    input.style.borderRadius = '2px';
    
    const originalContent = element.innerHTML;
    element.innerHTML = '';
    element.appendChild(input);
    
    input.focus();
    input.select();
    
    const updateValue = () => {
        const newValue = input.value;
        element.innerHTML = escapeHtml(newValue);
        
        vscode.postMessage({
            command: 'updateMockData',
            field: fieldName,
            value: newValue
        });
    };
    
    const cancelEdit = () => {
        element.innerHTML = originalContent;
    };
    
    input.addEventListener('blur', updateValue);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            updateValue();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

// Show mock data editor modal
function showMockDataEditor() {
    const modal = document.createElement('div');
    modal.className = 'mock-data-modal';
    
    // Get all current field values
    const fields = {};
    document.querySelectorAll('[data-field]').forEach(el => {
        const fieldName = el.getAttribute('data-field');
        if (!fields[fieldName]) {
            fields[fieldName] = el.textContent;
        }
    });
    
    let html = '<h2>Edit Mock Data</h2>';
    html += '<div class="mock-data-fields">';
    
    // Common fields to show
    const commonFields = [
        'TransactionNumber', 'TransactionStatus', 'ItemTitle', 'ItemAuthor',
        'CallNumber', 'Location', 'Username', 'FirstName', 'LastName',
        'EmailAddress', 'StatusMessage'
    ];
    
    commonFields.forEach(field => {
        const value = fields[field] || '';
        html += `
            <div class="mock-data-field">
                <label for="field-${field}">${field}:</label>
                <input type="text" id="field-${field}" data-field="${field}" value="${escapeHtml(value)}">
            </div>
        `;
    });
    
    html += '</div>';
    html += '<div style="margin-top: 20px; text-align: right;">';
    html += '<button class="btn btn-primary" id="save-mock-data-btn">Save</button> ';
    html += '<button class="btn btn-secondary" id="cancel-mock-data-btn">Cancel</button>';
    html += '</div>';
    
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1999;';
    backdrop.addEventListener('click', closeMockDataEditor);
    document.body.appendChild(backdrop);
    
    // Add event listeners to the buttons
    document.getElementById('save-mock-data-btn').addEventListener('click', saveMockData);
    document.getElementById('cancel-mock-data-btn').addEventListener('click', closeMockDataEditor);
    
    window.mockDataModal = modal;
    window.mockDataBackdrop = backdrop;
}

function saveMockData() {
    const inputs = document.querySelectorAll('.mock-data-modal input[data-field]');
    inputs.forEach(input => {
        const field = input.getAttribute('data-field');
        const value = input.value;
        
        vscode.postMessage({
            command: 'updateMockData',
            field: field,
            value: value
        });
    });
    
    closeMockDataEditor();
}

function closeMockDataEditor() {
    if (window.mockDataModal) {
        window.mockDataModal.remove();
        window.mockDataModal = null;
    }
    if (window.mockDataBackdrop) {
        window.mockDataBackdrop.remove();
        window.mockDataBackdrop = null;
    }
}

// Utility functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Handle messages from extension
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'updateStyles':
            updateCustomStyles(message.css);
            break;
        case 'setViewport':
            setViewport(message.device);
            break;
        case 'showMockDataEditor':
            showMockDataEditor();
            break;
    }
});

function updateCustomStyles(css) {
    let styleElement = document.getElementById('custom-styles');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'custom-styles';
        document.head.appendChild(styleElement);
    }
    styleElement.textContent = css;
}

function setViewport(device) {
    const content = document.getElementById('preview-content');
    if (content && device.width) {
        content.style.width = device.width + 'px';
        if (device.height) {
            content.style.minHeight = device.height + 'px';
        }
        
        // Ensure content is centered
        const wrapper = document.getElementById('preview-wrapper');
        if (wrapper) {
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';
        }
    }
}