import type { Banner, Flash } from "@/lib/events";

/** Faixa de anúncio no meio da tela + clarão da carta revelada. Puro enfeite: não recebe clique. */
export default function Announcer({ banner, flash }: { banner: Banner | null; flash: Flash | null }) {
  return (
    <div className="fx-layer" aria-hidden>
      {flash && <div key={flash.id} className={`fx-flash fx-${flash.color}`} />}
      {banner && (
        <div key={banner.id} className={`announce ann-${banner.kind} ${banner.team ? `team-${banner.team}` : ""}`}>
          <span className="announce-sub">{banner.sub}</span>
          <span className="announce-main">
            <strong className="announce-title">{banner.title}</strong>
            {banner.n && <span className="announce-n">{banner.n}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
