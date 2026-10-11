import {
  BuilderProject,
  BuilderProjectType,
  DeploymentProvider,
  DeploymentRecord,
  DesignPreferences,
  ProjectFile,
  PublishProviderStatus,
} from '../types';

export interface StudioProjectsResponse {
  success: boolean;
  projects: BuilderProject[];
  tokenBalance: number;
  message?: string;
}

export interface StudioGenerateRequest {
  projectId?: string;
  name: string;
  projectType: BuilderProjectType;
  description: string;
  designPreferences: DesignPreferences;
  requiredFeatures: string[];
  refinementPrompt?: string;
  existingFiles?: ProjectFile[];
  merchantId?: string;
}

export interface StudioGenerateResponse {
  success: boolean;
  project?: BuilderProject;
  tokenBalance?: number;
  tokensDeducted?: number;
  message?: string;
}

export async function fetchStudioProjects(merchantId = 'shop_mama_mary'): Promise<StudioProjectsResponse> {
  const res = await fetch(`/api/studio/projects?merchantId=${encodeURIComponent(merchantId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load Odry Studio projects.');
  }
  return res.json();
}

export async function generateStudioProjectWithAI(
  payload: StudioGenerateRequest
): Promise<StudioGenerateResponse> {
  const res = await fetch('/api/studio/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({
    success: false,
    message: 'Invalid response from AI generation server.',
  }));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'AI project generation failed.');
  }
  return data;
}

export async function saveStudioProjectChanges(
  projectId: string,
  updates: Partial<{
    name: string;
    projectType: BuilderProjectType;
    description: string;
    designPreferences: DesignPreferences;
    requiredFeatures: string[];
    files: ProjectFile[];
  }>
): Promise<{ success: boolean; project: BuilderProject; message?: string }> {
  const res = await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to save project changes.');
  }
  return data;
}

export async function duplicateStudioProject(
  projectId: string
): Promise<{ success: boolean; project: BuilderProject }> {
  const res = await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to duplicate project.');
  }
  return data;
}

export async function deleteStudioProject(
  projectId: string
): Promise<{ success: boolean; deletedId: string }> {
  const res = await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to delete project.');
  }
  return data;
}

export async function fetchPublishProviders(): Promise<{
  success: boolean;
  providers: PublishProviderStatus[];
}> {
  const res = await fetch('/api/studio/publish/providers');
  const data = await res.json().catch(() => ({ success: false, providers: [] }));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to check deployment provider status.');
  }
  return data;
}

export async function publishStudioProject(
  projectId: string,
  customSlug?: string,
  provider: DeploymentProvider = 'odry_cloud'
): Promise<{
  success: boolean;
  project: BuilderProject;
  publishedUrl: string;
  publishedSlug: string;
  provider: DeploymentProvider;
  deployment?: DeploymentRecord;
  message?: string;
}> {
  const res = await fetch(`/api/studio/projects/${encodeURIComponent(projectId)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customSlug, provider }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to publish project.');
  }
  return data;
}
