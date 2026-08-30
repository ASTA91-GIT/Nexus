"use client";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapUpdater({ selectedLocation }: { selectedLocation: any }) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation && selectedLocation.hasCoords) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], 14, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedLocation, map]);

  return null;
}
