import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // セッションを取得（これによりCookieがリフレッシュされる）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ログインしていない場合、ログインページにリダイレクト
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

// 保護するパスを指定（ログインページとAPIルート、静的ファイルは除外）
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (認証ページ)
     * - /api (APIルート)
     * - /_next/static (静的ファイル)
     * - /_next/image (画像最適化)
     * - /favicon.ico, /sw.js, /manifest.json など（静的ファイル）
     */
    "/((?!login|api|_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.ico$).*)",
  ],
};
