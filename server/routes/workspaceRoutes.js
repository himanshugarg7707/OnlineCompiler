import { Router } from 'express';
import {
  getWorkspaceSnapshot,
  listWorkspaceSnapshots,
  saveWorkspaceSnapshot,
} from '../workspaceStore.js';

const router = Router();

function getOwnerId(req, res) {
  const ownerId = String(req.get('x-fullcode-client-id') || '');
  if (!/^[a-f0-9-]{32,64}$/i.test(ownerId)) {
    res.status(400).json({ success: false, error: 'A valid local workspace client ID is required.' });
    return null;
  }
  return ownerId;
}

router.get('/', async (req, res) => {
  const ownerId = getOwnerId(req, res);
  if (!ownerId) return;
  try {
    res.json({ success: true, workspaces: await listWorkspaceSnapshots(ownerId) });
  } catch (error) {
    res.status(503).json({ success: false, error: error.message });
  }
});

router.get('/:workspaceId', async (req, res) => {
  const ownerId = getOwnerId(req, res);
  if (!ownerId) return;
  const workspaceId = String(req.params.workspaceId || '');
  if (!workspaceId || workspaceId.length > 160) {
    return res.status(400).json({ success: false, error: 'Invalid workspace ID.' });
  }
  try {
    const workspace = await getWorkspaceSnapshot(ownerId, workspaceId);
    if (!workspace) return res.status(404).json({ success: false, error: 'Workspace not found.' });
    return res.json({ success: true, workspace });
  } catch (error) {
    return res.status(503).json({ success: false, error: error.message });
  }
});

router.put('/:workspaceId', async (req, res) => {
  const ownerId = getOwnerId(req, res);
  if (!ownerId) return;
  const workspaceId = String(req.params.workspaceId || '');
  if (!workspaceId || workspaceId.length > 160) {
    return res.status(400).json({ success: false, error: 'Invalid workspace ID.' });
  }
  try {
    const result = await saveWorkspaceSnapshot(ownerId, workspaceId, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    const isPayloadValidation = /must include|at most|needs a name|40 MB/.test(error.message);
    return res.status(isPayloadValidation ? 400 : 503).json({ success: false, error: error.message });
  }
});

export default router;
