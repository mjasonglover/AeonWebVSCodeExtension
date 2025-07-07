import { MockData } from './mockDataManager';

export abstract class MockDataProfile {
    abstract getName(): string;
    abstract getData(): MockData;
}

export class DefaultProfile extends MockDataProfile {
    getName(): string { return 'Default'; }
    
    getData(): MockData {
        return new MockData({
            // Transaction fields
            TransactionNumber: '12345',
            TransactionStatus: 'Submitted',
            TransactionDate: new Date().toISOString().split('T')[0],
            ItemTitle: 'Sample Document Title',
            ItemAuthor: 'John Doe',
            ItemDate: '2023',
            ItemVolume: '',
            ItemIssue: '',
            ItemPages: '1-50',
            CallNumber: 'MS 123.45',
            Location: 'Special Collections',
            ReferenceNumber: 'REF-2023-001',
            ItemCitation: 'Doe, John. "Sample Document." Archive Collection, 2023.',
            ItemFormat: 'Manuscript',
            
            // User fields
            Username: 'jdoe',
            FirstName: 'John',
            LastName: 'Doe',
            EmailAddress: 'jdoe@example.com',
            Phone: '555-1234',
            Status: 'Active',
            Department: 'Research',
            Organization: 'University Library',
            Address: '123 Main St',
            City: 'Anytown',
            State: 'ST',
            Zip: '12345',
            Country: 'USA',
            UserCategory: 'Faculty',
            
            // Activity fields
            ActivityName: 'Reading Room Session',
            ActivityType: 'Research',
            ActivityBeginDate: new Date().toISOString().split('T')[0],
            ActivityEndDate: '',
            ActivityLocation: 'Reading Room A',
            
            // Request fields
            RequestType: 'Loan',
            ScheduledDate: '',
            ResearcherNotes: '',
            StaffNotes: '',
            SpecialRequest: '',
            
            // System fields
            WebRequestForm: 'DefaultRequest',
            FormState: 'Edit',
            DocumentType: 'Manuscript',
            
            // Status and error fields
            StatusMessage: '',
            ErrorMessages: new Map(),
            
            // Custom fields
            ItemInfo1: '',
            ItemInfo2: '',
            ItemInfo3: '',
            ItemInfo4: '',
            ItemInfo5: '',
            UserInfo1: '',
            UserInfo2: '',
            UserInfo3: '',
            UserInfo4: '',
            UserInfo5: ''
        });
    }
}

export class NewUserProfile extends MockDataProfile {
    getName(): string { return 'New User'; }
    
    getData(): MockData {
        return new MockData({
            // Transaction fields
            TransactionNumber: '',
            TransactionStatus: 'New',
            TransactionDate: new Date().toISOString().split('T')[0],
            ItemTitle: '',
            ItemAuthor: '',
            ItemDate: '',
            ItemVolume: '',
            ItemIssue: '',
            ItemPages: '',
            CallNumber: '',
            Location: '',
            ReferenceNumber: '',
            ItemCitation: '',
            ItemFormat: '',
            
            // User fields
            Username: '',
            FirstName: '',
            LastName: '',
            EmailAddress: '',
            Phone: '',
            Status: 'Unverified',
            Department: '',
            Organization: '',
            Address: '',
            City: '',
            State: '',
            Zip: '',
            Country: 'USA',
            UserCategory: '',
            
            // Activity fields
            ActivityName: '',
            ActivityType: '',
            ActivityBeginDate: '',
            ActivityEndDate: '',
            ActivityLocation: '',
            
            // Request fields
            RequestType: '',
            ScheduledDate: '',
            ResearcherNotes: '',
            StaffNotes: '',
            SpecialRequest: '',
            
            // System fields
            WebRequestForm: 'UserRegistration',
            FormState: 'New',
            DocumentType: '',
            
            // Status and error fields
            StatusMessage: 'Please complete your user registration.',
            ErrorMessages: new Map(),
            
            // Custom fields
            ItemInfo1: '',
            ItemInfo2: '',
            ItemInfo3: '',
            ItemInfo4: '',
            ItemInfo5: '',
            UserInfo1: '',
            UserInfo2: '',
            UserInfo3: '',
            UserInfo4: '',
            UserInfo5: ''
        });
    }
}

