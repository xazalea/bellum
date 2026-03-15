import 'server-only';

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
    const { adminDb } = await import('@/app/api/user/_util');
    const { doc, setDoc } = await import('firebase/firestore');
    const db = await adminDb();
    await setDoc(doc(db, 'vps_nodes', `${vpsId}_${nodeId}`), {
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
  const { adminDb } = await import('@/app/api/user/_util');
  const { collection, query, where, getDocs } = await import('firebase/firestore');
  const db = await adminDb();

  const snap = await getDocs(
    query(
      collection(db, 'vps_nodes'),
      where('vpsId', '==', vpsId)
    )
  );

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

  const { adminDb } = await import('@/app/api/user/_util');
  const { doc, setDoc, getDoc, deleteDoc } = await import('firebase/firestore');
  const db = await adminDb();

  const reqRef = doc(db, 'vps_requests', req.requestId);

  await setDoc(reqRef, {
    ...req,
    vpsId,
    createdAt: now(),
    state: 'pending',
  });

  const start = now();
  while (now() - start < 25_000) {
    const respDocRef = doc(db, 'vps_responses', req.requestId);
    const respDoc = await getDoc(respDocRef);
    if (respDoc.exists()) {
      const data = respDoc.data() as ResponseMsg;
      await deleteDoc(reqRef);
      await deleteDoc(respDocRef);
      return data;
    }
    await new Promise(r => setTimeout(r, 500));
  }

  // Timeout
  await deleteDoc(reqRef); // Cancel request
  throw new Error('timeout');
}

/**
 * Poll for the next request for this VPS.
 * Nodes call this.
 */
export async function pollNext(vpsId: string, nodeId: string): Promise<Pending | null> {
  const { adminDb } = await import('@/app/api/user/_util');
  const { collection, query, where, orderBy, limit, getDocs, runTransaction } = await import('firebase/firestore');
  const db = await adminDb();
  const start = now();

  // Long-poll simulation
  while (now() - start < 15_000) { // Return before Vercel timeout (usually 10-60s)
    const snap = await getDocs(
      query(
        collection(db, 'vps_requests'),
        where('vpsId', '==', vpsId),
        where('state', '==', 'pending'),
        orderBy('createdAt', 'asc'),
        limit(1)
      )
    );

    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const data = docSnap.data() as Pending;

      try {
        await runTransaction(db, async (t) => {
          const fresh = await t.get(docSnap.ref);
          if (!fresh.exists() || fresh.data()?.state !== 'pending') throw new Error('taken');
          t.update(docSnap.ref, { state: 'processing', assignedTo: nodeId });
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
  const { adminDb } = await import('@/app/api/user/_util');
  const { doc, setDoc } = await import('firebase/firestore');
  const db = await adminDb();
  await setDoc(doc(db, 'vps_responses', resp.requestId), resp);
}

