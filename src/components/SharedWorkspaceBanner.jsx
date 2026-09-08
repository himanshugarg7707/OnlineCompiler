import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { saveNamedWorkspace } from '../services/workspaceService';
import { Share2, Save, X, Check, FolderKanban } from 'lucide-react';
import './SharedWorkspaceBanner.css';

export default function SharedWorkspaceBanner() {
  const { state, dispatch, showToast } = useApp();
  const { sharedNotice, files, folders, activeFileId, stdin, detectedLanguage } = state;
  const [saved, setSaved] = useState(false);

  if (!sharedNotice) return null;

  const handleSaveToWorkspaces = () => {
    const wsName = `Shared Project (${new Date().toLocaleDateString()})`;
    saveNamedWorkspace(wsName, files, folders, activeFileId, stdin, detectedLanguage);
    setSaved(true);
    showToast(`Shared workspace saved to your workspaces! 💾`);
    setTimeout(() => {
      dispatch({ type: 'CLEAR_SHARED_NOTICE' });
    }, 2000);
  };

  const handleOpenWorkspaces = () => {
    dispatch({ type: 'SET_WORKSPACES_MODAL', payload: true });
  };

  const handleDismiss = () => {
    dispatch({ type: 'CLEAR_SHARED_NOTICE' });
  };

  return (
    <div className="shared-workspace-banner animate-slide-down">
      <div className="shared-banner-content">
        <div className="shared-banner-icon-wrap">
          <Share2 size={14} className="shared-banner-icon" />
        </div>
        <div className="shared-banner-text">
          <strong>Shared Workspace Loaded ({files.length} files)</strong>
          <span>All files and environment have been restored. You can edit and run safely.</span>
        </div>
      </div>

      <div className="shared-banner-actions">
        {saved ? (
          <button className="btn-banner-saved" disabled>
            <Check size={13} />
            <span>Saved in Workspaces</span>
          </button>
        ) : (
          <button className="btn-banner-save" onClick={handleSaveToWorkspaces}>
            <Save size={13} />
            <span>Save to My Workspaces</span>
          </button>
        )}

        <button className="btn-banner-manage" onClick={handleOpenWorkspaces} title="Open Workspaces Manager">
          <FolderKanban size={13} />
          <span>Workspaces</span>
        </button>

        <button className="btn-banner-close" onClick={handleDismiss} title="Dismiss notice">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