export class ReturningUserProfile extends MockDataProfile {
    getName(): string { return 'Returning User'; }
    
    getData(): MockData {
        const errorMap = new Map<string, string>();
        errorMap.set('ItemTitle', 'This field is required');
        
        return new MockData({
            // Transaction fields
            TransactionNumber: '12346',
            TransactionStatus: 'In Progress',
            TransactionDate: new Date().toISOString().split('T')[0],
            ItemTitle: '',
            ItemAuthor: 'Smith, Jane',
            ItemDate: '1950-1975',
            ItemVolume: '3',
            ItemIssue: '',
            ItemPages: '',
            CallNumber: 'MS 456.78',
            Location: 'Rare Books',
            ReferenceNumber: '',
            ItemCitation: '',
            ItemFormat: 'Book',
            
            // User fields
            Username: 'jsmith',
            FirstName: 'Jane',
            LastName: 'Smith',
            EmailAddress: 'jsmith@university.edu',
            Phone: '555-5678',
            Status: 'Active',
            Department: 'History',
            Organization: 'State University',
            Address: '456 College Ave',
            City: 'University City',
            State: 'ST',
            Zip: '54321',
            Country: 'USA',
            UserCategory: 'Graduate Student',
            
            // Activity fields
            ActivityName: 'Dissertation Research',
            ActivityType: 'Academic',
            ActivityBeginDate: new Date().toISOString().split('T')[0],
            ActivityEndDate: '',
            ActivityLocation: 'Reading Room B',
            
            // Request fields
            RequestType: 'Duplication',
            ScheduledDate: '',
            ResearcherNotes: 'Need high-resolution scans for chapters 3-5',
            StaffNotes: '',
            SpecialRequest: 'Please handle with care - fragile binding',
            
            // System fields
            WebRequestForm: 'DuplicationRequest',
            FormState: 'Edit',
            DocumentType: 'Book',
            
            // Status and error fields
            StatusMessage: 'Please complete all required fields.',
            ErrorMessages: errorMap,
            
            // Custom fields
            ItemInfo1: 'First Edition',
            ItemInfo2: 'Good condition',
            ItemInfo3: '',
            ItemInfo4: '',
            ItemInfo5: '',
            UserInfo1: 'PhD Candidate',
            UserInfo2: 'Expected graduation: 2024',
            UserInfo3: '',
            UserInfo4: '',
            UserInfo5: ''
        });
    }
}

export class AdminProfile extends MockDataProfile {
    getName(): string { return 'Admin User'; }
    
    getData(): MockData {
        return new MockData({
            // Transaction fields
            TransactionNumber: '99999',
            TransactionStatus: 'Approved',
            TransactionDate: new Date().toISOString().split('T')[0],
            ItemTitle: 'Administrative Test Document',
            ItemAuthor: 'System Administrator',
            ItemDate: '2023',
            ItemVolume: '',
            ItemIssue: '',
            ItemPages: 'All',
            CallNumber: 'ADMIN-001',
            Location: 'Staff Office',
            ReferenceNumber: 'ADMIN-REF-001',
            ItemCitation: 'Internal testing document',
            ItemFormat: 'Digital',
            
            // User fields
            Username: 'admin',
            FirstName: 'System',
            LastName: 'Administrator',
            EmailAddress: 'admin@library.org',
            Phone: '555-0000',
            Status: 'Active',
            Department: 'IT',
            Organization: 'Library Systems',
            Address: '1 Library Plaza',
            City: 'Library City',
            State: 'ST',
            Zip: '00000',
            Country: 'USA',
            UserCategory: 'Staff',
            
            // Activity fields
            ActivityName: 'System Testing',
            ActivityType: 'Administrative',
            ActivityBeginDate: new Date().toISOString().split('T')[0],
            ActivityEndDate: new Date().toISOString().split('T')[0],
            ActivityLocation: 'Online',
            
            // Request fields
            RequestType: 'Loan',
            ScheduledDate: new Date().toISOString().split('T')[0],
            ResearcherNotes: 'Testing all system features',
            StaffNotes: 'Admin access - all permissions enabled',
            SpecialRequest: 'N/A',
            
            // System fields
            WebRequestForm: 'AdminRequest',
            FormState: 'Submitted',
            DocumentType: 'All Types',
            
            // Status and error fields
            StatusMessage: 'Admin mode active - all features enabled',
            ErrorMessages: new Map(),
            
            // Custom fields
            ItemInfo1: 'Test Value 1',
            ItemInfo2: 'Test Value 2',
            ItemInfo3: 'Test Value 3',
            ItemInfo4: 'Test Value 4',
            ItemInfo5: 'Test Value 5',
            UserInfo1: 'Admin Level 10',
            UserInfo2: 'Full Access',
            UserInfo3: 'No Restrictions',
            UserInfo4: 'System Override',
            UserInfo5: 'Debug Mode'
        });
    }
}

