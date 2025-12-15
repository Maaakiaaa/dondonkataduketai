// app/testpage/page.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// SSRを無効にして動的インポート
const NotificationButton = dynamic(
  () => import("../components/NotificationButton"),
  { ssr: false, loading: () => <p>読み込み中...</p> },
);

export default function TestPage() {
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <NotificationButton />
    </Suspense>
  );
}
