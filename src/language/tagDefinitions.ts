export interface TagAttribute {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'enum';
  values?: string[];
  description: string;
}

export interface AeonTag {
  name: string;
  description: string;
  attributes: TagAttribute[];
  examples: string[];
  category: TagCategory;
}

export enum TagCategory {
  Display = 'display',
  Include = 'include',
  Control = 'control',
  Table = 'table',
  User = 'user',
  Activity = 'activity',
  Utility = 'utility'
}

export const AEON_TAGS: Map<string, AeonTag> = new Map([
  ['PARAM', {
    name: 'PARAM',
    description: 'Displays the value of a parameter passed to the page',
    category: TagCategory.Display,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The parameter name to display (e.g., TransactionNumber, FirstName, ItemTitle)'
      },
      {
        name: 'enabled',
        required: false,
        type: 'string',
        description: 'CSS class to apply when the condition is enabled'
      },
      {
        name: 'disabled',
        required: false,
        type: 'string',
        description: 'CSS class to apply when the condition is disabled'
      }
    ],
    examples: [
      '<#PARAM name="TransactionNumber">',
      '<#PARAM name="ItemTitle">',
      '<#PARAM name="Username">',
      '<#PARAM name="RequestLinksVisible" enabled="RequestForEnabled" disabled="d-none">'
    ]
  }],
  
  ['INCLUDE', {
    name: 'INCLUDE',
    description: 'Includes content from another HTML file or generates special include types',
    category: TagCategory.Include,
    attributes: [
      {
        name: 'filename',
        required: false,
        type: 'string',
        description: 'The HTML file to include (relative to web root)'
      },
      {
        name: 'type',
        required: false,
        type: 'enum',
        values: ['DetailedDocTypeInformation', 'Photoduplication', 'RISDocTypeInformation'],
        description: 'Special include type for dynamic content'
      },
      {
        name: 'restriction',
        required: false,
        type: 'string',
        description: 'Conditional restriction for including the content'
      }
    ],
    examples: [
      '<#INCLUDE filename="include_header.html">',
      '<#INCLUDE filename="include_footer.html">',
      '<#INCLUDE type="DetailedDocTypeInformation">',
      '<#INCLUDE type="Photoduplication" filename="include_photoduplication.html">',
      '<#INCLUDE filename="include_menu.html" restriction="IsValidSession">'
    ]
  }],
  
  ['STATUS', {
    name: 'STATUS',
    description: 'Displays status messages and errors on the page',
    category: TagCategory.Display,
    attributes: [],
    examples: [
      '<#STATUS>',
      '<div id="statusLine"><#STATUS></div>'
    ]
  }],
  
  ['ERROR', {
    name: 'ERROR',
    description: 'Displays error CSS class for form field validation',
    category: TagCategory.Display,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The error field name (typically ERROR + FieldName)'
      }
    ],
    examples: [
      '<#ERROR name="ERRORItemTitle">',
      '<#ERROR name="ERRORFirstName">',
      '<span class="<#ERROR name=\'ERRORCallNumber\'>">'
    ]
  }],
  
  ['OPTION', {
    name: 'OPTION',
    description: 'Generates dropdown options from CustomDropDown table groups',
    category: TagCategory.Control,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The CustomDropDown group name to load options from'
      },
      {
        name: 'selectedValue',
        required: false,
        type: 'string',
        description: 'The currently selected value'
      },
      {
        name: 'defaultName',
        required: false,
        type: 'string',
        description: 'Default option text to display'
      },
      {
        name: 'defaultValue',
        required: false,
        type: 'string',
        description: 'Default option value'
      },
      {
        name: 'hideUsernames',
        required: false,
        type: 'boolean',
        description: 'Hide usernames in the display (for RequestLinks)'
      }
    ],
    examples: [
      '<#OPTION name="Departments" selectedValue="<#PARAM name=\'Department\'>" defaultName="Choose a Department" defaultValue="">',
      '<#OPTION name="RequestLinks" hideUsernames="true">',
      '<#OPTION name="Formats">'
    ]
  }],
  
  ['TABLE', {
    name: 'TABLE',
    description: 'Displays data tables with customizable formatting',
    category: TagCategory.Table,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'enum',
        values: [
          'ViewOutstandingRequests', 'ViewSearchResults', 'ViewActivityRequests',
          'ViewAllRequests', 'ViewRequestHistory', 'ViewCheckedOutItems',
          'ViewCancelledItems', 'ViewUserReviewRequests', 'ViewOrderEstimates',
          'ViewOrderBilling', 'ViewElectronicDelivery', 'BillingDetails',
          'CreditCardPayments'
        ],
        description: 'The table type to display'
      },
      {
        name: 'id',
        required: false,
        type: 'string',
        description: 'HTML ID for the table element'
      },
      {
        name: 'class',
        required: false,
        type: 'string',
        description: 'CSS classes for the table'
      },
      {
        name: 'HeaderText',
        required: false,
        type: 'string',
        description: 'Custom header text for the table'
      },
      {
        name: 'NoDataAction',
        required: false,
        type: 'string',
        description: 'Action to take when no data is available'
      },
      {
        name: 'NoDataMessage',
        required: false,
        type: 'string',
        description: 'Message to display when no data is available'
      },
      {
        name: 'Column',
        required: false,
        type: 'string',
        description: 'Column definition in format "field:label"'
      }
    ],
    examples: [
      '<#TABLE name="ViewOutstandingRequests" class="table table-striped" id="outstanding-requests">',
      '<#TABLE name="ViewAllRequests" HeaderText="All Requests" NoDataMessage="No requests found">',
      '<#TABLE name="ViewSearchResults" Column="TransactionNumber:Request #" Column="ItemTitle:Title">'
    ]
  }],
  
  ['CONDITIONAL', {
    name: 'CONDITIONAL',
    description: 'Conditional display of content based on system settings',
    category: TagCategory.Control,
    attributes: [
      {
        name: 'type',
        required: true,
        type: 'enum',
        values: ['CustomizationKey', 'ConvertingToCopy', 'IsValidSession'],
        description: 'The type of condition to check'
      },
      {
        name: 'test',
        required: false,
        type: 'string',
        description: 'The value to test against'
      },
      {
        name: 'true',
        required: false,
        type: 'string',
        description: 'Output when condition is true'
      },
      {
        name: 'false',
        required: false,
        type: 'string',
        description: 'Output when condition is false'
      }
    ],
    examples: [
      '<#CONDITIONAL type="CustomizationKey" test="GroupRequestsByLocation" true="Your items will be grouped by location">',
      '<#CONDITIONAL type="ConvertingToCopy" true="This request is being converted to a copy order">',
      '<#CONDITIONAL type="IsValidSession" true="logged in" false="not logged in">'
    ]
  }],
  
  ['USER', {
    name: 'USER',
    description: 'Displays user information fields',
    category: TagCategory.User,
    attributes: [
      {
        name: 'field',
        required: true,
        type: 'string',
        description: 'The user field to display (e.g., Username, FirstName, LastName, EmailAddress)'
      }
    ],
    examples: [
      '<#USER field="Username">',
      '<#USER field="FirstName">',
      '<#USER field="EmailAddress">',
      '<#USER field="Department">'
    ]
  }],
  
  ['ACTIVITY', {
    name: 'ACTIVITY',
    description: 'Displays activity-related information',
    category: TagCategory.Activity,
    attributes: [
      {
        name: 'field',
        required: true,
        type: 'string',
        description: 'The activity field to display (e.g., Name, Description, BeginDate)'
      },
      {
        name: 'display',
        required: false,
        type: 'enum',
        values: ['ISO8601'],
        description: 'Display format for the field'
      }
    ],
    examples: [
      '<#ACTIVITY field="Name">',
      '<#ACTIVITY field="Description">',
      '<#ACTIVITY field="BeginDate" display="ISO8601">',
      '<#ACTIVITY field="Location">'
    ]
  }],
  
  ['FORMSTATE', {
    name: 'FORMSTATE',
    description: 'Maintains form state across page submissions',
    category: TagCategory.Utility,
    attributes: [],
    examples: [
      '<#FORMSTATE>',
      '<form method="post"><#FORMSTATE>...</form>'
    ]
  }],
  
  ['ACTION', {
    name: 'ACTION',
    description: 'Generates action URLs for navigation and form submission',
    category: TagCategory.Utility,
    attributes: [
      {
        name: 'action',
        required: true,
        type: 'string',
        description: 'The action number (see Aeon action reference)'
      },
      {
        name: 'form',
        required: false,
        type: 'string',
        description: 'The form number (see Aeon form reference)'
      }
    ],
    examples: [
      '<#ACTION action="10" form="1">',
      '<#ACTION action="10" form="3">',
      '<#ACTION action="11">'
    ]
  }],
  
  ['REPLACE', {
    name: 'REPLACE',
    description: 'Replaces text strings in the output',
    category: TagCategory.Utility,
    attributes: [
      {
        name: 'old',
        required: true,
        type: 'string',
        description: 'Text to find and replace'
      },
      {
        name: 'new',
        required: true,
        type: 'string',
        description: 'Replacement text'
      }
    ],
    examples: [
      '<#REPLACE old="oldtext" new="newtext">',
      '<#REPLACE old=" " new="&nbsp;">'
    ]
  }],
  
  ['SESSION', {
    name: 'SESSION',
    description: 'Accesses session variables',
    category: TagCategory.Utility,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The session variable name'
      }
    ],
    examples: [
      '<#SESSION name="Username">',
      '<#SESSION name="LastLogin">'
    ]
  }],
  
  ['COOKIE', {
    name: 'COOKIE',
    description: 'Accesses cookie values',
    category: TagCategory.Utility,
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The cookie name'
      }
    ],
    examples: [
      '<#COOKIE name="SessionID">',
      '<#COOKIE name="UserPreference">'
    ]
  }],
  
  ['COPYRIGHT', {
    name: 'COPYRIGHT',
    description: 'Displays copyright information',
    category: TagCategory.Display,
    attributes: [],
    examples: [
      '<#COPYRIGHT>',
      '<div><#COPYRIGHT></div>'
    ]
  }],
  
  ['BILLINGACCOUNT', {
    name: 'BILLINGACCOUNT',
    description: 'Handles billing account information',
    category: TagCategory.Utility,
    attributes: [],
    examples: ['<#BILLINGACCOUNT>']
  }],
  
  ['PHOTODUPLICATION', {
    name: 'PHOTODUPLICATION',
    description: 'Related to photoduplication request handling',
    category: TagCategory.Utility,
    attributes: [],
    examples: ['<#PHOTODUPLICATION>']
  }],
  
  ['PAYMENTPROVIDERURL', {
    name: 'PAYMENTPROVIDERURL',
    description: 'Payment provider URL for payment forms',
    category: TagCategory.Utility,
    attributes: [],
    examples: ['<#PAYMENTPROVIDERURL>']
  }]
]);

// Helper function to get all tag names
export function getAllTagNames(): string[] {
  return Array.from(AEON_TAGS.keys());
}

// Helper function to get tag by name
export function getTag(tagName: string): AeonTag | undefined {
  return AEON_TAGS.get(tagName.toUpperCase());
}

// Helper function to get tags by category
export function getTagsByCategory(category: TagCategory): AeonTag[] {
  return Array.from(AEON_TAGS.values()).filter(tag => tag.category === category);
}