import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8 p-8">
        <h1 className="text-5xl font-bold text-black dark:text-white">
          Welcome to DonDonKataduketai
        </h1>
        <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
          This is the home page. Navigate to different features using the links
          below.
        </p>
        <div className="flex gap-4">
          <Link
            href="/play"
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-green-500 px-8 text-white transition-colors hover:bg-green-600"
          >
            Go to Play (Playlist Generator)
          </Link>
        </div>
      </main>
    </div>
  );
}
