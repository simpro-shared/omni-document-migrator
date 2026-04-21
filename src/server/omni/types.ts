export interface OmniExportPayload {
  exportVersion?: string;
  document?: { name?: string; ephemeral?: string };
  dashboard?: unknown;
  workbookModel?: unknown;
  queryModels?: Record<string, unknown>;
  fileUploads?: Record<string, unknown>;
  baseModelId?: string;
  identifier?: string;
  [key: string]: unknown;
}

export interface OmniImportResponse {
  documentId: string;
  identifier: string;
}

export interface OmniDocumentRecord {
  identifier: string;
  name: string;
  folderId?: string;
  type?: string;
  updatedAt?: string;
  description?: string | null;
  labels?: string[];
  [key: string]: unknown;
}

export interface OmniLabelRecord {
  name: string;
  color?: string | null;
  description?: string | null;
  isVerified?: boolean;
  isHomepageSection?: boolean;
}

export interface OmniLabelsListResponse {
  labels: OmniLabelRecord[];
}

export interface OmniPageInfo {
  nextCursor?: string | null;
  hasNextPage?: boolean;
}

export interface OmniListResponse {
  pageInfo: OmniPageInfo;
  records: OmniDocumentRecord[];
}
