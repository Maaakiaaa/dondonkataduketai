// app/api/ai/priority-task/route.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { tasks, userId } = await req.json();

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: "タスクがありません" },
        { status: 400 },
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEYが設定されていません" },
        { status: 500 },
      );
    }

    // Supabaseクライアント作成
    const supabase = await createClient();

    // 過去のAI推奨履歴を取得（最近30件）
    const { data: recentRecommendations } = await supabase
      .from("ai_recommendations")
      .select(
        "recommended_task_id, was_accepted, todos(title, task_type, tags)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    // タスク完了履歴を取得（最近50件）
    const { data: completionHistory } = await supabase
      .from("task_completion_history")
      .select("task_title, task_type, tags, completed_hour, was_overdue")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(50);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // タスク情報を整形
    const taskList = tasks
      .map(
        (
          task: {
            id: string;
            title: string;
            due_at: string | null;
            estimated_time: number;
            is_completed: boolean;
            task_type: string | null;
            tags: string[] | null;
          },
          index: number,
        ) =>
          `${index + 1}. ${task.title} (期限: ${task.due_at ? new Date(task.due_at).toLocaleString("ja-JP") : "なし"}, 所要時間: ${task.estimated_time}分, タイプ: ${task.task_type || "未設定"}, タグ: ${task.tags?.join(", ") || "なし"})`,
      )
      .join("\n");

    // ユーザーの行動パターン分析
    let userPatternText = "";

    if (completionHistory && completionHistory.length > 0) {
      // 完了時間帯の分析
      const hourCounts: { [key: number]: number } = {};
      completionHistory.forEach((h) => {
        hourCounts[h.completed_hour] = (hourCounts[h.completed_hour] || 0) + 1;
      });
      const preferredHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => `${hour}時台`);

      // タイプ別の完了率
      const typeStats: { [key: string]: number } = {};
      completionHistory.forEach((h) => {
        if (h.task_type) {
          typeStats[h.task_type] = (typeStats[h.task_type] || 0) + 1;
        }
      });

      // 期限切れ率
      const overdueCount = completionHistory.filter(
        (h) => h.was_overdue,
      ).length;
      const overdueRate = Math.round(
        (overdueCount / completionHistory.length) * 100,
      );

      userPatternText = `
【ユーザーの行動パターン】
- よく作業する時間帯: ${preferredHours.join(", ")}
- よく完了するタスクタイプ: ${Object.keys(typeStats).slice(0, 3).join(", ") || "データなし"}
- 期限切れ率: ${overdueRate}%
`;
    }

    // AI推奨の履歴分析
    let recommendationPatternText = "";
    if (recentRecommendations && recentRecommendations.length > 0) {
      const acceptedCount = recentRecommendations.filter(
        (r) => r.was_accepted === true,
      ).length;
      const rejectedCount = recentRecommendations.filter(
        (r) => r.was_accepted === false,
      ).length;
      const acceptanceRate =
        recentRecommendations.length > 0
          ? Math.round((acceptedCount / (acceptedCount + rejectedCount)) * 100)
          : 0;

      recommendationPatternText = `
【過去のAI推奨に対する反応】
- 推奨受け入れ率: ${acceptanceRate}%
- 受け入れたタスクの傾向: ${
        recentRecommendations
          .filter((r) => r.was_accepted)
          .slice(0, 3)
          .map((r) => (r.todos as any)?.title)
          .filter(Boolean)
          .join(", ") || "データ不足"
      }
`;
    }

    const prompt = `あなたは、ユーザーの行動パターンを学習し、最適なタスクを推奨するAIアシスタントです。

以下のタスクリストから、今最も優先して取り組むべきタスクを1つ選んでください。
選択理由は簡潔に1〜2文で説明してください。

タスクリスト:
${taskList}
${userPatternText}
${recommendationPatternText}

上記のユーザーの行動パターンを考慮し、現在の時刻（${new Date().getHours()}時）も踏まえて、最適なタスクを選択してください。

以下のJSON形式で回答してください:
{
  "taskIndex": 選択したタスクの番号(1から始まる),
  "reason": "選択理由"
}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AIの回答をパースできませんでした");
    }

    const aiResponse = JSON.parse(jsonMatch[0]);
    const selectedTask = tasks[aiResponse.taskIndex - 1];

    // AI推奨を記録
    await supabase.from("ai_recommendations").insert({
      user_id: userId,
      recommended_task_id: selectedTask.id,
      reason: aiResponse.reason,
      was_accepted: null, // 初期状態は未選択
    });

    return NextResponse.json({
      task: selectedTask,
      reason: aiResponse.reason,
    });
  } catch (error) {
    console.error("AI優先度判定エラー:", error);
    return NextResponse.json(
      { error: "AI判定に失敗しました" },
      { status: 500 },
    );
  }
}
