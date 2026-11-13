/**
 * The only route outside the board: no tray, no sheet, just the form centred
 * on the paper. It is also the only route that renders without a session, by
 * design — every other one bounces through `lib/api.ts`'s 401 redirect.
 */
import { useEffect } from "react";
import { LoginIsland } from "../components/auth/LoginIsland";

export function LoginPage() {
  useEffect(() => {
    document.title = "Sign in — newspapper";
  }, []);

  return (
    <main className="flex min-h-dvh items-center justify-center p-card">
      <LoginIsland />
    </main>
  );
}
