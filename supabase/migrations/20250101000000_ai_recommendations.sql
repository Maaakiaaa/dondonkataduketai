-- AI推奨履歴テーブル
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommended_task_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  was_accepted BOOLEAN DEFAULT NULL, -- NULL=未選択, TRUE=選択した, FALSE=選択しなかった
  recommended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- タスク完了履歴テーブル（パフォーマンス分析用）
CREATE TABLE IF NOT EXISTS task_completion_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  task_type TEXT,
  tags TEXT[],
  estimated_time INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_hour INTEGER NOT NULL, -- 完了した時間帯（0-23）
  was_overdue BOOLEAN NOT NULL DEFAULT FALSE, -- 期限を過ぎていたか
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created_at ON ai_recommendations(created_at);
CREATE INDEX IF NOT EXISTS idx_task_completion_history_user_id ON task_completion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completion_history_completed_at ON task_completion_history(completed_at);

-- RLS (Row Level Security) 有効化
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completion_history ENABLE ROW LEVEL SECURITY;

-- RLS ポリシー: 自分のデータのみアクセス可能
CREATE POLICY "Users can view their own AI recommendations"
  ON ai_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI recommendations"
  ON ai_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI recommendations"
  ON ai_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own task completion history"
  ON task_completion_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task completion history"
  ON task_completion_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
