import { type NextRequest, NextResponse } from "next/server";
import { getGeminiModel } from "../../lib/gemini";

interface Task {
  id: string;
  title: string;
  estimated_time: number;
  due_at: string | null;
  is_completed: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tasks } = body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "No tasks provided" }, { status: 400 });
    }

    // 未完了タスクのみをフィルタリング
    const incompleteTasks = tasks.filter(
      (task: Task) => !task.is_completed,
    ) as Task[];

    if (incompleteTasks.length === 0) {
      return NextResponse.json({
        suggestion: null,
        message: "すべてのタスクが完了しています！",
      });
    }

    // 現在の日時
    const now = new Date();
    const nowStr = now.toISOString();

    // タスク情報を整形
    const taskList = incompleteTasks
      .map((task, index) => {
        const dueInfo = task.due_at
          ? `期限: ${new Date(task.due_at).toLocaleString("ja-JP")}`
          : "期限: なし";
        return `${index + 1}. "${task.title}" (所要時間: ${task.estimated_time}分, ${dueInfo}, ID: ${task.id})`;
      })
      .join("\n");

    const prompt = `あなたはタスク管理のアシスタントです。以下の未完了タスクの中から、今すぐ取り組むべき最優先タスクを1つ選んで提案してください。

現在日時: ${now.toLocaleString("ja-JP")}

未完了タスク一覧:
${taskList}

優先度の判断基準:
1. **期限が近いタスク**: 期限が設定されていて、現在時刻に近いタスクは最優先
2. **所要時間が長いタスク**: 時間がかかるタスクは早めに取り組むべき
3. **期限なしのタスク**: 期限がないタスクより、期限があるタスクを優先

以下のJSON形式で返してください（他の文字は一切含めないでください）:
{
  "taskId": "推奨するタスクのID",
  "reason": "このタスクを推奨する理由を1〜2文で簡潔に説明"
}

回答:`;

    console.log("Suggesting task with Gemini...");

    const geminiModel = getGeminiModel();
    const result = await geminiModel.generateContent(prompt);
    const response = result.response;
    const generatedText = response.text().trim();

    console.log("Gemini suggestion response:", generatedText);

    // JSONを抽出
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AIからの応答が正しい形式ではありません");
    }

    const suggestion: { taskId: string; reason: string } = JSON.parse(
      jsonMatch[0],
    );

    // 提案されたタスクが実際に存在するか確認
    const suggestedTask = incompleteTasks.find(
      (task) => task.id === suggestion.taskId,
    );

    if (!suggestedTask) {
      throw new Error("提案されたタスクが見つかりません");
    }

    return NextResponse.json({
      suggestion: {
        taskId: suggestion.taskId,
        taskTitle: suggestedTask.title,
        estimatedTime: suggestedTask.estimated_time,
        dueAt: suggestedTask.due_at,
        reason: suggestion.reason,
      },
    });
  } catch (error: unknown) {
    console.error("Error suggesting task:", error);

    return NextResponse.json(
      {
        error: "Failed to suggest task",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
