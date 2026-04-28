import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L, { LatLngBoundsLiteral } from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ─────────────────────────────────────────────────────────────────
 * <RoutePreviewMap> — small Leaflet preview that renders a pickup →
 * dropoff line on top of OSM tiles. Used inline on BookingShortcut
 * once the customer has picked both addresses, so the route they're
 * about to be quoted on is visible before they hit the CTA.
 *
 * Lazy-imported by BookingShortcut so the ~150 KB Leaflet bundle
 * isn't loaded on the first paint of the homepage / country
 * shopfronts. The widget self-suppresses if either coordinate pair
 * is missing — calling code can render unconditionally and let the
 * component decide.
 * ───────────────────────────────────────────────────────────────── */

interface Coords { lat: number; lng: number }

interface Props {
  pickup:  Coords | null;
  dropoff: Coords | null;
  /** Tailwind height class — default h-44 (≈176 px). */
  height?: string;
}

const pickupIcon = L.divIcon({
  className: '',
  iconSize:  [22, 22],
  iconAnchor:[11, 11],
  html: `
    <div style="
      width: 22px; height: 22px; border-radius: 9999px;
      background: #d97706;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
});

const dropoffIcon = L.divIcon({
  className: '',
  iconSize:  [22, 22],
  iconAnchor:[11, 11],
  html: `
    <div style="
      width: 22px; height: 22px; border-radius: 9999px;
      background: #0f172a;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
});

export default function RoutePreviewMap({ pickup, dropoff, height = 'h-44' }: Props) {
  if (!pickup || !dropoff) return null;

  const center = useMemo<[number, number]>(
    () => [(pickup.lat + dropoff.lat) / 2, (pickup.lng + dropoff.lng) / 2],
    [pickup, dropoff],
  );

  /* Fit-to-bounds rather than a hard zoom, so a long-haul route and
   * a five-block move both look reasonable. */
  const bounds = useMemo<LatLngBoundsLiteral>(
    () => [
      [pickup.lat,  pickup.lng],
      [dropoff.lat, dropoff.lng],
    ],
    [pickup, dropoff],
  );

  return (
    <div className={`${height} rounded-xl overflow-hidden border border-slate-200 mt-4`}>
      <MapContainer
        center={center}
        bounds={bounds}
        boundsOptions={{ padding: [24, 24] }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[pickup.lat,  pickup.lng]}  icon={pickupIcon}  />
        <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} />
        <Polyline
          positions={[
            [pickup.lat,  pickup.lng],
            [dropoff.lat, dropoff.lng],
          ]}
          pathOptions={{ color: '#d97706', weight: 3, opacity: 0.75, dashArray: '6 6' }}
        />
      </MapContainer>
    </div>
  );
}
