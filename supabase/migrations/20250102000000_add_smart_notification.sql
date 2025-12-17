-- スマート通知の最終送信時刻カラムを追加
ALTER TABLE push_subscriptions
ADD COLUMN IF NOT EXISTS last_smart_notification TIMESTAMPTZ;

-- インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_smart_notification 
ON push_subscriptions(last_smart_notification);

-- コメント追加
COMMENT ON COLUMN push_subscriptions.last_smart_notification IS 'AIスマート通知の最終送信時刻';
