/**
 * Docker resource types for resource management page
 */

export interface DockerResource {
  id: string;
  name: string;
  type: 'container' | 'volume';
  category: 'project' | 'service' | 'bundled' | 'helper' | 'ngrok' | 'unknown';
  status: string;
  isOrphan: boolean;
  needsUpdate: boolean;
  labels: Record<string, string>;
  createdAt: number;
  ownerId: string;
  ownerDisplayName: string;
}
