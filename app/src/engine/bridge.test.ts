import { beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { getEngineStatus, startEngine, requestEngine, type EngineRequest } from "./bridge";
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
beforeEach(() => { vi.mocked(invoke).mockReset(); });
it("uses separate explicit start and side-effect-free status commands", async () => {
 vi.mocked(invoke).mockResolvedValue({ state: "ready", worldId: "00112233-4455-6677-8899-aabbccddeeff" });
 expect((await startEngine()).state).toBe("ready"); await getEngineStatus();
 expect(vi.mocked(invoke).mock.calls.map((call) => call[0])).toEqual(["engine_start", "engine_status"]);
});
it("passes exact integer strings and full references without header selection", async () => {
 const request: EngineRequest = { op: "field", entity: { worldId: "00112233-4455-6677-8899-aabbccddeeff", index: 4294967294, generation: 4294967295 }, componentTypeId: "efbeba2d-21cd-4df8-a757-d96e53f8380c", schemaRevision: 1, fieldId: "dea816fc-0ae4-4eac-b02a-a1596450f93a", value: { kind: "integer", value: "-9223372036854775808" } };
 vi.mocked(invoke).mockResolvedValue({ op: "mutation", entity: request.entity }); await requestEngine(request);
 expect(invoke).toHaveBeenCalledWith("engine_request", { request });
 expect(JSON.parse(JSON.stringify(vi.mocked(invoke).mock.calls[0]?.[1]))).toEqual({ request });
});
it("preserves native domain results and unknown transport failures", async () => {
 const native = { op: "error", code: "worldFailure", nativeCode: "world.schema/schema.wrong_type", message: "Wrong type.", fieldPath: ["dea816fc-0ae4-4eac-b02a-a1596450f93a"] };
 vi.mocked(invoke).mockResolvedValue(native); expect(await requestEngine({ op: "list", offset: "18446744073709551615", limit: 1 })).toBe(native);
 const failure = { code: "pipe_read", message: "The engine operation failed.", outcome: "unknown", rawExit: 1067 };
 vi.mocked(invoke).mockRejectedValue(failure); await expect(requestEngine({ op: "create", components: [] })).rejects.toBe(failure);
});
