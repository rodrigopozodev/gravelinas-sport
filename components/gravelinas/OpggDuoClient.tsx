"use client";

import { useCallback, useState } from "react";

import { OpggDuoView, type OpggLineupTab } from "@/components/gravelinas/OpggDuoView";
import type { OpggLineupRank } from "@/lib/gravelinas/opggLineupTypes";

type DuoRefreshResp =
  | { ok: true; p1: OpggLineupRank[]; p2: OpggLineupRank[]; fetchedAt: number }
  | { ok: false; error: string };

export function OpggDuoClient(props: { initialP1: OpggLineupRank[]; initialP2: OpggLineupRank[] }) {
  const { initialP1, initialP2 } = props;
  const [rows1, setRows1] = useState<OpggLineupRank[]>(initialP1);
  const [rows2, setRows2] = useState<OpggLineupRank[]>(initialP2);
  const [rankRefreshing, setRankRefreshing] = useState(false);
  const [champsRefreshing, setChampsRefreshing] = useState(false);
  const [scrapeRefreshing, setScrapeRefreshing] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [champsError, setChampsError] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [lineupTab, setLineupTab] = useState<OpggLineupTab>(1);

  const refreshRank = useCallback(async () => {
    setRankRefreshing(true);
    setRankError(null);
    try {
      const r = await fetch("/api/opgg/duo", { method: "POST", cache: "no-store" });
      const data = (await r.json()) as DuoRefreshResp;
      if (!data.ok) {
        setRankError(data.error);
        return;
      }
      setRows1(data.p1);
      setRows2(data.p2);
    } catch (e) {
      setRankError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setRankRefreshing(false);
    }
  }, []);

  const refreshChamps = useCallback(async () => {
    setChampsRefreshing(true);
    setChampsError(null);
    try {
      const r = await fetch("/api/opgg/champs", { method: "POST", cache: "no-store" });
      const data = (await r.json()) as DuoRefreshResp;
      if (!data.ok) {
        setChampsError(data.error);
        return;
      }
      setRows1(data.p1);
      setRows2(data.p2);
    } catch (e) {
      setChampsError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setChampsRefreshing(false);
    }
  }, []);

  const refreshScrape = useCallback(async () => {
    setScrapeRefreshing(true);
    setScrapeError(null);
    try {
      const r = await fetch("/api/opgg/scrape", { method: "POST", cache: "no-store" });
      const data = (await r.json()) as DuoRefreshResp;
      if (!data.ok) {
        setScrapeError(data.error);
        return;
      }
      setRows1(data.p1);
      setRows2(data.p2);
    } catch (e) {
      setScrapeError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setScrapeRefreshing(false);
    }
  }, []);

  return (
    <OpggDuoView
      lineupTab={lineupTab}
      onLineupTabChange={setLineupTab}
      p1={{
        rows: rows1,
        champsLoading: champsRefreshing,
        champsFetchError: champsError,
      }}
      p2={{
        rows: rows2,
        champsLoading: champsRefreshing,
        champsFetchError: champsError,
      }}
      rankRefreshing={rankRefreshing}
      onRefreshRank={refreshRank}
      rankError={rankError}
      champsRefreshing={champsRefreshing}
      onRefreshChamps={refreshChamps}
      scrapeRefreshing={scrapeRefreshing}
      onRefreshScrape={refreshScrape}
      scrapeError={scrapeError}
    />
  );
}
