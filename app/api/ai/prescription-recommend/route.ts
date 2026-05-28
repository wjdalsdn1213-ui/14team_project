import { NextRequest, NextResponse } from 'next/server';

interface LogSummary {
  date: string;
  exerciseName: string;
  actualSets: number;
  actualReps: number;
  painScore: number;
  difficulty: string;
  memo?: string;
}

interface PrescriptionExercise {
  name: string;
  targetSets: number;
  targetReps: number;
}

export interface PrescriptionRecommendRequest {
  patientName: string;
  diagnosis: string;
  rehabStatus: string;
  stats: {
    completionRate: number;
    avgPainScore: number;
    streak: number;
    attentionLevel: string;
  };
  prescription: { exercises: PrescriptionExercise[] } | null;
  recentLogs: LogSummary[];
}

export interface ExerciseAdjustment {
  exercise_name: string;
  recommendation: string;
  reason: string;
}

export interface PrescriptionRecommendResult {
  status_summary: string;
  risk_signals: string[];
  prescription_direction: string;
  exercise_adjustments: ExerciseAdjustment[];
  overall_recommendation: string;
}

const REHAB_STATUS_LABELS: Record<string, string> = {
  acute: '급성기',
  subacute: '아급성기',
  chronic: '만성기',
  maintenance: '유지기',
};

const ATTENTION_LABELS: Record<string, string> = {
  critical: '즉시 확인 필요',
  warning: '관심 필요',
  normal: '양호',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY가 설정되지 않았습니다.' }, { status: 500 });
  }

  const body: PrescriptionRecommendRequest = await req.json();
  const { patientName, diagnosis, rehabStatus, stats, prescription, recentLogs } = body;

  const prescriptionText = prescription?.exercises.length
    ? prescription.exercises
        .map(e => `  - ${e.name}: ${e.targetSets}세트 × ${e.targetReps}회`)
        .join('\n')
    : '  처방 없음';

  const logsText = recentLogs.length
    ? recentLogs
        .map(
          l =>
            `  ${l.date}: ${l.exerciseName} ${l.actualSets}세트×${l.actualReps}회, 통증 ${l.painScore}/10, 난이도 ${DIFFICULTY_LABELS[l.difficulty] ?? l.difficulty}${l.memo ? `, 메모: "${l.memo}"` : ''}`,
        )
        .join('\n')
    : '  기록 없음';

  const prompt = `당신은 20년 경력의 물리치료사이자 재활 의학 전문가입니다.
아래 환자의 재활 데이터를 면밀히 분석하고, 처방 조정과 치료 방향에 대한 전문적인 권고를 제공하세요.
모든 판단은 근거 기반 재활 의학(evidence-based rehabilitation)의 원칙에 따라 내려주세요.

[환자 정보]
- 이름: ${patientName}
- 진단명: ${diagnosis}
- 재활 단계: ${REHAB_STATUS_LABELS[rehabStatus] ?? rehabStatus}

[최근 7일 통계]
- 운동 수행률: ${stats.completionRate}%
- 평균 통증 점수: ${stats.avgPainScore}/10
- 연속 운동일: ${stats.streak}일
- 주의 수준: ${ATTENTION_LABELS[stats.attentionLevel] ?? stats.attentionLevel}

[현재 처방 운동]
${prescriptionText}

[최근 운동 기록 (최신순)]
${logsText}

위 데이터를 분석하여 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "status_summary": "환자의 현재 재활 상태를 2~3문장으로 종합 요약. 수행률, 통증 추이, 재활 단계를 고려하세요.",
  "risk_signals": ["감지된 위험 신호 (예: 통증 상승, 수행률 급감, 운동 패턴 이상 등)"],
  "prescription_direction": "다음 처방에서의 전반적인 방향성. 부하 증가/유지/감소 여부, 우선 목표 등을 2~3문장으로 서술.",
  "exercise_adjustments": [
    {
      "exercise_name": "조정이 필요한 운동명",
      "recommendation": "구체적인 조정 내용 (세트/횟수/빈도 포함)",
      "reason": "조정 근거 및 이유"
    }
  ],
  "overall_recommendation": "치료사에게 드리는 종합 권고. 주의 사항, 다음 평가 시점, 환자 교육 필요 사항 등을 2~3문장으로."
}

주의: risk_signals가 없으면 빈 배열 [], exercise_adjustments도 필요 없으면 빈 배열 []로 반환하세요.`;

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
      },
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
    const result: PrescriptionRecommendResult = JSON.parse(text);

    return NextResponse.json(result);
  } catch (e) {
    console.error('Prescription recommend error:', e);
    return NextResponse.json({ error: '처방 추천 분석 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
