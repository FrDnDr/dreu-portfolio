import { useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render(container: HTMLElement, options: {
    sitekey: string;
    size: "flexible";
    theme: "light";
    callback(token: string): void;
    "expired-callback"(): void;
    "error-callback"(): void;
    "timeout-callback"(): void;
  }): string;
  remove(id: string): void;
};

declare global {
  interface Window { turnstile?: TurnstileApi }
}

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      window.clearTimeout(timeout);
      script.remove();
      scriptPromise = undefined;
      reject(new Error("Verification could not load."));
    };
    const timeout = window.setTimeout(fail, 20_000);
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      if (!window.turnstile) { fail(); return; }
      window.clearTimeout(timeout);
      resolve(window.turnstile);
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "verified" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let widget: string | undefined;
    let api: TurnstileApi | undefined;
    const invalidate = () => {
      if (cancelled) return;
      onToken("");
      setState("error");
    };
    onToken("");
    setState("loading");
    void loadTurnstile().then(loaded => {
      if (cancelled || !container.current) return;
      api = loaded;
      widget = api.render(container.current, {
        sitekey: "0x4AAAAAAFYpvnlRlLT6OQ1K",
        size: "flexible",
        theme: "light",
        callback: token => {
          if (cancelled) return;
          onToken(token);
          setState("verified");
        },
        "expired-callback": invalidate,
        "error-callback": invalidate,
        "timeout-callback": invalidate,
      });
    }).catch(invalidate);
    return () => {
      cancelled = true;
      if (widget !== undefined) api?.remove(widget);
    };
  }, [onToken, attempt]);

  return <div className="contact-verification">
    <div ref={container} />
    <p className="contact-form-hint" role="status">
      {state === "verified" ? "Verification complete." : state === "error" ? "Verification expired or unavailable. Please retry, or use the email link." : "Loading security verification…"}
    </p>
    {state === "error" && <button type="button" onClick={() => setAttempt(value => value + 1)}>RETRY VERIFICATION</button>}
  </div>;
}
