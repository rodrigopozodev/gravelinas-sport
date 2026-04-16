"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function TeamRefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function onRefresh() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/team/sync", { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        errorCode?: string;
      };
      if (!data.ok) {
        setFeedback({
          kind: "err",
          text:
            data.error ??
            (res.status === 401
              ? "La clave de la API de Riot ha caducado o no es válida."
              : "No se pudo actualizar."),
        });
        return;
      }
      setFeedback({ kind: "ok", text: "Rangos y victorias actualizados." });
      router.refresh();
    } catch {
      setFeedback({ kind: "err", text: "Error de red. Inténtalo de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium",
          "bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors",
          "hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
        )}
      >
        {loading ? "Actualizando…" : "Actualizar rangos (SoloQ)"}
      </button>
      {feedback && (
        <p
          role="status"
          className={cn(
            "text-sm",
            feedback.kind === "ok" ? "text-emerald-400/90" : "text-red-400/90"
          )}
        >
          {feedback.text}
        </p>
      )}
    </div>
  );
}
