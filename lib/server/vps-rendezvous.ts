import 'server-only';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

type Pending = {
  requestId: string;
  vpsId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  bodyBase64?: string | null;
  createdAt?: number;
};

type ResponseMsg = {
  requestId: string;
  status: number;
  headers: Record<string, string>;
  bodyBase64: string;
};

const OWNER_TTL_MS = 25_000;

function now() {
  return Date.now();
}

/**
 * Register a node as active for a VPS.
 * Uses Firestore to persist state across serverless invocations.
 */
export async function registerOwner(vpsId: string, nodeId: string) {
  try {
    const db = getAdminDb();
    // Use a subcollection for nodes to allow scalable cleanup/querying
    await db.collection('vps_nodes').doc(`${vpsId}_${nodeId}`).set({
      vpsId,
      nodeId,
      lastSeenMs: now(),
      // Auto-expire this record via TTL policy if supported, or manual cleanup
      expiresAt: now() + OWNER_TTL_MS + 10_000, 
    });
    console.log(`[VPS] Registered ${nodeId} for ${vpsId}`);
  } catch (e) {
    console.error('[VPS] Register failed', e);
  }
}

async function getActiveNodes(vpsId: string): Promise<string[]> {
  const db = getAdminDb();
  // Simple query for active nodes
  // Note: Requires composite index on vpsId + lastSeenMs ideally, 
  // but for small scale, client-side filtering (in code) after vpsId query works if list is small.
  // We'll trust 'vpsId' equality and filter time in code to avoid complex index setup errors for now.
  const snap = await db.collection('vps_nodes')
    .where('vpsId', '==', vpsId)
    .get();
  
  const active: string[] = [];
  const t = now();
  for (const doc of snap.docs) {
    const d = doc.data();
    if (t - (d.lastSeenMs || 0) < OWNER_TTL_MS) {
      active.push(d.nodeId);
    }
  }
  return active.sort(); // Deterministic order
}

/**
 * Enqueue a request for a VPS.
 * Writes to Firestore 'vps_requests' and waits for 'vps_responses'.
 */
export async function enqueueRequest(vpsId: string, req: Pending): Promise<ResponseMsg> {
  const active = await getActiveNodes(vpsId);
  if (active.length === 0) {
    console.warn(`[VPS] No active nodes for ${vpsId}`);
    throw new Error('no_nodes_online');
  }

  // We don't target a specific node ID in the request document necessarily, 
  // but we can if we want sticky sessions. For now, any node can pick it up.
  // We'll write to a collection that nodes poll.
  const db = getAdminDb();
  const reqRef = db.collection('vps_requests').doc(req.requestId);
  
  await reqRef.set({
    ...req,
    vpsId,
    createdAt: now(),
    state: 'pending',
  });

  // Poll for response
  // In a real server we'd use onSnapshot, but in serverless we must be careful with execution time.
  // We'll use a short polling loop (25s max).
  const start = now();
  while (now() - start < 25_000) {
    // Check for response document
    const respDoc = await db.collection('vps_responses').doc(req.requestId).get();
    if (respDoc.exists) {
      const data = respDoc.data() as ResponseMsg;
      // Cleanup
      await reqRef.delete();
      await respDoc.ref.delete();
      return data;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Timeout
  await reqRef.delete(); // Cancel request
  throw new Error('timeout');
}

/**
 * Poll for the next request for this VPS.
 * Nodes call this.
 */
export async function pollNext(vpsId: string, nodeId: string): Promise<Pending | null> {
  // Update heartbeat implicitly or explicitly? 
  // Caller usually calls registerOwner separately, but we can do it here too lightly?
  // Let's stick to the explicit registerOwner call in the client loop.

  const db = getAdminDb();
  const start = now();

  // Long-poll simulation
  while (now() - start < 15_000) { // Return before Vercel timeout (usually 10-60s)
    // Find oldest pending request for this VPS
    const snap = await db.collection('vps_requests')
      .where('vpsId', '==', vpsId)
      .where('state', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data() as Pending;
      
      // Try to "claim" it to prevent other nodes from processing it
      try {
        await db.runTransaction(async (t) => {
          const fresh = await t.get(doc.ref);
          if (!fresh.exists || fresh.data()?.state !== 'pending') throw new Error('taken');
          t.update(doc.ref, { state: 'processing', assignedTo: nodeId });
        });
        return data;
      } catch (e) {
        // Race condition lost, try again next loop
      }
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return null;
}

/**
 * Post a response from a node.
 */
export async function postResponse(vpsId: string, nodeId: string, resp: ResponseMsg) {
  const db = getAdminDb();
  await db.collection('vps_responses').doc(resp.requestId).set(resp);
}

