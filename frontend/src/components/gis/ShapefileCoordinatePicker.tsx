"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Upload,
  MapPin,
  Trash2,
  Plus,
  RotateCcw,
  FileCode,
  Layers,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface CoordinateVertex {
  order: number;
  latitude: number;
  longitude: number;
}

interface ShapefileCoordinatePickerProps {
  initialGeoJSON?: any;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onChange: (geoJSON: any, centroidLat: number | null, centroidLon: number | null) => void;
}

export function ShapefileCoordinatePicker({
  initialGeoJSON,
  initialLatitude,
  initialLongitude,
  onChange,
}: ShapefileCoordinatePickerProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const parseGeoJSONVertices = (geoJSON: any): CoordinateVertex[] => {
    if (geoJSON?.coordinates?.[0]?.length) {
      const ring = geoJSON.coordinates[0];
      const pts = ring.slice(
        0,
        ring.length > 3 &&
          ring[0][0] === ring[ring.length - 1][0] &&
          ring[0][1] === ring[ring.length - 1][1]
          ? ring.length - 1
          : ring.length
      );
      return pts.map((p: [number, number], idx: number) => ({
        order: idx + 1,
        longitude: Number(p[0]),
        latitude: Number(p[1]),
      }));
    }
    return [];
  };

  const initialSerialized = initialGeoJSON ? JSON.stringify(initialGeoJSON) : null;
  const lastEmittedRef = useRef<string | null>(initialSerialized);
  const prevInitialGeoJSONRef = useRef<string | null>(initialSerialized);

  const [vertices, setVertices] = useState<CoordinateVertex[]>(() =>
    parseGeoJSONVertices(initialGeoJSON)
  );

  // Sync incoming initialGeoJSON safely if parent changes it
  useEffect(() => {
    const serialized = initialGeoJSON ? JSON.stringify(initialGeoJSON) : null;
    if (serialized !== prevInitialGeoJSONRef.current) {
      prevInitialGeoJSONRef.current = serialized;
      lastEmittedRef.current = serialized;
      setVertices(parseGeoJSONVertices(initialGeoJSON));
    }
  }, [initialGeoJSON]);

  const [activeTab, setActiveTab] = useState<"upload" | "manual">("upload");
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileSuccess, setFileSuccess] = useState<string | null>(null);

  // Synchronize outwards ONLY when vertices change and differ from last emitted
  useEffect(() => {
    if (vertices.length >= 3) {
      const ring: [number, number][] = vertices.map((v) => [v.longitude, v.latitude]);
      if (
        ring.length > 0 &&
        (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])
      ) {
        ring.push([...ring[0]]);
      }

      let sumLat = 0;
      let sumLon = 0;
      for (const v of vertices) {
        sumLat += v.latitude;
        sumLon += v.longitude;
      }
      const centroidLat = Number((sumLat / vertices.length).toFixed(7));
      const centroidLon = Number((sumLon / vertices.length).toFixed(7));

      const geoJSON = {
        type: "Polygon",
        coordinates: [ring],
      };

      const serialized = JSON.stringify(geoJSON);
      if (serialized !== lastEmittedRef.current) {
        lastEmittedRef.current = serialized;
        onChangeRef.current(geoJSON, centroidLat, centroidLon);
      }
    } else if (vertices.length === 0) {
      if (lastEmittedRef.current !== null) {
        lastEmittedRef.current = null;
        onChangeRef.current(null, null, null);
      }
    }
  }, [vertices]);

  // Handle file upload (GeoJSON, JSON, KML, CSV)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError(null);
    setFileSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("File is empty.");

        // Try GeoJSON / JSON
        if (file.name.endsWith(".json") || file.name.endsWith(".geojson") || text.trim().startsWith("{")) {
          const parsed = JSON.parse(text);
          let coords: any = null;

          if (parsed.type === "Polygon") {
            coords = parsed.coordinates?.[0];
          } else if (parsed.type === "Feature" && parsed.geometry?.type === "Polygon") {
            coords = parsed.geometry.coordinates?.[0];
          } else if (parsed.type === "FeatureCollection" && parsed.features?.[0]?.geometry?.type === "Polygon") {
            coords = parsed.features[0].geometry.coordinates?.[0];
          }

          if (Array.isArray(coords) && coords.length >= 3) {
            const newVertices: CoordinateVertex[] = coords
              .filter((pt: any) => Array.isArray(pt) && pt.length >= 2)
              .map((pt: [number, number], idx: number) => ({
                order: idx + 1,
                longitude: Number(pt[0]),
                latitude: Number(pt[1]),
              }));

            // remove trailing duplicate if closed
            if (
              newVertices.length > 3 &&
              newVertices[0].longitude === newVertices[newVertices.length - 1].longitude &&
              newVertices[0].latitude === newVertices[newVertices.length - 1].latitude
            ) {
              newVertices.pop();
            }

            setVertices(newVertices);
            setFileSuccess(`Loaded ${newVertices.length} boundary vertices from ${file.name}`);
            return;
          }
        }

        // Try CSV or plain text lines of Lat,Lon or Lon,Lat
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const parsedPoints: CoordinateVertex[] = [];

        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split(/[,\t\s]+/).filter(Boolean);
          if (parts.length >= 2) {
            const p1 = parseFloat(parts[0]);
            const p2 = parseFloat(parts[1]);
            if (!isNaN(p1) && !isNaN(p2)) {
              // Ethiopian coords: Lat is ~3 to 15, Lon is ~33 to 48
              const lat = p1 < 25 && p1 > 2 ? p1 : p2;
              const lon = p2 > 30 && p2 < 50 ? p2 : p1;
              parsedPoints.push({
                order: parsedPoints.length + 1,
                latitude: Number(lat.toFixed(7)),
                longitude: Number(lon.toFixed(7)),
              });
            }
          }
        }

        if (parsedPoints.length >= 3) {
          setVertices(parsedPoints);
          setFileSuccess(`Extracted ${parsedPoints.length} coordinate points from ${file.name}`);
        } else {
          throw new Error("Could not detect at least 3 valid polygon coordinates in file.");
        }
      } catch (err: any) {
        setFileError(err.message || "Failed to parse coordinate file.");
      }
    };

    reader.readAsText(file);
  };

  // Add empty vertex
  const handleAddVertex = () => {
    setVertices((prev) => [
      ...prev,
      {
        order: prev.length + 1,
        latitude: prev.length > 0 ? prev[prev.length - 1].latitude : 9.0,
        longitude: prev.length > 0 ? prev[prev.length - 1].longitude : 38.7,
      },
    ]);
  };

  const handleUpdateVertex = (index: number, field: "latitude" | "longitude", value: number) => {
    setVertices((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveVertex = (index: number) => {
    setVertices((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((v, idx) => ({ ...v, order: idx + 1 }))
    );
  };

  const handleClearAll = () => {
    setVertices([]);
    setFileSuccess(null);
    setFileError(null);
  };

  return (
    <div className="space-y-4 border rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            GIS Concession Boundary & Shape Data
          </Label>
          <p className="text-[11px] text-slate-500">
            Upload shapefile / GeoJSON or enter concession boundary vertices.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={activeTab === "upload" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("upload")}
            className="text-xs h-7 px-2.5"
          >
            <Upload className="w-3 h-3 mr-1" /> File Upload
          </Button>
          <Button
            type="button"
            variant={activeTab === "manual" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("manual")}
            className="text-xs h-7 px-2.5"
          >
            <MapPin className="w-3 h-3 mr-1" /> Vertices ({vertices.length})
          </Button>
        </div>
      </div>

      {activeTab === "upload" && (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-5 text-center bg-white dark:bg-slate-950 hover:bg-slate-50/50 transition-colors">
            <input
              type="file"
              id="shapefile-upload"
              accept=".geojson,.json,.kml,.csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <label
              htmlFor="shapefile-upload"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Click to upload boundary shape file
              </div>
              <p className="text-[10px] text-slate-400">
                Supports GeoJSON (.geojson, .json), KML coordinates, or CSV list of coordinates
              </p>
            </label>
          </div>

          {fileError && (
            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{fileError}</span>
            </div>
          )}

          {fileSuccess && (
            <div className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{fileSuccess}</span>
            </div>
          )}
        </div>
      )}

      {/* Coordinate vertices summary & list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span className="font-semibold flex items-center gap-1.5">
            Boundary Coordinates ({vertices.length} vertices)
            {vertices.length >= 3 ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                Valid Closed Polygon
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                Min 3 vertices required
              </Badge>
            )}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddVertex}
              className="h-7 text-xs px-2 text-emerald-600 hover:text-emerald-700"
            >
              <Plus className="w-3 h-3 mr-1" /> Add Point
            </Button>
            {vertices.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {vertices.length > 0 && (
          <div className="max-h-48 overflow-y-auto border rounded-lg bg-white dark:bg-slate-950">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b text-[10px] uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="py-1.5 px-3 w-12">#</th>
                  <th className="py-1.5 px-3">Latitude (Decimal)</th>
                  <th className="py-1.5 px-3">Longitude (Decimal)</th>
                  <th className="py-1.5 px-3 w-10 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {vertices.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-1 px-3 font-semibold text-slate-500">{v.order}</td>
                    <td className="py-1 px-3">
                      <Input
                        type="number"
                        step="0.0000001"
                        value={v.latitude}
                        onChange={(e) => handleUpdateVertex(idx, "latitude", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs font-mono"
                      />
                    </td>
                    <td className="py-1 px-3">
                      <Input
                        type="number"
                        step="0.0000001"
                        value={v.longitude}
                        onChange={(e) => handleUpdateVertex(idx, "longitude", parseFloat(e.target.value) || 0)}
                        className="h-7 text-xs font-mono"
                      />
                    </td>
                    <td className="py-1 px-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVertex(idx)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