export class TestDataProfile extends MockDataProfile {
    getName(): string { return 'Test Data'; }
    
    getData(): MockData {
        const errorMap = new Map<string, string>();
        errorMap.set('EmailAddress', 'Invalid email format');
        errorMap.set('Phone', 'Phone number is required');
        errorMap.set('CallNumber', 'Call number not found in catalog');
        
        return new MockData({
            // Transaction fields with edge cases
            TransactionNumber: '99999999999',
            TransactionStatus: 'Pending Review',
            TransactionDate: '1900-01-01',
            ItemTitle: 'Very Long Title That Goes On And On And On And Should Eventually Be Truncated Because It Is Too Long To Display Properly In Most User Interfaces',
            ItemAuthor: 'Multiple Authors; With Special Characters & Symbols @#$%',
            ItemDate: 'circa 1850-1900?',
            ItemVolume: 'Volume I-III',
            ItemIssue: 'Special Issue #1',
            ItemPages: 'pp. 1-1000, plates I-XX',
            CallNumber: 'SPEC/COLL/123.456/789/ABC/DEF/GHI',
            Location: 'Off-site Storage - Building A - Floor 3 - Aisle 42 - Shelf B',
            ReferenceNumber: 'REF-9999-9999-9999',
            ItemCitation: 'Very long citation with "quotes" and <special> characters & more...',
            ItemFormat: 'Mixed Media',
            
            // User fields with validation issues
            Username: 'test_user_with_very_long_username_123456789',
            FirstName: 'Test-User\'s',
            LastName: 'O\'Malley-Smith Jr., Ph.D.',
            EmailAddress: 'not-a-valid-email',
            Phone: '',
            Status: 'Suspended',
            Department: 'N/A',
            Organization: 'テスト組織 (Test Organization)',
            Address: '123 Main St\nApt 4B\nBuilding C',
            City: 'Saint Paul\'s-by-the-Sea',
            State: 'XX',
            Zip: '00000-0000',
            Country: 'Test Country',
            UserCategory: 'Unknown',
            
            // Activity fields with edge cases
            ActivityName: '🔬 Research Activity with Emoji',
            ActivityType: 'Other',
            ActivityBeginDate: '2999-12-31',
            ActivityEndDate: '1999-01-01',
            ActivityLocation: 'TBD',
            
            // Request fields with special cases
            RequestType: 'PhotoduplicationRequest',
            ScheduledDate: 'ASAP',
            ResearcherNotes: '<script>alert("test")</script>This should be escaped',
            StaffNotes: 'NULL',
            SpecialRequest: ''.padEnd(1000, 'Very long special request '),
            
            // System fields
            WebRequestForm: 'UnknownForm',
            FormState: 'Error',
            DocumentType: '',
            
            // Status and error fields
            StatusMessage: '⚠️ Multiple validation errors detected. Please review all fields.',
            ErrorMessages: errorMap,
            
            // Custom fields with various data types
            ItemInfo1: '12345.67',
            ItemInfo2: 'true',
            ItemInfo3: 'null',
            ItemInfo4: '["array", "of", "values"]',
            ItemInfo5: '{"type": "object", "nested": true}',
            UserInfo1: '',
            UserInfo2: 'undefined',
            UserInfo3: '0',
            UserInfo4: '-1',
            UserInfo5: '∞'
        });
    }
}