"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { Court } from "@/types/court";

import { BookingCalendar } from "../BookingCalendar/BookingCalendar";

type CourtBookingButtonProps = {
  court: Court;
  className?: string;
};

export function CourtBookingButton({
  court,
  className,
}: CourtBookingButtonProps) {
  const [open, setOpen] = useState(false);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Selecionar quadra
      </button>

      {mounted &&
        open &&
        createPortal(
          <BookingCalendar court={court} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}
