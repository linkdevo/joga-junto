import type { PlayerDashboard } from "@/types/player";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class PlayerApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);

    this.name = "PlayerApiError";
    this.status = status;
  }
}

export async function getPlayerDashboard(
  token: string,
): Promise<PlayerDashboard> {
  const response = await fetch(`${API_URL}/player/me/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Não foi possível carregar os dados do atleta.";

    try {
      const data = await response.json();

      if (data?.message) {
        message = data.message;
      }
    } catch {
      // Mantém a mensagem padrão.
    }

    throw new PlayerApiError(message, response.status);
  }

  return response.json();
}
