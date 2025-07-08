(function() {
    const vscode = acquireVsCodeApi();
    
    // State management
    let currentProject = null;
    let currentPage = null;
    let pageAnalysis = null;
    let selectedCustomizations = new Set();
    let currentView = 'split';
    let workspacePages = [];
    
    // DOM elements
    const elements = {
        // Buttons
        btnNewProject: document.getElementById('btn-new-project'),
        btnOpenProject: document.getElementById('btn-open-project'),
        btnSave: document.getElementById('btn-save'),
        btnExport: document.getElementById('btn-export'),
        btnViewSplit: document.getElementById('btn-view-split'),
        btnViewDiff: document.getElementById('btn-view-diff'),
        btnViewPreview: document.getElementById('btn-view-preview'),
        btnEditBranding: document.getElementById('btn-edit-branding'),
        btnUploadOld: document.getElementById('btn-upload-old'),
        btnApplyMigration: document.getElementById('btn-apply-migration'),
        
        // Containers
        projectInfo: document.getElementById('project-info'),
        projectName: document.getElementById('project-name'),
        sourceVersion: document.getElementById('source-version'),
        targetVersion: document.getElementById('target-version'),
        pageList: document.getElementById('page-list'),
        featureList: document.getElementById('feature-list'),
        customizationList: document.getElementById('customization-list'),
        oldPageContent: document.getElementById('old-page-content'),
        newPageContent: document.getElementById('new-page-content'),
        diffContent: document.getElementById('diff-content'),
        previewFrame: document.getElementById('preview-frame'),
        
        // Views
        splitView: document.getElementById('split-view'),
        diffView: document.getElementById('diff-view'),
        previewView: document.getElementById('preview-view')
    };
    
    // Event listeners
    elements.btnNewProject.addEventListener('click', showNewProjectDialog);
    elements.btnOpenProject.addEventListener('click', showOpenProjectDialog);
    elements.btnSave.addEventListener('click', saveCurrentWork);
    elements.btnExport.addEventListener('click', exportProject);
    elements.btnEditBranding.addEventListener('click', editBranding);
    elements.btnUploadOld.addEventListener('click', uploadOldPage);
    elements.btnApplyMigration.addEventListener('click', applyMigration);
    
    // View buttons
    elements.btnViewSplit.addEventListener('click', () => changeView('split'));
    elements.btnViewDiff.addEventListener('click', () => changeView('diff'));
    elements.btnViewPreview.addEventListener('click', () => changeView('preview'));
    
    // Filter buttons
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterCustomizations(e.target.dataset.filter);
        });
    });
    
    // Message handler
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'projectCreated':
            case 'projectLoaded':
                handleProjectLoaded(message.project);
                break;
                
            case 'analysisComplete':
                handleAnalysisComplete(message.analysis, message);
                break;
                
            case 'brandingUpdated':
                handleBrandingUpdated(message.branding, message.css);
                break;
                
            case 'selectionsSaved':
                showNotification('Selections saved');
                break;
                
            case 'viewChanged':
                updateView(message.viewMode);
                break;
                
            case 'projectInfoReceived':
                handleProjectInfoReceived(message);
                break;
                
            case 'brandingReceived':
                handleBrandingReceived(message.branding);
                break;
                
            case 'templatesLoaded':
                handleTemplatesLoaded(message.templates);
                break;
                
            case 'workspacePagesLoaded':
                handleWorkspacePagesLoaded(message.pages);
                break;
        }
    });
    
    // Functions
    function showNewProjectDialog() {
        // Request project info from extension
        vscode.postMessage({ type: 'requestProjectInfo' });
    }
    
    function showOpenProjectDialog() {
        vscode.postMessage({ type: 'openProject' });
    }
    
    function saveCurrentWork() {
        const selections = Array.from(selectedCustomizations).map(id => ({
            customizationId: id,
            type: 'keep'
        }));
        
        vscode.postMessage({
            type: 'saveSelections',
            selections: selections
        });
    }
    
    function exportProject() {
        vscode.postMessage({ type: 'exportProject' });
    }
    
    function editBranding() {
        // Request branding input from extension
        vscode.postMessage({ type: 'requestBrandingInput' });
    }
    
    function uploadOldPage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.html';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    analyzeUploadedPage(content, file.name);
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    function analyzeUploadedPage(content, fileName) {
        vscode.postMessage({
            type: 'analyzePage',
            oldContent: content,
            pageFile: fileName
        });
    }
    
    function applyMigration() {
        vscode.postMessage({ type: 'applyMigration' });
    }
    
    function changeView(view) {
        currentView = view;
        
        // Update button states
        document.querySelectorAll('.view-button').forEach(btn => btn.classList.remove('active'));
        
        // Hide all views
        elements.splitView.classList.add('hidden');
        elements.diffView.classList.add('hidden');
        elements.previewView.classList.add('hidden');
        
        // Show selected view
        switch (view) {
            case 'split':
                elements.btnViewSplit.classList.add('active');
                elements.splitView.classList.remove('hidden');
                break;
            case 'diff':
                elements.btnViewDiff.classList.add('active');
                elements.diffView.classList.remove('hidden');
                updateDiffView();
                break;
            case 'preview':
                elements.btnViewPreview.classList.add('active');
                elements.previewView.classList.remove('hidden');
                updatePreview();
                break;
        }
    }
    
    function handleProjectLoaded(project) {
        currentProject = project;
        
        // Update UI
        elements.projectInfo.classList.remove('hidden');
        elements.projectName.textContent = project.name;
        elements.sourceVersion.textContent = project.sourceVersion;
        elements.targetVersion.textContent = project.targetVersion;
        
        // Enable buttons
        elements.btnSave.disabled = false;
        elements.btnExport.disabled = false;
        
        // Load features
        updateFeatureList(project.features);
        
        // Don't update page list here - wait for templates
    }
    
    function updatePageList() {
        elements.pageList.innerHTML = '';
        
        if (workspacePages.length === 0) {
            elements.pageList.innerHTML = `
                <div class="empty-state" style="padding: 20px; text-align: center;">
                    <i class="codicon codicon-search" style="font-size: 24px; opacity: 0.5;"></i>
                    <p style="margin-top: 10px;">No Aeon pages found</p>
                    <p style="font-size: 11px; opacity: 0.7;">Make sure your workspace contains HTML files with Aeon markers like AeonForm or aeon.dll</p>
                </div>
            `;
            return;
        }
        
        workspacePages.forEach(pageMatch => {
            const pageDiv = createWorkspacePageItem(pageMatch);
            elements.pageList.appendChild(pageDiv);
        });
    }
    
    let availableTemplates = [];
    
    function handleTemplatesLoaded(templates) {
        console.log('Templates loaded:', templates);
        availableTemplates = templates;
    }
    
    function handleWorkspacePagesLoaded(pages) {
        console.log('Workspace pages loaded:', pages);
        workspacePages = pages;
        updatePageList();
    }
    
    function createWorkspacePageItem(pageMatch) {
        const div = document.createElement('div');
        div.className = 'page-item workspace-page';
        
        const hasMatch = pageMatch.suggestedTemplate !== null;
        const statusClass = hasMatch ? 'matched' : 'unmatched';
        const statusText = hasMatch ? 'Template found' : 'No match';
        
        div.innerHTML = `
            <div class="page-info">
                <span class="page-name">${pageMatch.oldPage.fileName}</span>
                <span class="page-path">${pageMatch.oldPage.relativePath}</span>
                ${pageMatch.oldPage.hasCustomizations ? '<span class="customized-badge">Customized</span>' : ''}
            </div>
            <div class="template-match">
                ${hasMatch ? 
                    `<select class="template-select" data-old-path="${pageMatch.oldPage.filePath}">
                        ${pageMatch.templates.map(t => 
                            `<option value="${t}" ${t === pageMatch.suggestedTemplate ? 'selected' : ''}>${t}</option>`
                        ).join('')}
                    </select>` :
                    `<span class="status ${statusClass}">${statusText}</span>`
                }
            </div>
        `;
        
        // Add event listener for template selection
        const select = div.querySelector('.template-select');
        if (select) {
            select.addEventListener('change', (e) => {
                e.stopPropagation();
                const oldPath = e.target.dataset.oldPath;
                const templateName = e.target.value;
                selectOldPageWithTemplate(oldPath, templateName);
            });
        }
        
        div.addEventListener('click', (e) => {
            if (!e.target.classList.contains('template-select')) {
                if (hasMatch) {
                    selectOldPageWithTemplate(pageMatch.oldPage.filePath, pageMatch.suggestedTemplate);
                }
            }
        });
        
        return div;
    }
    
    function selectOldPageWithTemplate(oldPagePath, templateFileName) {
        currentPage = templateFileName;
        
        // Update selection
        document.querySelectorAll('.page-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Find and select the current item
        const currentItem = Array.from(document.querySelectorAll('.page-item')).find(item => {
            const pageInfo = item.querySelector('.page-name');
            return pageInfo && workspacePages.some(p => 
                p.oldPage.filePath === oldPagePath && pageInfo.textContent === p.oldPage.fileName
            );
        });
        
        if (currentItem) {
            currentItem.classList.add('selected');
        }
        
        // Send message to analyze the old page with the template
        vscode.postMessage({
            type: 'selectOldPage',
            oldPagePath: oldPagePath,
            templateFileName: templateFileName
        });
        
        // Show loading state
        elements.oldPageContent.innerHTML = `
            <div class="loading">
                <i class="codicon codicon-loading codicon-modifier-spin"></i>
                <p>Loading ${oldPagePath.split('/').pop()}...</p>
            </div>
        `;
        
        elements.newPageContent.innerHTML = `
            <div class="loading">
                <i class="codicon codicon-loading codicon-modifier-spin"></i>
                <p>Loading template ${templateFileName}...</p>
            </div>
        `;
    }
    
    function showTemplate(pageName) {
        elements.newPageContent.innerHTML = `
            <div class="loading">
                <i class="codicon codicon-loading codicon-modifier-spin"></i>
                <p>Loading template...</p>
            </div>
        `;
    }
    
    function updateFeatureList(features) {
        elements.featureList.innerHTML = '';
        
        const availableFeatures = [
            { id: 'appointment-scheduling', name: 'Appointment Scheduling' },
            { id: 'dualauth-portal1', name: 'Modern Dual Auth Portal' },
            { id: 'dualauth-simplesquares', name: 'Simple Squares Dual Auth' }
        ];
        
        availableFeatures.forEach(feature => {
            const div = document.createElement('div');
            div.className = 'feature-item';
            div.innerHTML = `
                <input type="checkbox" id="feature-${feature.id}" ${features.includes(feature.id) ? 'checked' : ''}>
                <label for="feature-${feature.id}">${feature.name}</label>
            `;
            elements.featureList.appendChild(div);
        });
    }
    
    function handleAnalysisComplete(analysis, message) {
        pageAnalysis = analysis;
        
        // Update old page content - just show as plain text with proper formatting
        elements.oldPageContent.innerHTML = `<pre class="code-view">${escapeHtml(message.oldContent)}</pre>`;
        
        // Update new page content
        elements.newPageContent.innerHTML = `<pre class="code-view">${escapeHtml(message.newContent)}</pre>`;
        
        // Update customization list
        updateCustomizationList(analysis.customizations);
        
        // Enable apply button if customizations selected
        updateApplyButton();
    }
    
    function updateCustomizationList(customizations) {
        elements.customizationList.innerHTML = '';
        
        // Add content changes
        customizations.content.forEach(change => {
            const item = createCustomizationItem('content', change);
            elements.customizationList.appendChild(item);
        });
        
        // Add structural changes
        customizations.structure.forEach(change => {
            const item = createCustomizationItem('structure', change);
            elements.customizationList.appendChild(item);
        });
        
        // Add JavaScript changes
        customizations.javascript.forEach(change => {
            const item = createCustomizationItem('javascript', change);
            elements.customizationList.appendChild(item);
        });
    }
    
    function createCustomizationItem(type, change) {
        const div = document.createElement('div');
        div.className = 'customization-item';
        const id = `${type}-${change.location || change.fieldId}`;
        
        let description = '';
        let details = '';
        
        switch (type) {
            case 'content':
                description = `${change.type}: ${change.location}`;
                details = `Old: "${change.oldValue}"\nNew: "${change.newValue}"`;
                break;
            case 'structure':
                description = `${change.type}: ${change.fieldName}`;
                details = change.details || '';
                break;
            case 'javascript':
                description = `${change.type}: ${change.purpose || 'Custom code'}`;
                details = change.suggestedRewrite || change.content;
                break;
        }
        
        div.innerHTML = `
            <div class="customization-header">
                <input type="checkbox" class="customization-checkbox" id="${id}" data-id="${id}">
                <label for="${id}">${description}</label>
                <span class="customization-type ${type}">${type}</span>
            </div>
            ${details ? `<div class="customization-details">${escapeHtml(details)}</div>` : ''}
        `;
        
        const checkbox = div.querySelector('.customization-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedCustomizations.add(id);
            } else {
                selectedCustomizations.delete(id);
            }
            updateApplyButton();
        });
        
        return div;
    }
    
    function filterCustomizations(filter) {
        const items = elements.customizationList.querySelectorAll('.customization-item');
        items.forEach(item => {
            if (filter === 'all') {
                item.style.display = 'block';
            } else {
                const type = item.querySelector('.customization-type').textContent;
                item.style.display = type === filter ? 'block' : 'none';
            }
        });
    }
    
    function updateDiffView() {
        if (pageAnalysis) {
            // Generate diff HTML
            elements.diffContent.innerHTML = '<div class="diff-container">Diff view loading...</div>';
        }
    }
    
    function updatePreview() {
        if (currentProject && currentPage) {
            // Generate preview
            elements.previewFrame.srcdoc = '<html><body>Preview loading...</body></html>';
        }
    }
    
    function updateApplyButton() {
        elements.btnApplyMigration.disabled = selectedCustomizations.size === 0;
    }
    
    function handleProjectInfoReceived(info) {
        console.log('Project info received:', info);
        vscode.postMessage({
            type: 'createProject',
            name: info.name,
            sourceVersion: info.sourceVersion,
            features: info.features
        });
    }
    
    function handleBrandingReceived(branding) {
        vscode.postMessage({
            type: 'updateBranding',
            branding: branding
        });
    }
    
    function handleBrandingUpdated(branding, css) {
        showNotification('Branding updated');
        
        // Apply preview CSS if in preview mode
        if (currentView === 'preview') {
            updatePreview();
        }
    }
    
    function showNotification(message) {
        // Simple notification - in production would use VS Code's notification API
        console.log(message);
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
})();