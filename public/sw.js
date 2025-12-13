// public/sw.js
// このファイルはバックグラウンドで動くService Workerの本体

// Service Workerがインストールされた時の処理
self.addEventListener("install", (event) => {
  console.log("Service Worker: インストールされました");
  // すぐに有効化する（開発時に便利）
  self.skipWaiting();
});

// Service Workerが有効化された時の処理
self.addEventListener("activate", (event) => {
  console.log("Service Worker: 有効化されました");
  // すべてのクライアント（開いているタブ）を即座に制御下に置く
  event.waitUntil(clients.claim());
});

// プッシュ通知を受信した時の処理
self.addEventListener("push", (event) => {
  console.log("プッシュ通知を受信しました");

  // 通知のデータを取得（サーバーから送られてくる）
  let notificationData = {
    title: "どんどん片付けたい！",
    body: "通知が届きました",
    icon: "/icon.png", // アイコン画像のパス
  };

  // サーバーからデータが送られてきた場合はそれを使う
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      console.error("通知データの解析に失敗しました", e);
    }
  }

  // 通知を表示する処理を待つ
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: "/badge.png", // 小さいバッジアイコン（オプション）
      vibrate: [200, 100, 200], // バイブレーションパターン（モバイル用）
      tag: "dondonkataduketai-notification", // 同じタグの通知は上書きされる
    }),
  );
});

// 通知をクリックした時の処理
self.addEventListener("notificationclick", (event) => {
  console.log("通知がクリックされました");

  // 通知を閉じる
  event.notification.close();

  // アプリを開く処理
  event.waitUntil(
    clients.openWindow("/"), // ルートページを開く
  );
});
