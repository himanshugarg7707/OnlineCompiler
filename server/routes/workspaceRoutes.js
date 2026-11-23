import { Router } from 'express';
import {
  getWorkspaceSnapshot,
  listWorkspaceSnapshots,
  saveWorkspaceSnapshot,
} from '../workspaceStore.js';
import { requireAuth } from './authRoutes.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, workspaces: await listWorkspaceSnapshots(req.authUser.id) });
  } catch (error) {
    console.error('[Workspace API] List failed:', error);
    res.status(503).json({ success: false, error: 'Could not load cloud workspaces. Your local workspace is still available.' });
  }
});

router.get('/:workspaceId', requireAuth, async (req, res) => {
  const workspaceId = String(req.params.workspaceId || '');
  if (!workspaceId || workspaceId.length > 160) {
    return res.status(400).json({ success: false, error: 'Invalid workspace ID.' });
  }
  try {
    const workspace = await getWorkspaceSnapshot(req.authUser.id, workspaceId);
    if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found.' });
    return res.json({ success: true, workspace });
  } catch (error) {
    console.error('[Workspace API] Load failed:', error);
    return res.status(503).json({ success: false, error: 'Could not load this cloud workspace. Your local workspace is still available.' });
  }
});

router.put('/:workspaceId', requireAuth, async (req, res) => {
  const workspaceId = String(req.params.workspaceId || '');
  if (!workspaceId || workspaceId.length > 160) {
    return res.status(400).json({ success: false, error: 'Invalid workspace ID.' });
  }
  try {
    const result = await saveWorkspaceSnapshot(req.authUser.id, workspaceId, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    const isPayloadValidation = /must include|at most|needs a name|40 MB/.test(error.message);
    if (!isPayloadValidation) console.error('[Workspace API] Save failed:', error);
    return res.status(isPayloadValidation ? 400 : 503).json({ success: false, error: isPayloadValidation ? error.message : 'Could not sync workspace to the database. Your local copy is safe.' });
  }
});

export default router;
