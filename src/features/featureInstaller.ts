import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FeaturePackage, FeatureFile } from '../types/migration.types';
import { TemplateLoader } from '../migration/templateLoader';

export class FeatureInstaller {
    private installedFeatures: Set<string> = new Set();
    
    constructor(
        private templateLoader: TemplateLoader,
        private workspaceRoot: string
    ) {}

    /**
     * Get available feature packages
     */
    async getAvailableFeatures(): Promise<FeaturePackage[]> {
        const features: FeaturePackage[] = [
            {
                id: 'appointment-scheduling',
                name: 'Appointment Scheduling',
                version: '6.0.20',
                description: 'Add appointment scheduling functionality to Aeon',
                files: [
                    // These would be defined based on actual appointment scheduling files
                    {
                        path: 'ScheduleAppointment.html',
                        action: 'add',
                        backup: false
                    },
                    {
                        path: 'ViewAppointments.html',
                        action: 'add',
                        backup: false
                    }
                ],
                requirements: ['Aeon 6.0+'],
                configuration: [
                    {
                        key: 'AppointmentSettings.Enabled',
                        value: 'true',
                        description: 'Enable appointment scheduling'
                    }
                ]
            },
            {
                id: 'dualauth-portal1',
                name: 'Modern Dual Authentication Portal',
                version: '6.0.20',
                description: 'Modern design with Atlas branding and cookie consent',
                files: [
                    {
                        path: 'AtlasAuthPortal/Views/Portal/Index.cshtml',
                        action: 'replace',
                        backup: true
                    }
                ],
                requirements: ['.NET Framework 4.7.2', 'IIS Application Setup'],
                incompatible: ['dualauth-simplesquares'],
                configuration: [
                    {
                        key: 'SessionCookieName',
                        value: 'AeonSessionID',
                        description: 'Session cookie name'
                    },
                    {
                        key: 'UsePersistentRedirectCookie',
                        value: 'true',
                        description: 'Use persistent redirect cookie'
                    },
                    {
                        key: 'AuthTypeCookieName',
                        value: 'AtlasAuthType',
                        description: 'Auth type cookie name'
                    }
                ]
            },
            {
                id: 'dualauth-simplesquares',
                name: 'Simple Squares Dual Authentication Portal',
                version: '6.0.20',
                description: 'Information-rich design with usage policies',
                files: [
                    {
                        path: 'AtlasAuthPortal/Views/Portal/Index.cshtml',
                        action: 'replace',
                        backup: true
                    }
                ],
                requirements: ['.NET Framework 4.7.2', 'IIS Application Setup'],
                incompatible: ['dualauth-portal1'],
                configuration: [
                    {
                        key: 'SessionCookieName',
                        value: 'AeonSessionID',
                        description: 'Session cookie name'
                    },
                    {
                        key: 'UsePersistentRedirectCookie',
                        value: 'true',
                        description: 'Use persistent redirect cookie'
                    },
                    {
                        key: 'AuthTypeCookieName',
                        value: 'AtlasAuthType',
                        description: 'Auth type cookie name'
                    }
                ]
            }
        ];

        return features;
    }

    /**
     * Install a feature package
     */
    async installFeature(featureId: string, targetPath: string): Promise<void> {
        const features = await this.getAvailableFeatures();
        const feature = features.find(f => f.id === featureId);
        
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        // Check compatibility
        await this.checkCompatibility(feature);

        // Install files
        for (const file of feature.files) {
            await this.installFile(file, targetPath, featureId);
        }

        // Mark as installed
        this.installedFeatures.add(featureId);

        // Show configuration instructions
        if (feature.configuration && feature.configuration.length > 0) {
            await this.showConfigurationInstructions(feature);
        }
    }

    /**
     * Check if a feature is compatible
     */
    private async checkCompatibility(feature: FeaturePackage): Promise<void> {
        // Check for incompatible features
        if (feature.incompatible) {
            for (const incompatibleId of feature.incompatible) {
                if (this.installedFeatures.has(incompatibleId)) {
                    throw new Error(`Feature ${feature.name} is incompatible with already installed ${incompatibleId}`);
                }
            }
        }

        // Check requirements
        if (feature.requirements) {
            const unmetRequirements: string[] = [];
            
            for (const requirement of feature.requirements) {
                // In a real implementation, we would check actual requirements
                // For now, we'll just show them to the user
                console.log(`Requirement: ${requirement}`);
            }
            
            if (unmetRequirements.length > 0) {
                const proceed = await vscode.window.showWarningMessage(
                    `The following requirements may not be met: ${unmetRequirements.join(', ')}. Continue anyway?`,
                    'Yes',
                    'No'
                );
                
                if (proceed !== 'Yes') {
                    throw new Error('Installation cancelled due to unmet requirements');
                }
            }
        }
    }

    /**
     * Install a single file
     */
    private async installFile(file: FeatureFile, targetPath: string, featureId: string): Promise<void> {
        const fullPath = path.join(targetPath, file.path);
        const directory = path.dirname(fullPath);

        // Create directory if needed
        await fs.mkdir(directory, { recursive: true });

        // Backup existing file if needed
        if (file.backup && await this.fileExists(fullPath)) {
            const backupPath = `${fullPath}.backup-${Date.now()}`;
            await fs.copyFile(fullPath, backupPath);
            vscode.window.showInformationMessage(`Backed up ${file.path} to ${path.basename(backupPath)}`);
        }

        // Get content
        let content: string;
        if (file.content) {
            content = file.content;
        } else {
            // Load from bundled features
            content = await this.templateLoader.loadFeaturePackage(featureId);
        }

        // Write file
        await fs.writeFile(fullPath, content, 'utf-8');
    }

    /**
     * Show configuration instructions
     */
    private async showConfigurationInstructions(feature: FeaturePackage): Promise<void> {
        const configLines = ['', `Configuration required for ${feature.name}:`, ''];
        
        if (feature.configuration) {
            feature.configuration.forEach(config => {
                configLines.push(`- ${config.key} = ${config.value}`);
                configLines.push(`  ${config.description}`);
                configLines.push('');
            });
        }
        
        const doc = await vscode.workspace.openTextDocument({
            content: configLines.join('\n'),
            language: 'text'
        });
        
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Uninstall a feature
     */
    async uninstallFeature(featureId: string, targetPath: string): Promise<void> {
        const features = await this.getAvailableFeatures();
        const feature = features.find(f => f.id === featureId);
        
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        // Restore backups if available
        for (const file of feature.files) {
            if (file.backup) {
                await this.restoreBackup(path.join(targetPath, file.path));
            }
        }

        // Remove from installed set
        this.installedFeatures.delete(featureId);
    }

    /**
     * Restore a backup file
     */
    private async restoreBackup(filePath: string): Promise<void> {
        // Find most recent backup
        const directory = path.dirname(filePath);
        const basename = path.basename(filePath);
        
        try {
            const files = await fs.readdir(directory);
            const backups = files.filter(f => f.startsWith(`${basename}.backup-`));
            
            if (backups.length > 0) {
                // Sort by timestamp (newest first)
                backups.sort().reverse();
                const latestBackup = backups[0];
                
                await fs.copyFile(
                    path.join(directory, latestBackup),
                    filePath
                );
                
                vscode.window.showInformationMessage(`Restored ${basename} from backup`);
            }
        } catch (error) {
            console.error(`Failed to restore backup for ${filePath}:`, error);
        }
    }

    /**
     * Check if a file exists
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get list of installed features
     */
    getInstalledFeatures(): string[] {
        return Array.from(this.installedFeatures);
    }
}