"use client";

import { useParams } from "next/navigation";
import RoomScreen from "@/components/RoomScreen";
import { cleanRoomCode } from "@/lib/code";

export default function SalaPage() {
  const params = useParams<{ code: string }>();
  return <RoomScreen code={cleanRoomCode(params.code)} />;
}
