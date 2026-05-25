import { Difficulty } from '@/lib/types';
import { BODY_PART_VOICE_HINTS, EXERCISE_VOICE_ALIASES } from '@/lib/voice/exerciseAliases';

const KOREAN_DIGITS: Record<string, number> = {
  영: 0, 공: 0, 제로: 0,
  일: 1, 한: 1,
  이: 2, 두: 2,
  삼: 3, 세: 3,
  사: 4, 네: 4,
  오: 5, 다섯: 5,
  육: 6, 륙: 6, 여섯: 6,
  칠: 7, 일곱: 7,
  팔: 8, 여덟: 8,
  구: 9, 아홉: 9,
  십: 10, 열: 10,
};

export function normalizeSpeech(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** 비교용: 공백·특수문자 제거 (연음으로 붙어 인식된 텍스트 대응) */
export function compactSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\-_,.!?~'"·]/g, '')
    .trim();
}

/** 레벤슈타인 거리 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = temp;
    }
  }
  return row[b.length];
}

/** 0~1 유사도 (1에 가까울수록 동일) */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.62;
const MIN_FUZZY_LEN = 3;

function scoreContains(transcript: string, phrase: string): number {
  const t = compactSpeech(transcript);
  const p = compactSpeech(phrase);
  if (!p) return 0;
  if (t === p) return 100;
  if (t.includes(p)) return 92;
  if (p.includes(t) && t.length >= MIN_FUZZY_LEN) return 85;
  return 0;
}

function scoreFuzzy(transcript: string, phrase: string): number {
  const t = compactSpeech(transcript);
  const p = compactSpeech(phrase);
  if (p.length < MIN_FUZZY_LEN) return 0;

  // 부분 구간 퍼지: 긴 문장 안에서 별칭 길이만큼 슬라이딩
  if (t.length >= p.length) {
    let best = 0;
    for (let i = 0; i <= t.length - p.length; i++) {
      const slice = t.slice(i, i + p.length);
      const sim = similarity(slice, p);
      if (sim > best) best = sim;
    }
    if (best >= FUZZY_THRESHOLD) return Math.round(70 * best);
  }

  const sim = similarity(t, p);
  if (sim >= FUZZY_THRESHOLD) return Math.round(65 * sim);
  return 0;
}

function scoreKeywords(transcript: string, name: string): number {
  const parts = name.split(/[\s\-]+/).filter(p => p.length >= 2);
  if (parts.length === 0) return 0;
  const t = compactSpeech(transcript);
  const matched = parts.filter(p => t.includes(compactSpeech(p))).length;
  if (matched === parts.length) return 78;
  if (matched >= 2 && parts.length >= 2) return 68;
  if (matched === 1 && parts.length === 1) return 72;
  return 0;
}

function scoreBodyPartHint(transcript: string, exerciseId: string, name: string): number {
  const hints = BODY_PART_VOICE_HINTS[exerciseId];
  if (!hints) return 0;
  const t = compactSpeech(transcript);
  const hasBody = hints.some(h => t.includes(compactSpeech(h)));
  if (!hasBody) return 0;
  const parts = name.split(/[\s\-]+/).filter(p => p.length >= 2);
  const core = parts[parts.length - 1] ?? '';
  if (core && t.includes(compactSpeech(core))) return 75;
  if (parts.some(p => p.length >= 2 && t.includes(compactSpeech(p)))) return 70;
  return 0;
}

export function parseNumberFromText(text: string): number | null {
  const digitMatch = text.match(/(\d+)/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    return Number.isNaN(n) ? null : n;
  }

  for (const [word, value] of Object.entries(KOREAN_DIGITS)) {
    if (text.includes(word)) return value;
  }

  return null;
}

export function matchExercise(
  transcript: string,
  exercises: { id: string; name: string }[],
): string | null {
  if (!transcript.trim()) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const ex of exercises) {
    const candidates = [
      ex.name,
      ...(EXERCISE_VOICE_ALIASES[ex.id] ?? []),
    ];

    let exScore = 0;

    for (const phrase of candidates) {
      exScore = Math.max(
        exScore,
        scoreContains(transcript, phrase),
        scoreFuzzy(transcript, phrase),
      );
    }

    exScore = Math.max(
      exScore,
      scoreKeywords(transcript, ex.name),
      scoreBodyPartHint(transcript, ex.id, ex.name),
    );

    if (exScore > bestScore) {
      bestScore = exScore;
      bestId = ex.id;
    }
  }

  // 최소 신뢰 점수 (오인식 방지)
  return bestScore >= 65 ? bestId : null;
}

