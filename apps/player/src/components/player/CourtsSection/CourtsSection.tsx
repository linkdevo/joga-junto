"use client";

import { useMemo, useState } from "react";

import type { Court } from "@/types/court";
import { distanceInKm } from "@/utils/geo";

import { CourtCard } from "../CourtCard/CourtCard";
import { CourtFilters, type SortMode } from "../CourtFilters/CourtFilters";

import styles from "./CourtsSection.module.css";

type CourtsSectionProps = {
  courts: Court[];
  error?: string;
};

type UserLocation = {
  lat: number;
  lng: number;
};

function getCourtDistanceKm(court: Court, userLocation: UserLocation) {
  const { latitude, longitude } = court.complex.address;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    /*
     * Quadras de complexos ainda sem coordenadas vão para
     * o fim da lista, em vez de quebrar a ordenação.
     */
    return Number.POSITIVE_INFINITY;
  }

  return distanceInKm(userLocation.lat, userLocation.lng, latitude, longitude);
}

export function CourtsSection({ courts, error }: CourtsSectionProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const types = useMemo(() => {
    const uniqueTypes = new Set(
      courts.map((court) => court.type.trim()).filter(Boolean),
    );

    return [...uniqueTypes].sort((first, second) =>
      first.localeCompare(second, "pt-BR"),
    );
  }, [courts]);

  const hasActiveFilters = selectedType !== null || sortMode !== null;

  const filteredCourts = useMemo(() => {
    let result = courts;

    if (selectedType) {
      result = result.filter((court) => court.type === selectedType);
    }

    if (sortMode === "price") {
      result = [...result].sort(
        (first, second) => first.priceInCents - second.priceInCents,
      );
    } else if (sortMode === "distance" && userLocation) {
      result = [...result].sort(
        (first, second) =>
          getCourtDistanceKm(first, userLocation) -
          getCourtDistanceKm(second, userLocation),
      );
    }

    return result;
  }, [courts, selectedType, sortMode, userLocation]);

  function handleSelectType(type: string) {
    setSelectedType(type === "" ? null : type);
  }

  function handleSelectSort(mode: "distance" | "price") {
    if (mode === "price") {
      setSortMode((current) => (current === "price" ? null : "price"));
      return;
    }

    /*
     * Já temos a localização: só alterna a ordenação, sem
     * pedir permissão de novo.
     */
    if (userLocation) {
      setSortMode((current) => (current === "distance" ? null : "distance"));
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });

        setSortMode("distance");
        setIsLocating(false);
      },
      () => {
        setLocationError(
          "Não foi possível acessar sua localização. Verifique a permissão do navegador.",
        );
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }

  function resetFilters() {
    setSelectedType(null);
    setSortMode(null);
  }

  return (
    <section id="quadras" className={styles.section}>
      <div className="container">
        <div className={styles.heading}>
          <span>Encontre seu próximo jogo</span>

          <h1>Reserve uma quadra</h1>

          <p>
            Veja as quadras disponíveis nos complexos parceiros do Joga Junto.
          </p>
        </div>

        <div className={styles.layout}>
          <div>
            {error ? (
              <div className={styles.message}>
                <h2>Não foi possível carregar as quadras</h2>
                <p>{error}</p>
              </div>
            ) : courts.length === 0 ? (
              <div className={styles.message}>
                <h2>Nenhuma quadra disponível</h2>

                <p>
                  Ainda não existem quadras ativas vinculadas a complexos
                  ativos.
                </p>
              </div>
            ) : filteredCourts.length === 0 ? (
              <div className={styles.message}>
                <h2>Nenhuma quadra encontrada</h2>

                <p>
                  Não encontramos quadras com os filtros selecionados. Tente
                  limpar os filtros.
                </p>

                <button
                  type="button"
                  className={styles.clearFiltersButton}
                  onClick={resetFilters}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className={styles.grid}>
                {filteredCourts.map((court) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    distanceKm={
                      sortMode === "distance" && userLocation
                        ? getCourtDistanceKm(court, userLocation)
                        : null
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <CourtFilters
            types={types}
            selectedType={selectedType}
            sortMode={sortMode}
            isLocating={isLocating}
            locationError={locationError}
            hasActiveFilters={hasActiveFilters}
            resultCount={filteredCourts.length}
            onSelectType={handleSelectType}
            onSelectSort={handleSelectSort}
            onReset={resetFilters}
          />
        </div>
      </div>
    </section>
  );
}
