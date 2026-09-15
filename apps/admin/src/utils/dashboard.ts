import type { AdminCourt } from "@/types/admin";

export type DashboardSummary = {
  totalCourts: number;
  activeCourts: number;
  inactiveCourts: number;
  totalDefaultTimes: number;
};

export function createDashboardSummary(courts: AdminCourt[]): DashboardSummary {
  const activeCourts = courts.filter((court) => court.isActive).length;

  const totalDefaultTimes = courts.reduce(
    (total, court) => total + court.times.length,
    0,
  );

  return {
    totalCourts: courts.length,
    activeCourts,
    inactiveCourts: courts.length - activeCourts,
    totalDefaultTimes,
  };
}
