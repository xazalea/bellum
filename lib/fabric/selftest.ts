import { canonicalStringify, cidForJSON } from "./cid";
import { fabricCas } from "./cas";
import { DeterministicStateMachine } from "./state_machine";

export interface FabricSelfTestResult {
  ok: boolean;
  checks: { name: string; ok: boolean; details?: string }[];
}

export async function runFabricSelfTest(): Promise<FabricSelfTestResult> {
  const checks: FabricSelfTestResult["checks"] = [];

  const assert = (name: string, ok: boolean, details?: string) => {
    checks.push({ name, ok, details });
  };

  // canonical stringify stability
  const a = canonicalStringify({ b: 1, a: 2, c: { y: 1, x: 2 } });
  const b = canonicalStringify({ c: { x: 2, y: 1 }, a: 2, b: 1 });
  assert("canonicalStringify stable", a === b, `${a} vs ${b}`);

  // CID stability
  const cid1 = await cidForJSON({ z: 3, a: 1 });
  const cid2 = await cidForJSON({ a: 1, z: 3 });
  assert("cidForJSON stable", cid1 === cid2, `${cid1} vs ${cid2}`);

  // Deterministic state machine: simulate should not mutate head; apply should.
  const init = { count: 0 };
  const { cid: initCid } = await fabricCas.putJSON(init);

  const m = new DeterministicStateMachine<{ count: number }, { inc: number }, { count: number }>({
    serviceId: "selftest",
    codeCid: "codecid-selftest",
    initialStateCid: initCid,
    reducer: (s, r) => ({ nextState: { count: s.count + r.inc }, response: { count: s.count + r.inc }, trace: { inc: r.inc } })
  });

  const head0 = m.getHead();
  await m.simulate({ inc: 2 }, head0.stateCid, head0.lastSeq + 1);
  const head1 = m.getHead();
  assert("simulate does not mutate head", head0.stateCid === head1.stateCid && head0.lastSeq === head1.lastSeq);

  const applied = await m.apply({ inc: 2 });
  const head2 = m.getHead();
  assert("apply mutates head", head2.lastSeq === 1 && head2.stateCid !== head0.stateCid);
  assert("apply returns expected response", applied.response.count === 2);

  // Memoization: applying same request from same state should reuse cached output
  const stateBefore = head2.stateCid;
  const res2 = await m.simulate({ inc: 0 }, stateBefore, head2.lastSeq + 1);
  const res3 = await m.simulate({ inc: 0 }, stateBefore, head2.lastSeq + 1);
  assert("simulate memoizes identical transitions", res2.transition.nextStateCid === res3.transition.nextStateCid);

  const ok = checks.every((c) => c.ok);
  return { ok, checks };
}
