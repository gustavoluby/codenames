import Link from "next/link";
import { GAME_NAME } from "@/lib/config";

const [FIRST, ...REST] = GAME_NAME.split(" ");

/** Selo + nome do jogo. Primeira palavra em marfim, o resto em dourado. */
export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label={`${GAME_NAME}, voltar ao início`}>
      <svg className="brand-seal" viewBox="0 0 40 40" aria-hidden>
        <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="20" cy="20" r="13.5" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2.2" />
        <path fill="currentColor" d="M11 19.5h18l-2.2-6.4c-.3-.9-1.2-1.3-2-1L20 13.4l-4.8-1.3c-.8-.3-1.7.1-2 1ZM10.5 21h19v1.6h-19Z" />
        <rect x="13" y="24.5" width="5.6" height="3.2" rx="1.4" fill="currentColor" />
        <rect x="21.4" y="24.5" width="5.6" height="3.2" rx="1.4" fill="currentColor" />
      </svg>
      <span className="brand-word">
        {FIRST} {REST.length > 0 && <em>{REST.join(" ")}</em>}
      </span>
    </Link>
  );
}
