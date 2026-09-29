'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { WorkspaceFile } from '@curiousbees/types';
import { useStore } from '@/store/useStore';

/** Human-readable size; link-type files have no stored size. */
export function formatWorkspaceFileSize(file: Pick<WorkspaceFile, 'size' | 'storageKey'>): string {
  if (!file.storageKey && !file.size) return 'Link';
  const bytes = file.size || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Opens a workspace file. Uploaded files live in a private bucket, so the API
 * authorizes the request against the workspace and returns a short-lived URL.
 */
export function WorkspaceFileDownloadButton({
  workspaceId,
  file,
  label = 'Download',
  className,
}: {
  workspaceId: string;
  file: WorkspaceFile;
  label?: string;
  className?: string;
}) {
  const { getWorkspaceFileDownloadUrl, addToast } = useStore();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      if (file.storageKey) {
        const url = await getWorkspaceFileDownloadUrl(workspaceId, file.id);
        window.location.assign(url);
      } else if (file.url) {
        window.open(file.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      addToast(err?.message || 'Unable to open this file.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={className}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </button>
  );
}
