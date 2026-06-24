/**
 * forfeitPropagation 單元測試：建立 in-memory MongoDB，模擬選手棄權／過磅失格
 * 對 pending 場次 bye 化與沿 source 鏈推進下游的行為。
 */
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Match from "../../models/Match";
import { applyMemberForfeit } from "../forfeitPropagation";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

afterEach(async () => {
  await Match.deleteMany({});
});

interface CreateMatchInput {
  matchNo: number;
  status?: "pending" | "in-progress" | "completed";
  redName: string;
  redTeam: string;
  blueName: string;
  blueTeam: string;
  redSourceFromMatchNo?: number;
  blueSourceFromMatchNo?: number;
  isBye?: boolean;
}

async function makeMatch(eventId: mongoose.Types.ObjectId, input: CreateMatchInput) {
  return Match.create({
    eventId,
    matchType: "fighting",
    category: "male",
    tier: "OPEN",
    weightClass: "-77 公斤級",
    round: 1,
    matchNo: input.matchNo,
    scheduledOrder: input.matchNo,
    redPlayer: { name: input.redName, teamName: input.redTeam },
    bluePlayer: { name: input.blueName, teamName: input.blueTeam },
    status: input.status ?? "pending",
    isBye: input.isBye ?? false,
    redSource:
      input.redSourceFromMatchNo !== undefined
        ? { fromMatchNo: input.redSourceFromMatchNo, resolved: false }
        : null,
    blueSource:
      input.blueSourceFromMatchNo !== undefined
        ? { fromMatchNo: input.blueSourceFromMatchNo, resolved: false }
        : null,
  });
}

describe("applyMemberForfeit", () => {
  it("將選手所在 pending 場次標 bye、對手獲 dq 勝", async () => {
    const eventId = new mongoose.Types.ObjectId();
    const m1 = await makeMatch(eventId, {
      matchNo: 1,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Bob",
      blueTeam: "TeamY",
    });

    const result = await applyMemberForfeit({
      eventId: eventId.toString(),
      teamName: "TeamX",
      memberName: "Alice",
      reason: "weigh-in-failed",
    });

    expect(result.forfeitedMatchIds).toEqual([String(m1._id)]);
    expect(result.skippedMatchIds).toEqual([]);

    const reloaded = await Match.findById(m1._id);
    expect(reloaded?.status).toBe("completed");
    expect(reloaded?.isBye).toBe(true);
    expect(reloaded?.result?.winner).toBe("blue");
    expect(reloaded?.result?.method).toBe("dq");
  });

  it("一位選手有多場 pending → 全部 bye 化", async () => {
    const eventId = new mongoose.Types.ObjectId();
    await makeMatch(eventId, {
      matchNo: 1,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Bob",
      blueTeam: "TeamY",
    });
    await makeMatch(eventId, {
      matchNo: 2,
      redName: "Carol",
      redTeam: "TeamZ",
      blueName: "Alice",
      blueTeam: "TeamX",
    });

    const result = await applyMemberForfeit({
      eventId: eventId.toString(),
      teamName: "TeamX",
      memberName: "Alice",
      reason: "weigh-in-failed",
    });

    expect(result.forfeitedMatchIds).toHaveLength(2);
    const m1 = await Match.findOne({ matchNo: 1 });
    const m2 = await Match.findOne({ matchNo: 2 });
    expect(m1?.result?.winner).toBe("blue"); // Alice 在紅方 → 藍方 Bob 勝
    expect(m2?.result?.winner).toBe("red"); // Alice 在藍方 → 紅方 Carol 勝
  });

  it("沿 source 鏈推進下游：被 forfeit 的場次勝者填入下游紅／藍方", async () => {
    const eventId = new mongoose.Types.ObjectId();
    await makeMatch(eventId, {
      matchNo: 1,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Bob",
      blueTeam: "TeamY",
    });
    await makeMatch(eventId, {
      matchNo: 5,
      redName: "",
      redTeam: "",
      blueName: "Dave",
      blueTeam: "TeamW",
      redSourceFromMatchNo: 1,
    });

    const result = await applyMemberForfeit({
      eventId: eventId.toString(),
      teamName: "TeamX",
      memberName: "Alice",
      reason: "weigh-in-failed",
    });

    expect(result.propagatedTargets).toHaveLength(1);
    const m5 = await Match.findOne({ matchNo: 5 });
    expect(m5?.redPlayer.name).toBe("Bob");
    expect(m5?.redPlayer.teamName).toBe("TeamY");
    expect(m5?.redSource?.resolved).toBe(true);
  });

  it("in-progress 場次不修改、列入 skippedMatchIds", async () => {
    const eventId = new mongoose.Types.ObjectId();
    const pending = await makeMatch(eventId, {
      matchNo: 1,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Bob",
      blueTeam: "TeamY",
    });
    const inProgress = await makeMatch(eventId, {
      matchNo: 2,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Carol",
      blueTeam: "TeamZ",
      status: "in-progress",
    });

    const result = await applyMemberForfeit({
      eventId: eventId.toString(),
      teamName: "TeamX",
      memberName: "Alice",
      reason: "check-in-absent",
    });

    expect(result.forfeitedMatchIds).toEqual([String(pending._id)]);
    expect(result.skippedMatchIds).toEqual([String(inProgress._id)]);

    const stillInProgress = await Match.findById(inProgress._id);
    expect(stillInProgress?.status).toBe("in-progress");
  });

  it("已 completed 場次不會出現在任何列表（冪等）", async () => {
    const eventId = new mongoose.Types.ObjectId();
    const completed = await makeMatch(eventId, {
      matchNo: 1,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Bob",
      blueTeam: "TeamY",
      status: "completed",
    });

    const result = await applyMemberForfeit({
      eventId: eventId.toString(),
      teamName: "TeamX",
      memberName: "Alice",
      reason: "weigh-in-failed",
    });

    expect(result.forfeitedMatchIds).toEqual([]);
    expect(result.skippedMatchIds).toEqual([]);
    expect(result.propagatedTargets).toEqual([]);

    const stillCompleted = await Match.findById(completed._id);
    expect(stillCompleted?.status).toBe("completed");
  });

  it("同名比對採 (name + teamName) 雙鍵：不同 team 同名選手不互相影響", async () => {
    const eventId = new mongoose.Types.ObjectId();
    const m1 = await makeMatch(eventId, {
      matchNo: 1,
      redName: "Alice",
      redTeam: "TeamX",
      blueName: "Bob",
      blueTeam: "TeamY",
    });
    const m2 = await makeMatch(eventId, {
      matchNo: 2,
      redName: "Alice",
      redTeam: "TeamZ",
      blueName: "Carol",
      blueTeam: "TeamW",
    });

    const result = await applyMemberForfeit({
      eventId: eventId.toString(),
      teamName: "TeamX",
      memberName: "Alice",
      reason: "weigh-in-failed",
    });

    expect(result.forfeitedMatchIds).toEqual([String(m1._id)]);
    const m2Reloaded = await Match.findById(m2._id);
    expect(m2Reloaded?.status).toBe("pending");
  });
});
