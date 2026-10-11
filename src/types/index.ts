export type Language = 'sw' | 'en';

export type SubscriptionStatusType =
  | 'ACTIVE'
  | 'FREE'
  | 'TRIAL'
  | 'PRO'
  | 'PENDING_APPROVAL'
  | 'EXPIRED'
  | 'REJECTED';

export interface SubscriptionRequestItem {
  id: string;
  merchantId: string;
  shopName: string;
  phoneNumber: string;
  mpesaCode: string;
  amount: number;
  planName: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  approvedAt?: string;
  rejectedReason?: string;
  expiresAt?: string;
}

export interface Shop {
  id: string;
  slug: string;
  name: string;
  ownerName: string;
  phoneNumber: string;
  whatsappNumber: string;
  location: string;
  city: string;
  category?: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  mpesaType: 'till' | 'paybill' | 'send_money';
  mpesaTill?: string;
  mpesaPaybill?: string;
  mpesaAccount?: string;
  mpesaNumber: string;
  email?: string;
  emailNotificationsEnabled?: boolean;
  isOpen: boolean;
  rating: number;
  totalOrders: number;
  isPro?: boolean;
  proPlan?: 'FREE' | 'TRIAL' | 'PRO' | 'ENTERPRISE';
  proStatus?: SubscriptionStatusType;
  proMpesaCode?: string;
  proExpiresAt?: string;
  proDaysRemaining?: number;
  trialUsed?: boolean;
}

// ==========================================
// ODRY STUDIO — AI WEBSITE & APP BUILDER TYPES
// ==========================================

export type BuilderProjectType =
  | 'website'
  | 'mobile_app'
  | 'web_app'
  | 'booking_system'
  | 'business_management'
  | 'custom_project';

export type StudioViewMode = 'home' | 'dashboard' | 'workspace' | 'projects' | 'published';

export type ResponsiveViewport = 'desktop' | 'tablet' | 'mobile';
export type ResponsiveDeviceViewport = ResponsiveViewport;

export interface ProjectFile {
  path: string;
  language: 'html' | 'css' | 'javascript' | 'json' | 'markdown';
  content: string;
}

export interface StudioChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  filesUpdated?: string[];
}

export interface DesignPreferences {
  colorPalette:
    | 'indigo_slate'
    | 'emerald_mint'
    | 'amber_obsidian'
    | 'rose_quartz'
    | 'ocean_cyan'
    | 'monochrome_ink';
  themeMode: 'dark' | 'light' | 'system' | 'adaptive';
  typography: 'modern_sans' | 'editorial_serif' | 'technical_mono';
  layoutDensity: 'compact' | 'comfortable' | 'spacious';
  theme?: string;
  layoutStyle?: string;
  primaryColor?: string;
}

export type DeploymentProvider = 'vercel' | 'netlify' | 'odry_cloud';

export interface DeploymentRecord {
  id: string;
  provider: DeploymentProvider;
  providerLabel: string;
  url: string;
  inspectUrl?: string;
  slug: string;
  status: 'READY' | 'BUILDING' | 'ERROR';
  filesDeployed: number;
  createdAt: string;
}

export interface PublishProviderStatus {
  id: DeploymentProvider;
  name: string;
  description: string;
  configured: boolean;
  envVarName: string;
  apiEndpoint: string;
}

export interface BuilderProject {
  id: string;
  name: string;
  projectType: BuilderProjectType;
  description: string;
  designPreferences: DesignPreferences;
  requiredFeatures: string[];
  files: ProjectFile[];
  previewHtml?: string;
  architectureSummary: string;
  status: 'draft' | 'ready' | 'published';
  publishedUrl?: string;
  publishedSlug?: string;
  publishedAt?: string;
  publishedProvider?: DeploymentProvider;
  deployments?: DeploymentRecord[];
  createdAt: string;
  updatedAt: string;
  tokensUsed?: number;
}
