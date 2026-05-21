import type {
  MatchCategory,
  MatchSource,
  MatchTier,
  MatchType,
} from '../models/match.model';

const TIER_LABEL_MAP: Record<string, MatchTier> = {
  幼兒組: 'KID',
  國小低年級組: 'EL',
  國小中年級組: 'EM',
  國小高年級組: 'EH',
  青少年國中組: 'JH',
  青少年高中組: 'SH',
  公開組: 'OPEN',
};

const VALID_TIER_LABELS = Object.keys(TIER_LABEL_MAP);

const CATEGORY_MAP: Record<string, MatchCategory> = {
  male: 'male',
  female: 'female',
  mixed: 'mixed',
  男: 'male',
  女: 'female',
  混合: 'mixed',
};

const TYPE_MAP: Record<string, MatchType> = {
  'ne-waza': 'ne-waza',
  fighting: 'fighting',
  contact: 'contact',
};

const PLACEMENT_RE = /^\s*(\d+)\s*勝\s*$/;
const LEGACY_PLACEMENT_RE = /^\s*[A-Za-z]\s*(\d+)\s*勝\s*$/;

export interface ParsedMatch {
  matchType: MatchType;
  category: MatchCategory;
  tier: MatchTier | null;
  weightClass: string;
  round: number;
  matchNo: number;
  scheduledOrder: number;
  redPlayer: { name: string; teamName: string };
  bluePlayer: { name: string; teamName: string };
  redSource: MatchSource | null;
  blueSource: MatchSource | null;
  isBye: boolean;
}

export interface ParseError {
  error: string;
}

export function parseTierLabel(label: string): MatchTier | null {
  return TIER_LABEL_MAP[String(label ?? '').trim()] ?? null;
}

/**
 * 解析 `{N}勝` placeholder。回傳：
 *   - 正整數 N（合法 placeholder）
 *   - null（非 placeholder，視為一般姓名）
 * 若偵測到 `A{N}勝` 等舊格式則拋例外讓上層產生明確錯誤訊息。
 */
export function parsePlacementPlaceholder(name: string): number | null {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  const m = trimmed.match(PLACEMENT_RE);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (LEGACY_PLACEMENT_RE.test(trimmed)) {
    throw new Error(
      `「{N}勝」placeholder 格式不可包含字母前綴，請將 "${trimmed}" 改為「${trimmed.replace(/^[A-Za-z]\s*/, '')}」`,
    );
  }
  return null;
}

function buildSide(
  name: string,
  enablePlacement: boolean,
): {
  player: { name: string; teamName: string };
  source: MatchSource | null;
} {
  const trimmed = String(name ?? '').trim();
  if (enablePlacement) {
    const placement = parsePlacementPlaceholder(trimmed);
    if (placement !== null) {
      return {
        player: { name: `${placement} 勝者`, teamName: '' },
        source: { fromMatchNo: placement, resolved: false },
      };
    }
  }
  return {
    player: { name: trimmed, teamName: '' },
    source: null,
  };
}

export function parseMatchRow(
  row: Record<string, string | number>,
  fallbackMatchType: MatchType = 'ne-waza',
): ParsedMatch | ParseError {
  const rawType = String(
    row['項目'] ?? row['matchType'] ?? fallbackMatchType,
  )
    .toLowerCase()
    .trim();
  const matchType = TYPE_MAP[rawType] ?? fallbackMatchType;

  const rawCategory = String(row['組別'] ?? row['category'] ?? '')
    .toLowerCase()
    .trim();
  const category = CATEGORY_MAP[rawCategory];
  if (!category) {
    return { error: `組別欄位無效："${rawCategory}"，必須為 male/female/mixed 之一` };
  }

  const tierLabel = String(row['分級'] ?? row['tier'] ?? '').trim();
  let tier: MatchTier | null = null;
  if (matchType === 'ne-waza') {
    tier = parseTierLabel(tierLabel);
    if (!tier) {
      return {
        error: `分級欄位無效："${tierLabel}"，必須為 ${VALID_TIER_LABELS.join(' / ')} 之一`,
      };
    }
  }

  const weightClass = String(row['量級'] ?? row['weightClass'] ?? '').trim();
  if (!weightClass) {
    return { error: '量級為必填' };
  }

  const round = Number(row['回合'] ?? row['round']);
  if (!Number.isFinite(round) || round < 1) {
    return { error: `回合必須為正整數，收到 "${row['回合'] ?? row['round']}"` };
  }

  const matchNo = Number(row['場次序'] ?? row['scheduledOrder']);
  if (!Number.isFinite(matchNo) || matchNo < 1) {
    return { error: '場次序為必填，且必須為正整數' };
  }

  // 紅方 / 藍方
  const redRawName = String(row['紅方姓名'] ?? '').trim();
  const redTeamName = String(row['紅方隊名'] ?? '').trim();
  const blueRawName = String(row['藍方姓名'] ?? '').trim();
  const blueTeamName = String(row['藍方隊名'] ?? '').trim();

  const enablePlacement = matchType === 'ne-waza';
  let redSide: ReturnType<typeof buildSide>;
  let blueSide: ReturnType<typeof buildSide>;
  try {
    redSide = buildSide(redRawName, enablePlacement);
    blueSide = buildSide(blueRawName, enablePlacement);
  } catch (err) {
    return { error: (err as Error).message };
  }

  // 若 buildSide 未產生 source（一般姓名），保留原本隊名
  if (!redSide.source) redSide.player.teamName = redTeamName;
  if (!blueSide.source) blueSide.player.teamName = blueTeamName;

  // 藍方完全空白（姓名與隊名皆無）→ bye 場次
  const isBye = blueRawName === '' && blueTeamName === '';

  return {
    matchType,
    category,
    tier,
    weightClass,
    round,
    matchNo,
    scheduledOrder: matchNo,
    redPlayer: redSide.player,
    bluePlayer: blueSide.player,
    redSource: redSide.source,
    blueSource: blueSide.source,
    isBye,
  };
}

export function isParseError(
  result: ParsedMatch | ParseError,
): result is ParseError {
  return (result as ParseError).error !== undefined;
}
