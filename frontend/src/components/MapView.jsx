import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.heat';
import api from '../api/client';
import MapResizeFix from './MapResizeFix';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function severityIcon(severity) {
  const colors = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
  return L.divIcon({
    html: `<div style="background:${colors[severity] || '#64748b'};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function MapLayers({ viewMode, filters, onIssueClick }) {
  const map = useMap();
  const clusterRef = useRef(null);
  const heatRef = useRef(null);

  useEffect(() => {
    if (viewMode === 'heatmap') {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
      api.get('/map/heatmap').then(({ data }) => {
        if (heatRef.current) map.removeLayer(heatRef.current);
        heatRef.current = L.heatLayer(data.points, {
          radius: 25,
          blur: 15,
          gradient: { 0.25: 'blue', 0.5: 'yellow', 0.75: 'orange', 1.0: 'red' },
        }).addTo(map);
      });
    } else {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      api.get(`/map/clusters?${params}`).then(({ data }) => {
        if (clusterRef.current) map.removeLayer(clusterRef.current);
        const cluster = L.markerClusterGroup();
        data.forEach((issue) => {
          if (filters.status && issue.status !== filters.status) return;
          const marker = L.marker([issue.lat, issue.lng], { icon: severityIcon(issue.severity) });
          marker.bindPopup(`
            <strong>${issue.title}</strong><br/>
            ${issue.category} · ${issue.severity}<br/>
            ${issue.count} people affected · ${issue.days_open}d open<br/>
            <a href="/issues/${issue.id}">View details</a>
          `);
          marker.on('click', () => onIssueClick?.(issue));
          cluster.addLayer(marker);
        });
        clusterRef.current = cluster;
        map.addLayer(cluster);
      });
    }
    return () => {
      if (clusterRef.current) map.removeLayer(clusterRef.current);
      if (heatRef.current) map.removeLayer(heatRef.current);
    };
  }, [viewMode, filters, map, onIssueClick]);

  return null;
}

export default function MapView({ viewMode = 'standard', filters = {}, onIssueClick, center = [19.076, 72.877], zoom = 12 }) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full absolute inset-0" scrollWheelZoom>
      <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapResizeFix />
      <MapLayers viewMode={viewMode} filters={filters} onIssueClick={onIssueClick} />
    </MapContainer>
  );
}
