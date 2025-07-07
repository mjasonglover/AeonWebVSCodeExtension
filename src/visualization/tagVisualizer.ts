export type VisualizationMode = 'none' | 'highlight' | 'labels' | 'flow';

export class TagVisualizer {
    private mode: VisualizationMode = 'none';
    private tagColors: Map<string, string> = new Map();
    
    constructor() {
        this.initializeTagColors();
    }
    
    private initializeTagColors(): void {
        // Assign distinct colors to different tag types
        this.tagColors.set('PARAM', '#007bff');      // Blue
        this.tagColors.set('INCLUDE', '#28a745');    // Green
        this.tagColors.set('STATUS', '#17a2b8');     // Cyan
        this.tagColors.set('ERROR', '#dc3545');      // Red
        this.tagColors.set('USER', '#6610f2');       // Indigo
        this.tagColors.set('ACTIVITY', '#e83e8c');   // Pink
        this.tagColors.set('TABLE', '#fd7e14');      // Orange
        this.tagColors.set('OPTION', '#20c997');     // Teal
        this.tagColors.set('CONDITIONAL', '#6c757d'); // Gray
        this.tagColors.set('FORMSTATE', '#343a40');  // Dark gray
        this.tagColors.set('ACTION', '#ffc107');     // Yellow
        this.tagColors.set('REPLACE', '#795548');    // Brown
    }
    
    public setMode(mode: VisualizationMode): void {
        this.mode = mode;
    }
    
    public getMode(): VisualizationMode {
        return this.mode;
    }
    
    public getVisualizationStyles(): string {
        switch (this.mode) {
            case 'highlight':
                return this.getHighlightStyles() + this.getIncludeVisualization();
            case 'labels':
                return this.getLabelStyles() + this.getIncludeVisualization();
            case 'flow':
                return this.getFlowStyles() + this.getIncludeVisualization();
            case 'none':
            default:
                return this.getMinimalStyles();
        }
    }
    
    private getMinimalStyles(): string {
        // In 'none' mode, we want tags to be completely invisible
        return `
            /* Override base styles to make tags invisible */
            .aeon-tag {
                position: static !important;
                display: inline !important;
                padding: 0 !important;
                margin: 0 !important;
                background: none !important;
                border: none !important;
                box-shadow: none !important;
            }
            
            .aeon-tag:hover {
                cursor: inherit !important;
                background: none !important;
                border: none !important;
                box-shadow: none !important;
            }
            
            .include-content {
                display: block;
                position: static !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                background: none !important;
            }
            
            /* Hide any visual indicators */
            .aeon-tag::before,
            .aeon-tag::after,
            .include-content::before,
            .include-content::after {
                display: none !important;
            }
            
            /* Remove any other visual hints */
            .aeon-tag[data-tag] {
                transition: none !important;
            }
        `;
    }
    
    private getHighlightStyles(): string {
        let styles = `
            .aeon-tag {
                position: relative;
                padding: 2px 4px;
                border-radius: 3px;
                transition: all 0.2s ease;
            }
        `;
        
        // Add individual tag colors
        this.tagColors.forEach((color, tag) => {
            styles += `
                .aeon-tag[data-tag="${tag}"] {
                    background-color: ${color}15;
                    border: 1px solid ${color}40;
                }
                .aeon-tag[data-tag="${tag}"]:hover {
                    background-color: ${color}25;
                    border-color: ${color}60;
                    box-shadow: 0 0 0 3px ${color}20;
                }
            `;
        });
        
        return styles;
    }
    
    private getLabelStyles(): string {
        let styles = this.getHighlightStyles() + `
            .aeon-tag {
                position: relative;
                margin-top: 20px;
            }
            .aeon-tag::before {
                content: attr(data-tag);
                position: absolute;
                top: -18px;
                left: 0;
                padding: 2px 6px;
                font-size: 11px;
                font-weight: bold;
                border-radius: 3px;
                white-space: nowrap;
                pointer-events: none;
            }
        `;
        
        // Add label colors
        this.tagColors.forEach((color, tag) => {
            styles += `
                .aeon-tag[data-tag="${tag}"]::before {
                    background-color: ${color};
                    color: white;
                }
            `;
        });
        
        return styles;
    }
    
