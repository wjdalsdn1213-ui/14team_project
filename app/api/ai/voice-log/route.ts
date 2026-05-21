import { NextRequest, NextResponse } from 'next/server';

interface ExerciseItem {
  id: string;
  name: string;
}

interface VoiceLogRequest {
  transcript: string;
  exercises: ExerciseItem[];
}

interface VoiceLogResult {
  exercise_name: string;
  sets: number;
  reps: number;
  pain_score: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function POST(req: NextRequest) {
  const body: VoiceLogRequest = await req.json();
  const { transcript, exercises } = body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const exerciseNames = exercises.map(e => e.name).join(', ');

  const prompt = `당신은 재활 운동 기록 분석 AI입니다.
환자의 음성 메시지에서 운동 기록 정보를 추출하세요.

음성 텍스트: "${transcript}"

처방받은 운동 목록: ${exerciseNames}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "exercise_name": "처방 운동 목록 중 가장 유사한 운동 이름",
  "sets": 세트 수(숫자),
  "reps": 횟수(숫자),
  "pain_score": 통증 점수 0-10(숫자),
  "difficulty": "easy" 또는 "medium" 또는 "hard"
}

규칙:
- exercise_name은 반드시 처방 운동 목록 중 하나여야 합니다
- 난이도: 쉬움/편함/별로안힘듦 → "easy", 보통/중간/적당 → "medium", 어려움/힘들었어/힘들었음 → "hard"
- 언급 없는 항목 기본값: sets=3, reps=10, pain_score=0, difficulty="medium"`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Gemini API error:', errData);
      return NextResponse.json({ error: 'AI 분석 중 오류가 발생했습니다.' }, { status: 502 });
    }

    const data = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const result: VoiceLogResult = JSON.parse(text);

    return NextResponse.json(result);
  } catch (e) {
    console.error('Voice log analysis error:', e);
    return NextResponse.json({ error: '음성 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
