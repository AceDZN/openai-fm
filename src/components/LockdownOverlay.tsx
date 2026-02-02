"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

type Status = "loading" | "locked" | "unlocked";

interface FormValues {
  password: string;
}

export default function LockdownOverlay() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { register, handleSubmit } = useForm<FormValues>();

  const { ref: formRef, ...registerRest } = register("password", {
    required: true,
  });

  // Check auth status on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth");
        const data = await res.json();
        if (!cancelled) {
          setStatus(data.authenticated ? "unlocked" : "locked");
        }
      } catch {
        if (!cancelled) setStatus("locked");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-focus password input when locked
  useEffect(() => {
    if (status === "locked") {
      inputRef.current?.focus();
    }
  }, [status]);

  if (status === "loading" || status === "unlocked") return null;

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });

      const data = await res.json();

      if (res.ok && data.authenticated) {
        setStatus("unlocked");
        return;
      }

      if (res.status === 429) {
        const retryAfter = res.headers.get("Retry-After");
        const minutes = retryAfter
          ? Math.ceil(Number(retryAfter) / 60)
          : 15;
        setError(`Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
      } else {
        setError(data.error || "Incorrect password");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-foreground">
          This site is locked
        </h2>
        <p className="mb-4 text-sm text-black-50">
          Enter the password to continue.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            ref={(el) => {
              formRef(el);
              inputRef.current = el;
            }}
            {...registerRest}
            className="w-full rounded-lg border border-black-10 bg-screen px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
