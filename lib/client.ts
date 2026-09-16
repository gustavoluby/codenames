"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_PATH, POLL_INTERVAL_MS, PRESENCE_EVERY_MS } from "./config";
import type { Action, RoomView } from "./types";

const IDENTITY_KEY = "lead-secreto:identity";

export interface Identity { id: string; name: string }

export function loadIdentity(): Identity {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Identity;
      if (parsed.id) return parsed;
    }
  } catch {}
  const fresh = { id: crypto.randomUUID(), name: "" };
  saveIdentity(fresh);
  return fresh;
}

export function saveIdentity(identity: Identity) {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {}
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? "Algo deu errado."), { status: res.status });
  return data;
}

export async function createRoomRequest(name: string, playerId: string): Promise<{ code: string }> {
  return readJson(await fetch(`${BASE_PATH}/api/rooms`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, playerId }) }));
}

/** Estado da sala via polling curto + função para enviar ações. */
export function useRoom(code: string, playerId: string | null) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [presence, setPresence] = useState<Record<string, number>>({});
  const [notFound, setNotFound] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const version = useRef(-1);
  const lastTouch = useRef(0);

  const applyRoom = useCallback((r: RoomView) => {
    if (r.version >= version.current) {
      version.current = r.version;
      setRoom(r);
    }
  }, []);

  useEffect(() => {
    if (!playerId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const touch = Date.now() - lastTouch.current > PRESENCE_EVERY_MS;
      try {
        const res = await fetch(
          `${BASE_PATH}/api/rooms/${code}?player=${playerId}&since=${version.current}${touch ? "&touch=1" : ""}`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (touch) lastTouch.current = Date.now();
        if (data.presence) setPresence(data.presence);
        if (data.changed && data.room) applyRoom(data.room);
      } catch {
        // rede instável: tenta de novo no próximo ciclo
      }
      if (!stopped) {
        const hidden = typeof document !== "undefined" && document.hidden;
        timer = setTimeout(tick, hidden ? POLL_INTERVAL_MS * 4 : POLL_INTERVAL_MS);
      }
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [code, playerId, applyRoom]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const act = useCallback(
    async (action: Action): Promise<boolean> => {
      if (!playerId) return false;
      try {
        const data = await readJson(
          await fetch(`${BASE_PATH}/api/rooms/${code}/action`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId, action }),
          }),
        );
        if (data.room) applyRoom(data.room);
        return true;
      } catch (err) {
        setToast(err instanceof Error ? err.message : "Algo deu errado.");
        return false;
      }
    },
    [code, playerId, applyRoom],
  );

  return { room, presence, notFound, toast, setToast, act };
}
