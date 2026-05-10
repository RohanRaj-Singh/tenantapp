import { TenantRuntimeConfig } from '../contracts/runtime';
import { tenantAScannerVersion } from './mockScannerCatalog';

export const mockRuntimeConfig: TenantRuntimeConfig = {
  tenant: {
    id: 'tenant-remedygcc-a',
    name: 'RemedyGCC Energy Alliance',
    slug: 'tenant-a',
    status: 'active',
    plan: 'enterprise',
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  branding: {
    logoUrl: '/images/orgLogo.png',
    primaryColor: '#0f766e',
    secondaryColor: '#0d9488',
    fontFamily: 'Inter, system-ui, sans-serif',
    faviconUrl: '/favicon.ico',
  },
  attributeTemplate: {
    streams: [
      { id: 'stream-1', label: 'Commercial', value: 'commercial' },
      { id: 'stream-2', label: 'Operations', value: 'operations' },
      { id: 'stream-3', label: 'Technology', value: 'technology' },
    ],
    locations: [
      { id: 'loc-1', label: 'Head Office', value: 'headoffice' },
      { id: 'loc-2', label: 'Regional Office - North', value: 'north' },
      { id: 'loc-3', label: 'Regional Office - South', value: 'south' },
      { id: 'loc-4', label: 'Remote', value: 'remote' },
    ],
    functions: [
      // Commercial stream functions
      { id: 'func-1', label: 'Business Development', value: 'business_development', streamId: 'stream-1' },
      { id: 'func-2', label: 'Commercial', value: 'commercial', streamId: 'stream-1' },
      { id: 'func-3', label: 'Sales', value: 'sales', streamId: 'stream-1' },
      { id: 'func-4', label: 'Client Relations', value: 'client_relations', streamId: 'stream-1' },
      // Operations stream functions
      { id: 'func-5', label: 'Operations Management', value: 'operations_management', streamId: 'stream-2' },
      { id: 'func-6', label: 'Quality Assurance', value: 'quality_assurance', streamId: 'stream-2' },
      { id: 'func-7', label: 'Supply Chain', value: 'supply_chain', streamId: 'stream-2' },
      // Technology stream functions
      { id: 'func-8', label: 'Software Development', value: 'software_development', streamId: 'stream-3' },
      { id: 'func-9', label: 'IT Support', value: 'it_support', streamId: 'stream-3' },
      { id: 'func-10', label: 'Data Analytics', value: 'data_analytics', streamId: 'stream-3' },
    ],
    departments: [
      // Commercial → Business Development
      { id: 'dept-1', label: 'Business Development', value: 'business_development', streamId: 'stream-1', functionId: 'func-1' },
      { id: 'dept-2', label: 'Strategic Partnerships', value: 'strategic_partnerships', streamId: 'stream-1', functionId: 'func-1' },
      // Commercial → Commercial
      { id: 'dept-3', label: 'Commercial', value: 'commercial', streamId: 'stream-1', functionId: 'func-2' },
      { id: 'dept-4', label: 'Procurement', value: 'procurement', streamId: 'stream-1', functionId: 'func-2' },
      // Commercial → Sales
      { id: 'dept-5', label: 'Enterprise Sales', value: 'enterprise_sales', streamId: 'stream-1', functionId: 'func-3' },
      { id: 'dept-6', label: 'Retail Sales', value: 'retail_sales', streamId: 'stream-1', functionId: 'func-3' },
      // Commercial → Client Relations
      { id: 'dept-7', label: 'Account Management', value: 'account_management', streamId: 'stream-1', functionId: 'func-4' },
      { id: 'dept-8', label: 'Customer Support', value: 'customer_support', streamId: 'stream-1', functionId: 'func-4' },
      // Operations → Operations Management
      { id: 'dept-9', label: 'Operations Strategy', value: 'operations_strategy', streamId: 'stream-2', functionId: 'func-5' },
      { id: 'dept-10', label: 'Process Improvement', value: 'process_improvement', streamId: 'stream-2', functionId: 'func-5' },
      // Operations → Quality Assurance
      { id: 'dept-11', label: 'Quality Control', value: 'quality_control', streamId: 'stream-2', functionId: 'func-6' },
      { id: 'dept-12', label: 'Compliance', value: 'compliance', streamId: 'stream-2', functionId: 'func-6' },
      // Operations → Supply Chain
      { id: 'dept-13', label: 'Logistics', value: 'logistics', streamId: 'stream-2', functionId: 'func-7' },
      { id: 'dept-14', label: 'Inventory Management', value: 'inventory_management', streamId: 'stream-2', functionId: 'func-7' },
      // Technology → Software Development
      { id: 'dept-15', label: 'Frontend Development', value: 'frontend_development', streamId: 'stream-3', functionId: 'func-8' },
      { id: 'dept-16', label: 'Backend Development', value: 'backend_development', streamId: 'stream-3', functionId: 'func-8' },
      // Technology → IT Support
      { id: 'dept-17', label: 'Helpdesk', value: 'helpdesk', streamId: 'stream-3', functionId: 'func-9' },
      { id: 'dept-18', label: 'Infrastructure', value: 'infrastructure', streamId: 'stream-3', functionId: 'func-9' },
      // Technology → Data Analytics
      { id: 'dept-19', label: 'Business Intelligence', value: 'business_intelligence', streamId: 'stream-3', functionId: 'func-10' },
      { id: 'dept-20', label: 'Data Science', value: 'data_science', streamId: 'stream-3', functionId: 'func-10' },
    ],
    genders: ['male', 'female', 'other', 'prefer_not_to_say'],
    ageGroups: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
    seniorityLevels: ['intern', 'employee', 'senior', 'manager', 'director', 'vp', 'c_suite'],
  },
  scannerVersion: tenantAScannerVersion,
  runtimeSettings: {
    allowAnonymous: true,
    requireAuthentication: false,
    surveyExpirationDays: 30,
    allowMultipleSubmissions: false,
    language: 'en',
    featureFlags: {
      enableFollowUps: true,
      enableRiskAnalysis: true,
    },
  },
};
