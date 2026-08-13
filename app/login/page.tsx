import Image from "next/image";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-navy-700 to-navy-900 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/branding/logo-transparent.png" alt="Norwich Auto Repairs" width={220} height={220} priority />
        </div>
        <form action={login} className="card space-y-4 p-6">
          <h1 className="text-center text-lg font-bold">Sign in</h1>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {decodeURIComponent(error)}
            </p>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">Sign in</button>
        </form>
        <p className="mt-6 text-center text-xs text-silver">
          Norwich Auto Repairs · Thomas Town, Melbourne, Victoria
        </p>
      </div>
    </div>
  );
}
