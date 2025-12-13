
```
npx supabase link --project-ref <どぅんどぅん片付けたいのproject-id>

npx supabase gen types typescript --project-id "どぅんどぅん片付けたいのID" > app/types/database.types.ts
```

↑を実行するとsupabaseのテーブル定義からtsの型がapp/types/database.types.tsに出力されます
テーブルをいじった時は再生成をお願いします

## テーブル定義 (Database Schema)

### **`profiles`** (ユーザー情報)

ユーザー登録時に **Trigger** で自動生成
  * `id` (uuid, PK): `auth.users.id` と同期
  * `username` (text): 表示名
  * `avatar_url` (text):アイコン画像のパス
  * **権限:** 誰でも閲覧可(Select)、編集(Update)は本人のみ。

### **`todos`** (タスク)

  * `id` (uuid, PK): 自動生成
  * `user_id` (uuid, FK): 所有者。Insert時は `auth.uid()` を省略しても入る想定だが、明示推奨。
  * `title` (text): タスク名
  * `is_completed` (boolean): 完了フラグ (default: false)
  * `estimated_time` (int2): 所要時間（分単位の整数で保存）
  * `start_at` (timestamptz): 開始日時 (nullable)
  * `due_at` (timestamptz): 締切日時 (nullable)
  * **権限:** 本人のみ閲覧・操作可能 (CRUD)。

### **`friendships`** (フレンド管理)

  * `id` (uuid, PK): 自動生成
  * `user_id` (uuid, FK): 申請したユーザー
  * `friend_id` (uuid, FK): 申請されたユーザー
  * `status` (text): ステータス管理
      * `'pending'`: 申請中
      * `'accepted'`: 承認済み
  * **制約:** `(user_id, friend_id)` の組み合わせはユニーク(同じ人へのフレンド申請の連投を防ぐ)。
  * **権限:** 当事者（申請した側 or された側）のみ閲覧・操作可能。

-----

## 実装上の注意点 & ロジック

### **① 達成率の取得 (RPC)**

他人のタスク詳細はRLSで見れませんが、達成率だけを取得するDB関数を用意

```javascript
const { data, error } = await supabase
  .rpc('get_achievement_rate', { target_user_id: '相手のUUID' })

// data: 0〜100の整数 (int) が返ります
```

### **② フレンド一覧の取得クエリ**

「自分が申請した」かつ「自分が申請された」の両方を考慮する必要があり
以下のクエリで「承認済みのフレンド」を取得

```javascript
const { data } = await supabase
  .from('friendships')
  .select(`
    id,
    user:user_id (username, avatar_url),
    friend:friend_id (username, avatar_url)
  `)
  .or(`user_id.eq.${myId},friend_id.eq.${myId}`) // 自分がどちらかに含まれる
  .eq('status', 'accepted')
```

※ 表示時は `myId` と一致しない方のユーザー情報を表示

### **③ データの削除 (Cascade)**

`profiles` (ユーザー) が削除されると、紐付く `todos`, `friendships` は DB側で自動的に全削除されます。フロント側でのクリーニング処理は不要