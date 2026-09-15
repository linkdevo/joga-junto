import type { Court } from "@/types/court";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export async function getAvailableCourts(): Promise<Court[]> {
  const response = await fetch(`${API_URL}/player/courts`, {
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Não foi possível carregar as quadras.";

    try {
      const data = await response.json();
      if (data?.message) {
        message = data.message;
      }
    } catch {
      //
    }

    throw new Error(message);
  }

  return response.json();
}
