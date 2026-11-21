"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CompanyLicense } from "@/redux/types/license";
import { Maximize2, Minimize2, Layers, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeafletMapProps {
  licenses: CompanyLicense[];
  selectedLicenseId?: string;
  onSelectLicense?: (license: CompanyLicense) => void;
  height?: string;
  className?: string;
}

export default function LeafletMap({
  licenses,
  selectedLicenseId,
  onSelectLicense,
  height = "520px",
  className = "",
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLayerType, setActiveLayerType] = useState<"standard" | "satellite">("standard");

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      const L = (await import("leaflet")).default;

      // Fix default marker icons in webpack / Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Initialize map centered on Ethiopia
        const map = L.map(mapContainerRef.current, {
          center: [9.145, 40.489],
          zoom: 6,
          zoomControl: true,
        });

        // Add standard OSM tile layer
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
        tileLayer.addTo(map);

        const layerGroup = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
        layerGroupRef.current = layerGroup;
      }

      if (!isMounted || !mapInstanceRef.current || !layerGroupRef.current) return;

      const map = mapInstanceRef.current;
      const layerGroup = layerGroupRef.current;
      layerGroup.clearLayers();

      const bounds = L.latLngBounds([]);
      let hasValidCoords = false;

      licenses.forEach((lic) => {
        const isSelected = lic.license_id === selectedLicenseId;
        const isMining = (lic.licenseType?.name || "").toLowerCase().includes("mining");

        const color = isSelected
          ? "#2563EB" // bright blue when selected
          : isMining
          ? "#059669" // emerald for mining
          : "#D97706"; // amber for exploration

        // Render GeoJSON Polygon if available
        if (lic.boundary_geojson?.coordinates?.[0]?.length) {
          try {
            // Leaflet expects [lat, lon], GeoJSON provides [lon, lat]
            const latLngs = lic.boundary_geojson.coordinates[0].map((pt) => [pt[1], pt[0]]);
            const polygon = L.polygon(latLngs as any, {
              color,
              weight: isSelected ? 4 : 2,
              fillColor: color,
              fillOpacity: isSelected ? 0.45 : 0.25,
            });

            // Create rich popup
            const popupContent = document.createElement("div");
            popupContent.className = "p-1 font-sans text-xs space-y-1.5 min-w-[200px]";
            popupContent.innerHTML = `
              <div class="font-bold text-sm text-slate-800 border-b pb-1 flex items-center justify-between">
                <span>${lic.license_number}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded ${
                  isMining ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }">
                  ${lic.licenseType?.name || "License"}
                </span>
              </div>
              <div class="text-slate-600">
                <span class="font-semibold text-slate-700">Company:</span> ${lic.company?.name || "N/A"}
              </div>
              <div class="text-slate-600">
                <span class="font-semibold text-slate-700">Mineral:</span> ${lic.mineral_type || "N/A"}
              </div>
              <div class="text-slate-600">
                <span class="font-semibold text-slate-700">Location:</span> ${[lic.region, lic.zone, lic.woreda].filter(Boolean).join(", ") || "N/A"}
              </div>
              <div class="text-slate-600">
                <span class="font-semibold text-slate-700">Validity:</span> ${lic.effective_year_from || "—"} to ${lic.effective_year_to || "—"}
              </div>
              <div class="pt-2 border-t flex justify-end">
                <a href="/admin/licenses/${lic.license_id}" class="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800">
                  View Details &rarr;
                </a>
              </div>
            `;

            polygon.bindPopup(popupContent);

            polygon.on("click", () => {
              if (onSelectLicense) onSelectLicense(lic);
            });

            polygon.addTo(layerGroup);
            polygon.getLatLngs().forEach((ring: any) => {
              if (Array.isArray(ring)) {
                ring.forEach((latlng: any) => {
                  bounds.extend(latlng);
                  hasValidCoords = true;
                });
              }
            });
          } catch (e) {
            console.warn("Error rendering polygon for license:", lic.license_number, e);
          }
        } else if (lic.latitude && lic.longitude) {
          // Centroid pin marker fallback
          const lat = Number(lic.latitude);
          const lon = Number(lic.longitude);
          if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
            const marker = L.circleMarker([lat, lon], {
              radius: isSelected ? 8 : 6,
              fillColor: color,
              color: "#FFFFFF",
              weight: 2,
              opacity: 1,
              fillOpacity: 0.85,
            });

            marker.bindPopup(`
              <div class="p-1 text-xs">
                <div class="font-bold text-sm">${lic.license_number}</div>
                <div>${lic.company?.name || ""}</div>
                <div>${lic.mineral_type || ""}</div>
                <div class="mt-1"><a href="/admin/licenses/${lic.license_id}" class="text-blue-600 font-semibold">View Details</a></div>
              </div>
            `);

            marker.addTo(layerGroup);
            bounds.extend([lat, lon]);
            hasValidCoords = true;
          }
        }
      });

      // Fit bounds if we have valid coordinates
      if (hasValidCoords && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
      }
    }

    initMap();

    return () => {
      isMounted = false;
    };
  }, [licenses, selectedLicenseId]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);
  };

  const resetView = () => {
    if (mapInstanceRef.current && layerGroupRef.current) {
      const bounds = layerGroupRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
      } else {
        mapInstanceRef.current.setView([9.145, 40.489], 6);
      }
    }
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-900 ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none w-screen h-screen" : className
      }`}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Control Bar Overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs flex items-center space-x-1"
          onClick={resetView}
          title="Reset View to Bounds"
        >
          <Compass className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
          <span className="hidden sm:inline">Fit Bounds</span>
        </Button>

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

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm text-xs space-y-1.5">
        <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider mb-1">
          Map Legend ({licenses.length} licenses)
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600 inline-block" />
          <span className="text-slate-600 dark:text-slate-300">Mining Licenses</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600 inline-block" />
          <span className="text-slate-600 dark:text-slate-300">Exploration Licenses</span>
        </div>
        {selectedLicenseId && (
          <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-700 inline-block" />
            <span className="text-blue-600 dark:text-blue-400 font-medium">Selected License</span>
          </div>
        )}
      </div>
    </div>
  );
}
