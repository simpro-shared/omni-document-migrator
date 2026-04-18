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
  [key: string]: unknown;
}

export interface OmniPageInfo {
  nextCursor?: string | null;
  hasNextPage?: boolean;
}

export interface OmniListResponse {
  pageInfo: OmniPageInfo;
  records: OmniDocumentRecord[];
}
