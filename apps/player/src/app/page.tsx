import { CourtsSection } from "@/components/player/CourtsSection/CourtsSection";
import { PlayerFeatures } from "@/components/player/PlayerFeatures/PlayerFeatures";
import { PlayerResume } from "@/components/player/PlayerResume/PlayerResume";

import { getAvailableCourts } from "@/services/courts.service";
import type { Court } from "@/types/court";

export default async function PlayerHome() {
  let courts: Court[] = [];
  let error = "";

  try {
    courts = await getAvailableCourts();
  } catch (err) {
    console.error("Erro ao carregar quadras do player:", err);

    error =
      err instanceof Error
        ? err.message
        : "Não foi possível carregar as quadras.";
  }

  return (
    <main className="player-page">
      <PlayerResume />

      <CourtsSection courts={courts} error={error} />

      <PlayerFeatures />
    </main>
  );
}
