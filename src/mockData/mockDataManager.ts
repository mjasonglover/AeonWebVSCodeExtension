import * as vscode from 'vscode';
import { DefaultProfile, NewUserProfile, ReturningUserProfile, AdminProfile, TestDataProfile, MockDataProfile } from './dataProfiles';

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
    
    getAllFields(): Record<string, any> {
        return Object.fromEntries(this.fields);
    }
    
    toJSON(): Record<string, any> {
        return Object.fromEntries(this.fields);
    }
    
    clone(): MockData {
        return new MockData(this.toJSON());
    }
}

export class MockDataManager {
    private currentProfile: string = 'default';
    private customData: Map<string, any> = new Map();
    private profiles: Map<string, MockDataProfile> = new Map();
    
    constructor() {
        this.loadProfiles();
        this.loadCustomProfiles();
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
    
    private async loadCustomProfiles(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aeon');
        const customProfiles = config.get<any[]>('mockData.profiles', []);
        
        for (const profile of customProfiles) {
            if (profile.name && profile.data) {
                this.profiles.set(profile.name, new CustomProfile(profile.name, new MockData(profile.data)));
            }
        }
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
    
    public getProfileNames(): string[] {
        return Array.from(this.profiles.keys());
    }
    
    public getCurrentProfileName(): string {
        return this.currentProfile;
    }
    
    public async saveCustomProfile(name: string): Promise<void> {
        const data = this.getCurrentData();
        const profile = new CustomProfile(name, data);
        this.profiles.set(name, profile);
        
        // Persist to workspace settings
        const config = vscode.workspace.getConfiguration('aeon');
        const customProfiles = config.get<any[]>('mockData.profiles', []);
        
        // Remove existing profile with same name
        const filteredProfiles = customProfiles.filter(p => p.name !== name);
        
        // Add new profile
        filteredProfiles.push({
            name,
            data: data.toJSON()
        });
        
        await config.update('mockData.profiles', filteredProfiles, vscode.ConfigurationTarget.Workspace);
    }
    
    public async deleteCustomProfile(name: string): Promise<void> {
        // Don't allow deleting built-in profiles
        const builtInProfiles = ['default', 'newUser', 'returningUser', 'admin', 'testData'];
        if (builtInProfiles.includes(name)) {
            throw new Error('Cannot delete built-in profile');
        }
        
        this.profiles.delete(name);
        
        // Remove from workspace settings
        const config = vscode.workspace.getConfiguration('aeon');
        const customProfiles = config.get<any[]>('mockData.profiles', []);
        const filteredProfiles = customProfiles.filter(p => p.name !== name);
        
        await config.update('mockData.profiles', filteredProfiles, vscode.ConfigurationTarget.Workspace);
        
        // If we deleted the current profile, switch to default
        if (this.currentProfile === name) {
            this.setProfile('default');
        }
    }
    
    public exportProfile(profileName: string): string {
        const profile = this.profiles.get(profileName);
        if (!profile) {
            throw new Error(`Profile not found: ${profileName}`);
        }
        
        const data = profile.getData();
        return JSON.stringify({
            name: profileName,
            data: data.toJSON()
        }, null, 2);
    }
    
    public async importProfile(jsonContent: string): Promise<string> {
        try {
            const parsed = JSON.parse(jsonContent);
            if (!parsed.name || !parsed.data) {
                throw new Error('Invalid profile format');
            }
            
            // Generate unique name if it already exists
            let name = parsed.name;
            let counter = 1;
            while (this.profiles.has(name)) {
                name = `${parsed.name} (${counter++})`;
            }
            
            await this.saveCustomProfile(name);
            return name;
        } catch (error: any) {
            throw new Error(`Failed to import profile: ${error.message}`);
        }
    }
}

class CustomProfile extends MockDataProfile {
    constructor(
        private name: string,
        private data: MockData
    ) {
        super();
    }
    
    getName(): string {
        return this.name;
    }
    
    getData(): MockData {
        return this.data.clone();
    }
}