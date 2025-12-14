// app/api/ai/priority-task/route.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { tasks } = await req.json();

    if (!tasks || tasks.length === 0) {
      return NextResponse.json(
        { error: "タスクがありません" },
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

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // タスク情報を整形
    const taskList = tasks
      .map(
        (
          task: {
            title: string;
            due_at: string | null;
            estimated_time: number;
            is_completed: boolean;
          },
          index: number,
        ) =>
          `${index + 1}. ${task.title} (期限: ${task.due_at ? new Date(task.due_at).toLocaleDateString("ja-JP") : "なし"}, 所要時間: ${task.estimated_time}分, 完了: ${task.is_completed ? "済" : "未完了"})`,
      )
      .join("\n");

    const prompt = `以下のタスクリストから、今最も優先して取り組むべきタスクを1つ選んでください。
選択理由は簡潔に1〜2文で説明してください。

タスクリスト:
${taskList}

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
