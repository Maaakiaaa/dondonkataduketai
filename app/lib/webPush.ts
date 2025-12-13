// lib/webPush.ts
import webpush from "web-push";

// VAPID鍵を設定（一度だけ実行）
webpush.setVapidDetails(
  "mailto:dondoko@gmail.com", // あなたのメールアドレス
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default webpush;
