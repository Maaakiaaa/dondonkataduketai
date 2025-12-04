# dondonkataduketai

## 開発環境のセットアップ

### 1. 依存関係のインストール
\`\`\`bash
npm install
\`\`\`

### 2. VS Code拡張機能（推奨）
- **Biome** (`biomejs.biome`)
  - プロジェクトを開くと自動でインストールを提案されます
  - ファイル保存時に自動フォーマットされます

### 3. 開発サーバーの起動
\`\`\`bash
npm run dev
\`\`\`

## コード品質管理

- **保存時**: Biome拡張機能が自動フォーマット（拡張機能インストール時）
- **コミット時**: lefthookが自動でlint & フォーマット（必須）

### コマンド
\`\`\`bash
npm run lint          # チェックのみ
npm run lint:fix      # 自動修正
npm run format        # フォーマットのみ
\`\`\`