    private getFlowStyles(): string {
        return this.getLabelStyles() + `
            .aeon-tag[data-tag="INCLUDE"] {
                display: block;
                margin: 10px 0;
                padding: 10px;
                border-left: 4px solid #28a745;
            }
            
            .aeon-tag[data-tag="CONDITIONAL"] {
                display: block;
                margin: 10px 0;
                padding: 10px;
                border: 2px dashed #6c757d;
                background-color: #6c757d10;
            }
            
            .aeon-tag[data-tag="CONDITIONAL"]::after {
                content: attr(data-result) ? " ✓" : " ✗";
                font-weight: bold;
                color: attr(data-result) ? #28a745 : #dc3545;
            }
            
            form {
                border: 2px solid #007bff;
                padding: 20px;
                margin: 20px 0;
                position: relative;
            }
            
            form::before {
                content: "Form: " attr(action);
                position: absolute;
                top: -12px;
                left: 10px;
                background: white;
                padding: 0 8px;
                color: #007bff;
                font-weight: bold;
                font-size: 14px;
            }
        `;
    }
    
    public getIncludeVisualization(): string {
        return `
            .include-content {
                border: 2px solid #28a745;
                border-radius: 4px;
                margin: 10px 0;
                padding: 10px;
                position: relative;
                background-color: #28a74508;
            }
            
            .include-content::before {
                content: "📄 " attr(data-include);
                position: absolute;
                top: -12px;
                left: 10px;
                background: white;
                color: #28a745;
                padding: 0 8px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .include-content .include-content {
                border-color: #20c997;
                background-color: #20c99708;
                margin-left: 20px;
            }
            
            .include-content .include-content::before {
                color: #20c997;
            }
            
            /* Nested include indication */
            .include-content .include-content .include-content {
                border-color: #fd7e14;
                background-color: #fd7e1408;
            }
            
            .include-content .include-content .include-content::before {
                color: #fd7e14;
                content: "📄📄 " attr(data-include);
            }
        `;
    }
    
    public getTagStatistics(tagMap: Map<string, any>): TagStatistics {
        const stats: TagStatistics = {
            totalTags: tagMap.size,
            tagCounts: new Map(),
            errors: [],
            warnings: []
        };
        
        tagMap.forEach((info, id) => {
            const count = stats.tagCounts.get(info.type) || 0;
            stats.tagCounts.set(info.type, count + 1);
        });
        
        return stats;
    }
    
    public generateTagReport(stats: TagStatistics): string {
        let report = '<div class="tag-report">';
        report += '<h3>Tag Usage Report</h3>';
        report += `<p>Total tags: ${stats.totalTags}</p>`;
        
        report += '<table class="tag-stats-table">';
        report += '<thead><tr><th>Tag Type</th><th>Count</th><th>Color</th></tr></thead>';
        report += '<tbody>';
        
        stats.tagCounts.forEach((count, tag) => {
            const color = this.tagColors.get(tag) || '#666';
            report += `<tr>
                <td>${tag}</td>
                <td>${count}</td>
                <td><span style="display:inline-block;width:20px;height:20px;background:${color};border-radius:3px;"></span></td>
            </tr>`;
        });
        
        report += '</tbody></table>';
        
        if (stats.errors.length > 0) {
            report += '<h4>Errors</h4><ul>';
            stats.errors.forEach(error => {
                report += `<li class="error">${error}</li>`;
            });
            report += '</ul>';
        }
        
        if (stats.warnings.length > 0) {
            report += '<h4>Warnings</h4><ul>';
            stats.warnings.forEach(warning => {
                report += `<li class="warning">${warning}</li>`;
            });
            report += '</ul>';
        }
        
        report += '</div>';
        return report;
    }
    
    public getTagReportStyles(): string {
        return `
            .tag-report {
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 4px;
                padding: 16px;
                margin: 16px;
                font-size: 13px;
            }
            
            .tag-report h3 {
                margin: 0 0 12px 0;
                font-size: 16px;
            }
            
            .tag-report h4 {
                margin: 16px 0 8px 0;
                font-size: 14px;
            }
            
            .tag-stats-table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
            }
            
            .tag-stats-table th,
            .tag-stats-table td {
                padding: 6px 12px;
                text-align: left;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .tag-stats-table th {
                background: var(--vscode-list-hoverBackground);
                font-weight: bold;
            }
            
            .tag-report .error {
                color: var(--vscode-errorForeground);
            }
            
            .tag-report .warning {
                color: var(--vscode-editorWarning-foreground);
            }
        `;
    }
}

export interface TagStatistics {
    totalTags: number;
    tagCounts: Map<string, number>;
    errors: string[];
    warnings: string[];
}