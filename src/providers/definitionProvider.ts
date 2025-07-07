import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class AeonDefinitionProvider implements vscode.DefinitionProvider {
    
    provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Definition> {
        
        // Check if we're on an include tag
        const includeRange = document.getWordRangeAtPosition(position, /<#INCLUDE[^>]+>/i);
        if (!includeRange) {
            return null;
        }
        
        const includeText = document.getText(includeRange);
        const filenameMatch = includeText.match(/filename=["']([^"']+)["']/i);
        
        if (!filenameMatch) {
            return null;
        }
        
        const filename = filenameMatch[1];
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        
        if (!workspaceFolder) {
            return null;
        }
        
        // Get search paths from configuration
        const searchPaths = vscode.workspace.getConfiguration('aeon').get<string[]>('includeSearchPaths') || ['.', 'includes'];
        const locations: vscode.Location[] = [];
        
        // Search for the file in configured paths
        for (const searchPath of searchPaths) {
            const possiblePaths = [
                path.join(workspaceFolder.uri.fsPath, searchPath, filename),
                path.join(workspaceFolder.uri.fsPath, filename),
                path.join(path.dirname(document.uri.fsPath), filename)
            ];
            
            for (const possiblePath of possiblePaths) {
                if (fs.existsSync(possiblePath)) {
                    const targetUri = vscode.Uri.file(possiblePath);
                    locations.push(new vscode.Location(targetUri, new vscode.Position(0, 0)));
                }
            }
        }
        
        // Return unique locations
        const uniqueLocations = locations.filter((loc, index, self) => 
            index === self.findIndex(l => l.uri.toString() === loc.uri.toString())
        );
        
        if (uniqueLocations.length === 1) {
            return uniqueLocations[0];
        } else if (uniqueLocations.length > 1) {
            return uniqueLocations;
        }
        
        // If file not found, show a helpful message
        vscode.window.showInformationMessage(
            `Include file '${filename}' not found. Searched in: ${searchPaths.join(', ')}`
        );
        
        return null;
    }
}