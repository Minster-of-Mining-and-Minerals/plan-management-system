"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CompanyLicense } from "@/redux/types/license";
import { Maximize2, Minimize2, Compass, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LicenseBoundaryMapProps {
  license: CompanyLicense;
  height?: string;
  className?: string;
}

export default function LicenseBoundaryMap({
  license,
  height = "450px",
  className = "",
}: LicenseBoundaryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [9.145, 40.489],
          zoom: 7,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        const layerGroup = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
      }

      if (!isMounted || !mapInstanceRef.current || !layerGroupRef.current) return;

      const map = mapInstanceRef.current;
      const layerGroup = layerGroupRef.current;
      layerGroup.clearLayers();

      const isMining = (license.licenseType?.name || "").toLowerCase().includes("mining");
      const primaryColor = isMining ? "#059669" : "#D97706";

      const bounds = L.latLngBounds([]);
      let hasGeometry = false;

      // Draw Polygon
      if (license.boundary_geojson?.coordinates?.[0]?.length) {
        try {
          const rawRing = license.boundary_geojson.coordinates[0];
          const latLngs = rawRing.map((pt) => [pt[1], pt[0]]);

          const polygon = L.polygon(latLngs as any, {
            color: primaryColor,
            weight: 3,
            fillColor: primaryColor,
            fillOpacity: 0.35,
          });

          polygon.bindTooltip(
            `<strong>${license.license_number}</strong><br/>${license.mineral_type || "Mineral"}`
          );
          polygon.addTo(layerGroup);

          // Add subtle numbered markers for each boundary vertex
          rawRing.slice(0, -1).forEach((pt, idx) => {
            const vLat = pt[1];
            const vLon = pt[0];

            const vertexIcon = L.divIcon({
              className: "custom-vertex-icon",
              html: `<div style="background-color: ${primaryColor}; color: white; border: 2px solid white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.4);">${idx + 1}</div>`,
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            });

            const vertexMarker = L.marker([vLat, vLon], { icon: vertexIcon });
            vertexMarker.bindPopup(`
              <div class="text-xs p-1">
                <strong>Vertex #${idx + 1}</strong><br/>
                Lat: ${vLat.toFixed(6)}°<br/>
                Lon: ${vLon.toFixed(6)}°
              </div>
            `);
            vertexMarker.addTo(layerGroup);

            bounds.extend([vLat, vLon]);
            hasGeometry = true;
          });
        } catch (err) {
          console.warn("Error drawing license boundary:", err);
        }
      }

      // Draw Centroid Pin
      if (license.latitude && license.longitude) {
        const lat = Number(license.latitude);
        const lon = Number(license.longitude);
        if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
          const centroidIcon = L.divIcon({
            className: "custom-centroid-icon",
            html: `<div style="background-color: #2563EB; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.5);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const centroidMarker = L.marker([lat, lon], { icon: centroidIcon });
          centroidMarker.bindPopup(`
            <div class="text-xs p-1 font-sans">
              <strong class="text-blue-600">Polygon Centroid</strong><br/>
              ${license.license_number}<br/>
              Lat: ${lat.toFixed(6)}° | Lon: ${lon.toFixed(6)}°
            </div>
          `);
          centroidMarker.addTo(layerGroup);
          bounds.extend([lat, lon]);
          hasGeometry = true;
        }
      }

      if (hasGeometry && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [license]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
  };

  const vertexCount = license.boundary_geojson?.coordinates?.[0]?.length
    ? license.boundary_geojson.coordinates[0].length - 1
    : 0;

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen" : className
      }`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Control bar */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          ) : (
            <Maximize2 className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          )}
        </Button>
      </div>

      {/* Bottom Summary Bar */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {license.region || "Region"}, {license.woreda || "Woreda"}
          </span>
        </div>
        <div className="text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-3">
          Vertices: <span className="font-semibold text-slate-700 dark:text-slate-300">{vertexCount}</span>
        </div>
        <div className="text-slate-500 border-l border-slate-200 dark:border-slate-700 pl-3">
          Ref: <span className="font-medium text-slate-700 dark:text-slate-300">{license.spatial_reference || "GCS Adindan"}</span>
        </div>
      </div>
    </div>
  );
}