export function parseSetsAndReps(text: string): { sets?: number; reps?: number } {
  const result: { sets?: number; reps?: number } = {};

  const setsMatch = text.match(/(\d+)\s*세트|세트\s*(\d+)/);
  if (setsMatch) {
    result.sets = parseInt(setsMatch[1] || setsMatch[2], 10);
  } else if (text.includes('세트')) {
    const n = parseNumberFromText(text);
    if (n !== null) result.sets = n;
  }

  const repsMatch = text.match(/(\d+)\s*회|회\s*(\d+)|횟수\s*(\d+)|(\d+)\s*번/);
  if (repsMatch) {
    const val = repsMatch[1] || repsMatch[2] || repsMatch[3] || repsMatch[4];
    result.reps = parseInt(val, 10);
  } else if (text.includes('회') || text.includes('횟수') || text.includes('번')) {
    const n = parseNumberFromText(text);
    if (n !== null) result.reps = n;
  }

  if (result.sets === undefined && result.reps === undefined) {
    const numbers: number[] = [];
    let match: RegExpExecArray | null;
    const re = /(\d+)/g;
    while ((match = re.exec(text)) !== null) {
      numbers.push(parseInt(match[1], 10));
    }
    if (numbers.length === 1) {
      result.reps = numbers[0];
    } else if (numbers.length >= 2) {
      result.sets = numbers[0];
      result.reps = numbers[1];
    }
  }

  return result;
}

export function parsePainScore(text: string): number | null {
  if (/통증\s*없|아프지\s*않|안\s*아프/.test(text)) return 0;

  const pointMatch = text.match(/(\d+)\s*점/);
  if (pointMatch) {
    const n = parseInt(pointMatch[1], 10);
    return n >= 0 && n <= 10 ? n : null;
  }

  const painMatch = text.match(/통증\s*(\d+)|(\d+)\s*통증/);
  if (painMatch) {
    const n = parseInt(painMatch[1] || painMatch[2], 10);
    return n >= 0 && n <= 10 ? n : null;
  }

  const n = parseNumberFromText(text);
  if (n !== null && n >= 0 && n <= 10) return n;

  return null;
}

export function parseDifficulty(text: string): Difficulty | null {
  if (/쉬움|쉬워|쉽/.test(text)) return 'easy';
  if (/어려움|어려워|힘들|어렵/.test(text)) return 'hard';
  if (/보통|적당|중간/.test(text)) return 'medium';
  return null;
}

export function parseMemo(text: string): string | null {
  const memoMatch = text.match(/메모[는:]?\s*(.+)|느낀\s*점[은:]?\s*(.+)/);
  if (memoMatch) {
    return (memoMatch[1] || memoMatch[2]).trim();
  }
  if (text.startsWith('메모')) {
    return text.replace(/^메모\s*/, '').trim() || null;
  }
  return null;
}

export function isSaveCommand(text: string): boolean {
  return /저장|기록\s*저장|완료|끝|제출/.test(text);
}

export function isSkipCommand(text: string): boolean {
  return /건너뛰|스킵|없음|패스|다음/.test(text);
}

export interface ParsedExerciseLogVoice {
  exerciseId?: string;
  sets?: number;
  reps?: number;
  painScore?: number;
  difficulty?: Difficulty;
  memo?: string;
}

/** 한 번에 말한 전체 문장에서 운동 기록 필드를 추출 */
export function parseFullExerciseLog(
  raw: string,
  exercises: { id: string; name: string }[],
): ParsedExerciseLogVoice {
  const text = normalizeSpeech(raw);
  const result: ParsedExerciseLogVoice = {};

  const exerciseId = matchExercise(text, exercises);
  if (exerciseId) result.exerciseId = exerciseId;

  const { sets, reps } = parseSetsAndReps(text);
  if (sets !== undefined) result.sets = Math.min(10, Math.max(1, sets));
  if (reps !== undefined) result.reps = Math.min(100, Math.max(1, reps));

  const pain = parsePainScore(text);
  if (pain !== null) result.painScore = pain;

  const difficulty = parseDifficulty(text);
  if (difficulty) result.difficulty = difficulty;

  const explicitMemo = parseMemo(text);
  if (explicitMemo) {
    result.memo = explicitMemo;
  } else {
    const tail = extractMemoTail(text);
    if (tail) result.memo = tail;
  }

  return result;
}

/** 운동·횟수·통증·난이도 키워드 뒤 남은 문장을 메모로 추정 */
function extractMemoTail(text: string): string | null {
  const markers = [
    /메모[는:]?\s*(.+)/,
    /느낀\s*점[은:]?\s*(.+)/,
    /(?:보통|쉬움|어려움|쉬워|어려워|힘들)[^.。,，]*[。.，,]?\s*(.+)/,
    /통증\s*\d+\s*점[^.。,，]*[。.，,]?\s*(.+)/,
  ];

  for (const re of markers) {
    const m = text.match(re);
    if (m?.[1]) {
      const cleaned = m[1]
        .replace(/(저장|기록|완료|끝).*$/, '')
        .trim();
      if (cleaned.length >= 2) return cleaned;
    }
  }

  return null;
}
