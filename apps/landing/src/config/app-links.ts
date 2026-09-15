export const APP_LINKS = {
  player: process.env.NEXT_PUBLIC_PLAYER_APP_URL ?? "http://localhost:3001",

  admin: process.env.NEXT_PUBLIC_ADMIN_APP_URL ?? "http://localhost:3002",
} as const;
