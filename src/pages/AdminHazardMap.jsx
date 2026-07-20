import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from "../createClient";

// ─── Fix Leaflet Default Icon ───────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Custom SVG Marker Factory ──────────────────────────────────────────────
const createColoredIcon = (color, pulse = false) => {
  const colorKey = color.replace('#', '');
  const pulseFilter = pulse
    ? `<filter id="pulse-${colorKey}"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${color}" flood-opacity="0.7"><animate attributeName="stdDeviation" values="2;8;2" dur="1.5s" repeatCount="indefinite"/></feDropShadow></filter>`
    : '';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
      <defs>${pulseFilter}</defs>
      <path d="M16 0C7.16 0 0 7.16 0 16C0 27.1 16 46 16 46S32 27.1 32 16C32 7.16 24.84 0 16 0Z" 
            fill="${color}" stroke="#fff" stroke-width="2" ${pulse ? `filter="url(#pulse-${colorKey})"` : ''}/>
      <circle cx="16" cy="16" r="7" fill="#fff" opacity="0.95"/>
      <path d="M12 16l3 3 5-6" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'bg-transparent !border-none',
    iconSize: [32, 46],
    iconAnchor: [16, 46],
    popupAnchor: [0, -50],
    tooltipAnchor: [0, -52],
  });
};

// ─── Color Maps ─────────────────────────────────────────────────────────────
const HAZARD_COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#eab308',
  low: '#22c55e',
};

const CATEGORY_ICONS = {
  physical: '🏗️',
  'chemical/biological': '☣️',
  electrical: '⚡',
  'procedural/safety practices': '📋',
  'natural disaster': '🌊',
};

const CATEGORIES = [
  { id: 'all', label: 'All Hazards' },
  { id: 'physical', label: 'Physical' },
  { id: 'chemical/biological', label: 'Chemical / Biological' },
  { id: 'electrical', label: 'Electrical' },
  { id: 'procedural/safety practices', label: 'Procedural / Safety' },
  { id: 'natural disaster', label: 'Natural Disaster' },
];

const RISK_LEVELS = [
  { id: 'all', label: 'All Levels' },
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

const STATUSES = [
  { id: 'all', label: 'All Statuses' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const getPhotoUrls = (photoPaths, bucket = 'hazard-photos') => {
  if (!photoPaths || !Array.isArray(photoPaths) || photoPaths.length === 0) return [];
  return photoPaths.map(path => {
    if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) return path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || path;
  });
};

const formatDate = (d) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

const timeAgo = (d) => {
  if (!d) return '';
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
};

// ════════════════════════════════════════════════════════════════════════════
//  LIGHTBOX COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const Lightbox = ({ images, currentIndex, onClose, onPrev, onNext }) => {
  if (!images || images.length === 0) return null;
  const img = images[currentIndex];
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative max-w-5xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-bold uppercase transition">Close [X]</button>
        {images.length > 1 && (
          <>
            <button onClick={onPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl transition">&lsaquo;</button>
            <button onClick={onNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl transition">&rsaquo;</button>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
        <img src={img} alt={`Hazard photo ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  DETAIL PANEL COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const DetailPanel = ({ report, onClose, onUpdateStatus, onToggleHeatmap, onDelete, heatmapVisible, photos, onOpenLightbox }) => {
  if (!report) return null;

  const displayStatus = report.status || report.report_status || 'pending';
  const isPending = displayStatus === 'pending';
  const riskColor = HAZARD_COLORS[report.risk_level?.toLowerCase()] || '#3b82f6';

  return (
    <div className="w-[420px] bg-slate-100 border-l border-slate-700 overflow-y-auto flex flex-col h-full">
      
      {/* ── Panel Header ── */}
      <div className="bg-slate-100 px-5 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition">
            <svg className="w-4 h-4 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-wide flex items-center gap-2">
              {CATEGORY_ICONS[report.hazard_category?.toLowerCase()] || '⚠️'}
              {report.hazard_category} Hazard
            </h2>
            <p className="text-[11px] text-slate-900">Report #{report.id?.toString().slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded"
            style={{ backgroundColor: riskColor + '70', color: riskColor  }}>
            {report.risk_level || 'N/A'}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${
            isPending ? 'bg-amber-500 text-amber-100 border-amber-500/70' :
            displayStatus === 'approved' ? 'bg-emerald-500 text-emerald-100 border-emerald-500/90' :
            'bg-red-500/70 text-red-200 border-red-500/90'
          }`}>{displayStatus}</span>
        </div>
      </div>

      {/* ── Photo Gallery ── */}
      {photos.length > 0 && (
        <div className="px-5 pt-4 pb-2 border-b border-slate-700">
          <p className="text-[9px] uppercase text-slate-900 font-bold mb-2.5 tracking-wider flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Photos ({photos.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {photos.map((url, i) => (
              <img key={i} src={url} alt={`Photo ${i + 1}`}
                onClick={() => onOpenLightbox(photos, i)}
                className="w-20 h-16 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-purple-500 transition flex-shrink-0" />
            ))}
          </div>
        </div>
      )}

      {/* ── Report Details ── */}
      <div className="px-5 py-4 space-y-4 flex-1  ">
        {/* Description */}
        <div>
          <p className="text-[10px] uppercase text-slate-900 font-bold tracking-wider mb-1">Description</p>
          <p className="text-xs text-slate-700 leading-relaxed">{report.hazard_description || 'No description provided.'}</p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] uppercase text-slate-900 font-bold tracking-wider mb-1">Reporter</p>
            <p className="text-[11px] text-slate-700">{report.reporter_name || 'Anonymous'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-900 font-bold tracking-wider mb-1">Contact</p>
            <p className="text-[11 px] text-slate-700">{report.reporter_contact || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-900 font-bold tracking-wider mb-1">Date Observed</p>
            <p className="text-[11px] text-slate-700">{report.date_observed || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-slate-900 font-bold tracking-wider mb-1">Time Observed</p>
            <p className="text-[11px] text-slate-700">{report.time_observed || 'N/A'}</p>
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-[10px] uppercase text-slate-900 font-bold tracking-wider mb-1">Location</p>
          <p className="text-[11px] text-slate-700">{report.address || 'No address'}</p>
          {report.landmark && (
            <p className="text-[10px] text-slate-600 mt-0.5">Near: {report.landmark}</p>
          )}
          <p className="text-[10px] text-slate-900 mt-0.5">
            {parseFloat(report.latitude)?.toFixed(5)}, {parseFloat(report.longitude)?.toFixed(5)}
          </p>
        </div>

        {/* Recommended Action */}
        {report.recommended_action && (
          <div>
            <p className="text-[10px] uppercase text-slate-900 font-bold tracking-wider mb-1">Recommended Action</p>
            <p className="text-[11px] text-slate-700 italic">{report.recommended_action}</p>
          </div>
        )}

        {/* Created */}
        <div className="pt-2 border-t border-slate-700">
          <p className="text-[9px] text-slate-700">Submitted {timeAgo(report.created_at) || formatDate(report.created_at)}</p>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="px-5 py-3 border-t border-slate-700 bg-slate-100 space-y-2">
        {/* Status actions */}
        <div className="flex gap-2">
          {isPending && (
            <>
              <button onClick={() => onUpdateStatus(report, 'approved')}
                className="flex-1 px-3 py-2 text-[10px] font-bold uppercase rounded-lg bg-emerald-600 border border-emerald-500/90 text-emerald-100 hover:bg-emerald-600/80 transition">Approve</button>
              <button onClick={() => onUpdateStatus(report, 'rejected')}
                className="flex-1 px-3 py-2 text-[10px] font-bold uppercase rounded-lg bg-red-600 border border-red-500/90 text-red-100 hover:bg-red-600/80 transition">Reject</button>
            </>
          )}
          {!isPending && (
            <button onClick={() => onUpdateStatus(report, 'pending')}
              className="flex-1 px-3 py-2 text-[11px] font-bold uppercase rounded-lg bg-amber-600 border border-amber-500/50 text-amber-100 hover:bg-amber-600/80 transition">Reset to Pending</button>
          )}
        </div>

        {/* Toggle heatmap + Delete */}
        <div className="flex gap-2">
          <button onClick={() => onToggleHeatmap(report)}
            className={`flex-1 px-3 py-2 text-[11px] font-bold uppercase rounded-lg border transition ${
              heatmapVisible
                ? 'bg-violet-600 border-violet-500/50 text-violet-100 hover:bg-violet-600/30'
                : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-600'
            }`}>
            {heatmapVisible ? 'Hide from Heatmap' : 'Show on Heatmap'}
          </button>
          <button onClick={() => onDelete(report)}
            className="px-3 py-2 text-[11px] font-bold uppercase rounded-lg bg-red-600 border border-red-500/70 text-red-100 hover:bg-red-600/90 transition">Delete</button>
        </div>
      </div>
    </div>
  );
};
 // ── Boundary Data ──
  const naicBoundaryRaw = [
    [120.676693, 14.346669], [120.683441, 14.335786], [120.723202, 14.313171],
    [120.726786, 14.310712], [120.733770, 14.306325], [120.736533, 14.303019],
    [120.737455, 14.302343], [120.745282, 14.294946], [120.745602, 14.294668],
    [120.745803, 14.294520], [120.746162, 14.294151], [120.746301, 14.294031],
    [120.74645, 14.293735], [120.747109, 14.293254], [120.747533, 14.292911],
    [120.747852, 14.292674], [120.748284, 14.292371], [120.748703, 14.292116],
    [120.749145, 14.291734], [120.749515, 14.291505], [120.749520, 14.291427],
    [120.749729, 14.291396], [120.750271, 14.291021], [120.750813, 14.290548],
    [120.751204, 14.290262], [120.756628, 14.286374], [120.758951, 14.283754],
    [120.760941, 14.282012], [120.761349, 14.281711], [120.763151, 14.280016],
    [120.763296, 14.279912], [120.763398, 14.279792], [120.763548, 14.279813],
    [120.763682, 14.279725], [120.763763, 14.279626], [120.764036, 14.279434],
    [120.764192, 14.279293], [120.764390, 14.278862], [120.765098, 14.278269],
    [120.765227, 14.278087], [120.765517, 14.277874], [120.766091, 14.277261],
    [120.766504, 14.276970], [120.769116, 14.274531], [120.769320, 14.274391],
    [120.769433, 14.274235], [120.769449, 14.274043], [120.769395, 14.273622],
    [120.769313, 14.273443], [120.769302, 14.273188], [120.769733, 14.273133],
    [120.770565, 14.272956], [120.770860, 14.272920], [120.771487, 14.273045],
    [120.771745, 14.273070], [120.772024, 14.273034], [120.772340, 14.272889],
    [120.772689, 14.272785], [120.773274, 14.272452], [120.773574, 14.272161],
    [120.773681, 14.272114], [120.773944, 14.272187], [120.774239, 14.272389],
    [120.774320, 14.272660], [120.774271, 14.273705], [120.774411, 14.274277],
    [120.774658, 14.274453], [120.775044, 14.274490], [120.775377, 14.274448],
    [120.775736, 14.274329], [120.776047, 14.274079], [120.776369, 14.274043],
    [120.776605, 14.274058], [120.777463, 14.274308],
    [120.777748, 14.274251], [120.777930, 14.274074], [120.778064, 14.273767],
    [120.778064, 14.273414], [120.778193, 14.273148], [120.778230, 14.272915],
    [120.778466, 14.272618], [120.778670, 14.272582], [120.778767, 14.272670],
    [120.778831, 14.272930], [120.778976, 14.273065], [120.779276, 14.273159],
    [120.779684, 14.273112], [120.780247, 14.273096], [120.780355, 14.273003],
    [120.780489, 14.272748], [120.780628, 14.272462], [120.781251, 14.271958],
    [120.781723, 14.271755], [120.782066, 14.271688], [120.782570, 14.271823],
    [120.782849, 14.271708], [120.783064, 14.271537], [120.783262, 14.271495],
    [120.783573, 14.271485], [120.783927, 14.271209], [120.784228, 14.270918],
    [120.784748, 14.270674], [120.785456, 14.270258], [120.786057, 14.270086],
    [120.786465, 14.270081], [120.786722, 14.270040], [120.787017, 14.269910],
    [120.787135, 14.269754], [120.788637, 14.269083], [120.788788, 14.269088],
    [120.788879, 14.269192], [120.788949, 14.269400], [120.789056, 14.269390],
    [120.789142, 14.269333], [120.789673, 14.268724], [120.789877, 14.268298],
    [120.789909, 14.267788], [120.789807, 14.267575], [120.789812, 14.267373],
    [120.789973, 14.267029], [120.790424, 14.266847], [120.790885, 14.266842],
    [120.792081, 14.266265], [120.792666, 14.265771], [120.792816, 14.265527],
    [120.792806, 14.264981], [120.792859, 14.264752], [120.793020, 14.264529],
    [120.793294, 14.264061], [120.793626, 14.263837], [120.794694, 14.263452],
    [120.795080, 14.263177], [120.795300, 14.262896], [120.795332, 14.262397],
    [120.795386, 14.262220], [120.795606, 14.261747], [120.795600, 14.260380],
    [120.795681, 14.260219], [120.795944, 14.260099], [120.796400, 14.259985],
    [120.797001, 14.259725], [120.797279, 14.259553], [120.797414, 14.259350],
    [120.797296, 14.258950], [120.797124, 14.258674], [120.796668, 14.258508],
    [120.796405, 14.258331], [120.796303, 14.258056], [120.796228, 14.257276],
    [120.796292, 14.256527], [120.796518, 14.255519], [120.796571, 14.255040],
    [120.796550, 14.254619], [120.796486, 14.254323], [120.796545, 14.253954],
    [120.796689, 14.253621], [120.797011, 14.253356], [120.797306, 14.253226],
    [120.797821, 14.253143], [120.798234, 14.252961], [120.798637, 14.252862],
    [120.798760, 14.252685], [120.798916, 14.251583], [120.799066, 14.251198],
    [120.799291, 14.251021], [120.800493, 14.250564], [120.800793, 14.250584],
    [120.801115, 14.250720], [120.801437, 14.251136], [120.802016, 14.251780],
    [120.802435, 14.251936], [120.802789, 14.251884], [120.803250, 14.251645],
    [120.803593, 14.251125], [120.80315, 14.250772], [120.804151, 14.250345],
    [120.804666, 14.249836], [120.805385, 14.249295], [120.805771, 14.249160],
    [120.806040, 14.249181], [120.806351, 14.249295], [120.806565, 14.249097],
    [120.806544, 14.248671], [120.806726, 14.247824], [120.807118, 14.247345],
    [120.807885, 14.246986], [120.808164, 14.246633], [120.808239, 14.246238],
    [120.808389, 14.245884], [120.808336, 14.245343], [120.808690, 14.244761],
    [120.809307, 14.244054], [120.809934, 14.243217], [120.810530, 14.241543],
    [120.810653, 14.240815], [120.811356, 14.240118], [120.811999, 14.239728],
    [120.812327, 14.239832], [120.812654, 14.240066], [120.813029, 14.240128],
    [120.813421, 14.239946], [120.813657, 14.239504], [120.813501, 14.238194],
    [120.814156, 14.236790], [120.814725, 14.236317], [120.815331, 14.236041],
    [120.815776, 14.235225], [120.816275, 14.234539], [120.816801, 14.233702],
    [120.816908, 14.233572], [120.817798, 14.233993], [120.818222, 14.234144],
    [120.818480, 14.234388], [120.818571, 14.234346], [120.818780, 14.234341],
    [120.819021, 14.234424], [120.819386, 14.234617], [120.819869, 14.235152],
    [120.820320, 14.235584], [120.820513, 14.235490], [120.821076, 14.236041],
    [120.821387, 14.236275], [120.822541, 14.236951], [120.822959, 14.237243],
    [120.823404, 14.237627], [120.823619, 14.237846], [120.824692, 14.239068],
    [120.824794, 14.238964], [120.825271, 14.239291], [120.825556, 14.239640],
    [120.826591, 14.240180], [120.826870, 14.240440], [120.827385, 14.240789],
    [120.827873, 14.240279], [120.829074, 14.239333], [120.829439, 14.239593],
    [120.829782, 14.239146], [120.830748, 14.238178], [120.831499, 14.237076],
    [120.831864, 14.237440], [120.832679, 14.237950], [120.834235, 14.235974],
    [120.835319, 14.236431], [120.836209, 14.237045], [120.836563, 14.237752],
    [120.836853, 14.237752], [120.837185, 14.237544], [120.837604, 14.237461],
    [120.838376, 14.238012], [120.839331, 14.238771], [120.839589, 14.238917],
    [120.840511, 14.239302], [120.841305, 14.239707], [120.841606, 14.239811],
    [120.842217, 14.240123], [120.842915, 14.240373], [120.843548, 14.240633],
    [120.844245, 14.240809], [120.844513, 14.240913], [120.845232, 14.241101],
    [120.847882, 14.241953], [120.848848, 14.241995], [120.849631, 14.242889],
    [120.849717, 14.242661], [120.851036, 14.243056], [120.851562, 14.243128],
    [120.853697, 14.243711], [120.854427, 14.243773], [120.854641, 14.243836],
    [120.854888, 14.243856], [120.855103, 14.243908], [120.855328, 14.244106],
    [120.855532, 14.244200], [120.856025, 14.244324], [120.856476, 14.244501],
    [120.856948, 14.244730], [120.857227, 14.244803], [120.858278, 14.245208],
    [120.858783, 14.245395], [120.859179, 14.245603], [120.859373, 14.245603],
    [120.859469, 14.245624], [120.859609, 14.245811], [120.859759, 14.245624],
    [120.860317, 14.245988], [120.861218, 14.246435], [120.861105, 14.246591],
    [120.861019, 14.246685], [120.860950, 14.246836], [120.860955, 14.247064],
    [120.860998, 14.247283], [120.861014, 14.247579], [120.861073, 14.247818],
    [120.861025, 14.247933], [120.860596, 14.248422], [120.860108, 14.248676],
    [120.859979, 14.249004], [120.860011, 14.249186], [120.859947, 14.249383],
    [120.859426, 14.249643], [120.858777, 14.249758], [120.858493, 14.250007],
    [120.858343, 14.249992], [120.858209, 14.250018], [120.858166, 14.250132],
    [120.858064, 14.250184], [120.857940, 14.250174], [120.857774, 14.250220],
    [120.857624, 14.250340], [120.857082, 14.250714], [120.857028, 14.250933],
    [120.857077, 14.251172], [120.857098, 14.251286], [120.857184, 14.251349],
    [120.857157, 14.251666], [120.857168, 14.251796], [120.857087, 14.251931],
    [120.857012, 14.252009], [120.856894, 14.252087], [120.856782, 14.252113],
    [120.856159, 14.252056], [120.855612, 14.252264], [120.855446, 14.252363],
    [120.855328, 14.252524], [120.855280, 14.252747], [120.855119, 14.253075],
    [120.854802, 14.253205], [120.854539, 14.253189], [120.854411, 14.253241],
    [120.854250, 14.253371], [120.854335, 14.253636], [120.854459, 14.253746],
    [120.854480, 14.254016], [120.854464, 14.254546], [120.854405, 14.254681],
    [120.854276, 14.254728], [120.854196, 14.254723], [120.854056, 14.254645],
    [120.853509, 14.254619], [120.853322, 14.254562], [120.852887, 14.254552],
    [120.852656, 14.254484], [120.852415, 14.254562], [120.852120, 14.254697],
    [120.852034, 14.254869], [120.852141, 14.256023], [120.851959, 14.256886],
    [120.851508, 14.257136], [120.851229, 14.257479], [120.850822, 14.257676],
    [120.850425, 14.257520], [120.850317, 14.257385], [120.849835, 14.257489],
    [120.849663, 14.257780], [120.849459, 14.257895], [120.849320, 14.258103],
    [120.849328, 14.258425], [120.849481, 14.258955], [120.849416, 14.259413],
    [120.849234, 14.259610], [120.849094, 14.260026], [120.848848, 14.260109],
    [120.848558, 14.260151], [120.848322, 14.260172], [120.847625, 14.260151],
    [120.847517, 14.260057], [120.847313, 14.260130], [120.847356, 14.260359],
    [120.847228, 14.261305], [120.847324, 14.262990], [120.847204, 14.263278],
    [120.845954, 14.263309], [120.845227, 14.263806], [120.843419, 14.264399],
    [120.843118, 14.264549], [120.842153, 14.264747], [120.841772, 14.265215],
    [120.840431, 14.265797], [120.839111, 14.266754], [120.838553, 14.266946],
    [120.837990, 14.267502], [120.837395, 14.267700], [120.836445, 14.268469],
    [120.835635, 14.269650], [120.835351, 14.270362], [120.835129, 14.270509],
    [120.834857, 14.270622], [120.834310, 14.271402], [120.834020, 14.271573],
    [120.832829, 14.272135], [120.831757, 14.272863], [120.830977, 14.273624],
    [120.830464, 14.274750], [120.830324, 14.274895], [120.828388, 14.275530],
    [120.827851, 14.275997], [120.826564, 14.276678], [120.825920, 14.276720],
    [120.825355, 14.276904], [120.825027, 14.277107], [120.824477, 14.278675],
    [120.824520, 14.279278], [120.824584, 14.279522], [120.824193, 14.279990],
    [120.823662, 14.280026], [120.823190, 14.280328], [120.822980, 14.280843],
    [120.822948, 14.282111], [120.822423, 14.282324], [120.822074, 14.282844],
    [120.821768, 14.283390], [120.821301, 14.283795], [120.820679, 14.283910],
    [120.819810, 14.284513], [120.819317, 14.284664], [120.819150, 14.285209],
    [120.818506, 14.285901], [120.818329, 14.286062], [120.818024, 14.286566],
    [120.817389, 14.286896], [120.816975, 14.286984], [120.81643, 14.287161],
    [120.816548, 14.287429], [120.816854, 14.287965], [120.817292, 14.288653],
    [120.817260, 14.288892], [120.817013, 14.289105], [120.816766, 14.289230],
    [120.816366, 14.289358], [120.816329, 14.289519], [120.814059, 14.329502],
    [120.813791, 14.329590], [120.813625, 14.329601], [120.813507, 14.329575],
    [120.813389, 14.329559], [120.813190, 14.329543], [120.812960, 14.329627],
    [120.812697, 14.330697], [120.812767, 14.330973], [120.812895, 14.331196],
    [120.812981, 14.331451], [120.812976, 14.332407], [120.812622, 14.333041],
    [120.812461, 14.333546], [120.812176, 14.333847], [120.811978, 14.334221],
    [120.811710, 14.334419], [120.811479, 14.334393], [120.811018, 14.334689],
    [120.810626, 14.334881], [120.810288, 14.335141], [120.810020, 14.335396],
    [120.809897, 14.335599], [120.809859, 14.335812], [120.809736, 14.335952],
    [120.808641, 14.336243], [120.808142, 14.336285], [120.807869, 14.336357],
    [120.807606, 14.336633], [120.807488, 14.336893], [120.807343, 14.337085],
    [120.807053, 14.337251], [120.806614, 14.337215], [120.806496, 14.337251],
    [120.806308, 14.337454], [120.806131, 14.337818], [120.805643, 14.338493],
    [120.805369, 14.339190], [120.804500, 14.339767], [120.803095, 14.340884],
    [120.802842, 14.341144], [120.802687, 14.341456], [120.802698, 14.341804],
    [120.802853, 14.342012], [120.802799, 14.342142], [120.801710, 14.342953],
    [120.801061, 14.343270], [120.799280, 14.343618], [120.798736, 14.343921],
    [120.797247, 14.345437], [120.796410, 14.346357], [120.796142, 14.346419],
    [120.795552, 14.346170], [120.794391, 14.345532], [120.793377, 14.345200],
    [120.792655, 14.345151], [120.790778, 14.345640], [120.790064, 14.345842],
    [120.788729, 14.346414], [120.788329, 14.346525], [120.787951, 14.346398],
    [120.787827, 14.346201], [120.787854, 14.345842], [120.788181, 14.344798],
    [120.788080, 14.344621], [120.787817, 14.344626], [120.787039, 14.345084],
    [120.785730, 14.345707], [120.784617, 14.345730], [120.782468, 14.346045],
    [120.782134, 14.346156], [120.781753, 14.346354], [120.781417, 14.346684],
    [120.781304, 14.346866], [120.781143, 14.347396], [120.781047, 14.347952],
    [120.780961, 14.348087], [120.744502, 14.377321], [120.708761, 14.406043],
    [120.708354, 14.403861], [120.687116, 14.363579], [120.686765, 14.362958],
  ];
// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const AdminHazardMap = () => {
  // ── State ──
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [isRealistic, setIsRealistic] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [heatmapToggles, setHeatmapToggles] = useState({});
  const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'info' });
  const [confirmAction, setConfirmAction] = useState(null);
  const [lightbox, setLightbox] = useState({ open: false, images: [], index: 0 });

  // ── Derived data ──
  const flippedBoundary = useMemo(() => naicBoundaryRaw.map(c => [c[1], c[0]]), []);
  const bounds = useMemo(() => L.latLngBounds(flippedBoundary), [flippedBoundary]);
  const worldBounds = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
  const maskCoords = [worldBounds, flippedBoundary];

  // ── Snackbar helper ──
  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ show: true, message, type });
    setTimeout(() => setSnackbar({ show: false, message: '', type: 'info' }), 4000);
  }, []);

  // ── Fetch reports ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hazard_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setReports(data || []);
      // Init heatmap toggles
      const toggles = {};
      (data || []).forEach(r => {
        toggles[r.id] = r.show_on_heatmap !== false;
      });
      setHeatmapToggles(toggles);
    } catch (err) {
      console.error('Fetch error:', err);
      showSnackbar('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Stats ──
  const stats = useMemo(() => {
    const s = { total: reports.length, pending: 0, approved: 0, rejected: 0, critical: 0, high: 0 };
    reports.forEach(r => {
      const st = r.status || r.report_status || 'pending';
      if (st === 'pending') s.pending++;
      else if (st === 'approved') s.approved++;
      else if (st === 'rejected') s.rejected++;
      if (r.risk_level?.toLowerCase() === 'critical') s.critical++;
      if (r.risk_level?.toLowerCase() === 'high') s.high++;
    });
    return s;
  }, [reports]);

  // ── Filtered reports ──
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const st = r.status || r.report_status || 'pending';
      if (showPendingOnly && st !== 'pending') return false;
      if (selectedCategory !== 'all' && r.hazard_category?.toLowerCase() !== selectedCategory) return false;
      if (selectedRisk !== 'all' && r.risk_level?.toLowerCase() !== selectedRisk) return false;
      if (selectedStatus !== 'all' && st !== selectedStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const desc = (r.hazard_description || '').toLowerCase();
        const addr = (r.address || '').toLowerCase();
        const name = (r.reporter_name || '').toLowerCase();
        if (!desc.includes(q) && !addr.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [reports, showPendingOnly, selectedCategory, selectedRisk, selectedStatus, searchQuery]);

  // ── Update status ──
  const updateStatus = useCallback(async (report, newStatus) => {
    try {
      const { error } = await supabase
        .from('hazard_reports')
        .update({ status: newStatus })
        .eq('id', report.id);
      if (error) throw error;
      showSnackbar(`Report ${newStatus}`, 'success');
      fetchReports();
    } catch (err) {
      showSnackbar('Failed to update status', 'error');
    }
  }, [fetchReports, showSnackbar]);

  // ── Toggle heatmap ──
  const toggleHeatmap = useCallback(async (report) => {
    const newVal = !(heatmapToggles[report.id] ?? true);
    try {
      const { error } = await supabase
        .from('hazard_reports')
        .update({ show_on_heatmap: newVal })
        .eq('id', report.id);
      if (error) throw error;
      setHeatmapToggles(prev => ({ ...prev, [report.id]: newVal }));
      showSnackbar(newVal ? 'Visible on heatmap' : 'Hidden from heatmap', 'success');
    } catch (err) {
      showSnackbar('Failed to toggle heatmap visibility', 'error');
    }
  }, [heatmapToggles, showSnackbar]);

  // ── Delete report ──
  const deleteReport = useCallback(async (report) => {
    try {
      // Delete photos from storage first
      if (report.hazard_photos && Array.isArray(report.hazard_photos)) {
        const { error: storageError } = await supabase.storage
          .from('hazard-photos')
          .remove(report.hazard_photos);
        if (storageError) console.warn('Storage cleanup error:', storageError);
      }
      const { error } = await supabase
        .from('hazard_reports')
        .delete()
        .eq('id', report.id);
      if (error) throw error;
      showSnackbar('Report deleted', 'success');
      if (activeReport?.id === report.id) setActiveReport(null);
      fetchReports();
    } catch (err) {
      showSnackbar('Failed to delete report', 'error');
    }
    setConfirmAction(null);
  }, [activeReport, fetchReports, showSnackbar]);

  // ── Batch approve ──
  const batchApprove = useCallback(async () => {
    try {
      const pendingIds = reports
        .filter(r => (r.status || r.report_status || 'pending') === 'pending')
        .map(r => r.id);
      if (pendingIds.length === 0) {
        showSnackbar('No pending reports', 'info');
        setConfirmAction(null);
        return;
      }
      const { error } = await supabase
        .from('hazard_reports')
        .update({ status: 'approved' })
        .in('id', pendingIds);
      if (error) throw error;
      showSnackbar(`Approved ${pendingIds.length} reports`, 'success');
      fetchReports();
    } catch (err) {
      showSnackbar('Batch approval failed', 'error');
    }
    setConfirmAction(null);
  }, [reports, fetchReports, showSnackbar]);

  // ═════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[83vh] bg-white font-mono">
      
      {/* ─── Snackbar ─── */}
      {snackbar.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-lg shadow-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
          snackbar.type === 'success' ? 'bg-emerald-600 text-white' :
          snackbar.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          {snackbar.message}
        </div>
      )}

      {/* ─── Confirm Dialog ─── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9998] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setConfirmAction(null)}>
          <div className="bg-slate-300 border border-slate-600 rounded-xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-slate-900 font-bold text-sm mb-2">{confirmAction.title}</h3>
            <p className="text-slate-800 text-xs mb-5 leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-xs font-bold text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 border border-slate-500 transition">Cancel</button>
              <button onClick={() => { confirmAction.onConfirm(); }}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition ${
                  confirmAction.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}>{confirmAction.action}</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lightbox ─── */}
      {lightbox.open && (
        <Lightbox
          images={lightbox.images}
          currentIndex={lightbox.index}
          onClose={() => setLightbox({ open: false, images: [], index: 0 })}
          onPrev={() => setLightbox(prev => ({ ...prev, index: prev.index === 0 ? prev.images.length - 1 : prev.index - 1 }))}
          onNext={() => setLightbox(prev => ({ ...prev, index: prev.index === prev.images.length - 1 ? 0 : prev.index + 1 }))}
        />
      )}

      {/* ─── Top Navigation Bar ─── */}
      <div className="bg-slate-100 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-wider uppercase leading-tight">Admin Hazard Map</h1>
            <p className="text-[8px] text-slate-900 tracking-widest uppercase">NAIC Area • Click a pin to view details</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Total', value: stats.total, color: 'text-blue-300', bg: 'bg-blue-700/90 border-blue-500/30' },
            { label: 'Pending', value: stats.pending, color: 'text-amber-300', bg: 'bg-amber-700/90 border-amber-500/30' },
            { label: 'Approved', value: stats.approved, color: 'text-emerald-300', bg: 'bg-emerald-700/90 border-emerald-500/30' },
            { label: 'Critical', value: stats.critical, color: 'text-red-300', bg: 'bg-red-700/90 border-red-500/30' },
          ].map(s => (
            <div key={s.label} className={`px-2.5 py-1 rounded-md border ${s.bg} flex items-center gap-1.5`}>
              <span className={`text-[11px] font-bold ${s.color}`}>{s.value}</span>
              <span className="text-[8px] text-white uppercase">{s.label}</span>
            </div>
          ))}
          <button onClick={fetchReports}
            className="ml-1 p-2 bg-slate-600 hover:bg-slate-800 rounded-md border border-slate-600 transition" title="Refresh">
            <svg className={`w-3.5 h-3.5 text-slate-300 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Main Layout ─── */}
      <div className="flex h-[83vh]">

        {/* ══════ LEFT SIDEBAR ══════ */}
        <div className="w-72 bg-slate-100 border-r border-slate-500 overflow-y-auto flex flex-col shrink-0">
          
          {/* Quick Actions */}
          <div className="p-3 border-b border-slate-700/60">
            <h2 className="text-[12px] uppercase tracking-[0.15em] text-purple-600 font-bold mb-2.5">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setShowPendingOnly(!showPendingOnly)}
                className={`px-2.5 py-2 text-[12px] font-bold uppercase rounded-lg border transition flex items-center justify-center gap-1 ${
                  showPendingOnly ? 'bg-amber-600 border-amber-400 text-amber-100' : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-600'
                }`}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Pending
              </button>
              <button onClick={() => setConfirmAction({
                title: 'Approve All Pending?',
                message: `This will approve ${stats.pending} pending reports. They will appear on the user heatmap.`,
                action: `Approve ${stats.pending}`,
                onConfirm: batchApprove
              })}
                className="px-2.5 py-2 text-[12px] font-bold uppercase rounded-lg border bg-emerald-600 border-emerald-200/40 text-emerald-100 hover:bg-emerald-600/90 transition flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
                Approve All
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-700/60">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search reports..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-purple-600 border border-slate-600/60 rounded-lg text-xs text-white placeholder-slate-200 focus:outline-none focus:border-purple-500/60" />
            </div>
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-slate-600 space-y-2">
            <h2 className="text-[12px] uppercase tracking-[0.15em] text-purple-600 font-bold">Filters</h2>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2 py-1.5 bg-purple-600 border border-slate-600/60 rounded-lg text-[10px] text-white focus:outline-none focus:border-purple-500/60">
              {CATEGORIES.map(c => <option key={c.id}  value={c.id}>{CATEGORY_ICONS[c.id] || ''} {c.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={selectedRisk} onChange={(e) => setSelectedRisk(e.target.value)}
                className="px-2 py-1.5 bg-purple-600 border border-slate-600/60 rounded-lg text-[12px] text-slate-100 focus:outline-none focus:border-purple-500/60">
                {RISK_LEVELS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2 py-1.5 bg-purple-600 border border-slate-600/60 rounded-lg text-[12px] text-slate-100 focus:outline-none focus:border-purple-500/60">
                {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <button onClick={() => setIsRealistic(!isRealistic)}
              className="w-full px-2.5 py-1.5 text-[12px] font-bold uppercase rounded-lg border bg-purple-600 border-slate-600 text-slate-100 hover:bg-purple-600 transition">
              {isRealistic ? 'Standard Map' : 'Satellite View'}
            </button>
          </div>

          {/* Reports List */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[12px] uppercase text-purple-600 mb-2 font-bold tracking-wider">
              Reports ({filteredReports.length}/{stats.total})
            </p>
            {filteredReports.length === 0 ? (
              <div className="text-center text-slate-600 text-xs py-10">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                </svg>
                No results
              </div>
            ) : (
              <div className="space-y-1">
                {filteredReports.map(report => {
                  const hc = HAZARD_COLORS[report.risk_level?.toLowerCase()] || '#3b82f6';
                  const rptStatus = report.status || report.report_status || 'pending';
                  const isPending = rptStatus === 'pending';
                  const isActive = activeReport?.id === report.id;
                  const photos = getPhotoUrls(report.hazard_photos);
                  return (
                    <div key={report.id}hc
                    
                      onClick={() => setActiveReport(report)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isActive ? 'bg-slate-700/80 border-purple-500/60 shadow-lg shadow-purple-500/5' :
                        'bg-slate-700/30 border-slate-700/50 hover:bg-slate-700/40 hover:border-slate-600'
                      }`}>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded" 
                          style={{ backgroundColor: hc + '70', color: hc }}>{report.risk_level || '?'}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${
                          isPending ? 'bg-amber-500/70 text-amber-200 border-amber-500/40' :
                          rptStatus === 'approved' ? 'bg-emerald-500/70 text-emerald-200 border-emerald-500/70' :
                          'bg-red-500/70 text-red-300 border-red-500/70'
                        }`}>{rptStatus}</span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700 text-slate-200">{report.hazard_category}</span>
                        {photos.length > 0 && <span className="text-[7px] text-sky-400">📸{photos.length}</span>}
                      </div>
                      <p className="text-[12px] text-slate-900 line-clamp-1">{report.hazard_description || 'No description'}</p>
                      <p className="text-[10px] text-slate-700 truncate mt-0.5">{report.address || ''}</p>
                      <p className="text-[9px] text-slate-800 mt-0.5">
                        {report.reporter_name || 'Anonymous'} • {report.date_observed || ''}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══════ MAP ══════ */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-[1000] bg-slate-900/85 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-purple-400 text-xs font-bold uppercase tracking-widest">Loading hazard data...</p>
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-5 left-4 z-[1000] bg-slate-200 border border-slate-700/60 rounded-xl p-4 backdrop-blur-md shadow-2xl">
            <p className="text-[12px] uppercase text-slate-900 font-bold tracking-wider mb-2">Risk</p>
            {[
              { label: 'Critical', color: '#dc2626' },
              { label: 'High', color: '#ea580c' },
              { label: 'Medium', color: '#eab308' },
              { label: 'Low', color: '#22c55e' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 py-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-[10px] text-slate-900">{item.label}</span>
              </div>
            ))}
            <div className="border-t border-slate-900/60 mt-2 pt-2">
              <p className="text-[12px] uppercase text-slate-900 font-bold tracking-wider mb-1.5">Status</p>
              {[
                { label: 'Pending', color: '#f59e0b' },
                { label: 'Approved', color: '#10b981' },
                { label: 'Rejected', color: '#ef4444' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5 py-0.5">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] text-slate-900">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-900/60 mt-2 pt-2 text-[9px] text-slate-800">
              Click a pin → details panel
            </div>
          </div>

          {/* Info overlay */}
          <div className="absolute top-4 left-4 z-[1000] bg-slate-100 border border-slate-700/60 rounded-xl px-3.5 py-2 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-slate-800">Showing: <strong className="text-white">{filteredReports.length}</strong></span>
              <span className="text-slate-900">|</span>
              <span className="text-amber-600">Pending: <strong>{stats.pending}</strong></span>
              <span className="text-red-600">Critical: <strong>{stats.critical}</strong></span>
              <span className="text-orange-600">High: <strong>{stats.high}</strong></span>
            </div>
          </div>

          <MapContainer
            bounds={bounds}
            maxBounds={bounds}
            maxBoundsViscosity={1.0}
            zoom={12}
            minZoom={12}
            maxZoom={19}
            className="h-full w-full"
            style={{ background: '#0f172a' }}
          >
            <TileLayer
              key={isRealistic ? 'realistic' : 'standard'}
              url={isRealistic
                ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              }
              attribution={isRealistic ? '&copy; Esri' : '&copy; OpenStreetMap'}
            />

            {/* Mask */}
            <Polygon
              positions={maskCoords}
              pathOptions={{ fillColor: isRealistic ? '#000' : '#0f172a', fillOpacity: 0.55, color: 'transparent' }}
            />

            {/* Boundary */}
            <Polygon
              positions={flippedBoundary}
              pathOptions={{ color: '#a855f7', fillOpacity: 0, weight: 2, dashArray: '6, 4', opacity: 0.7 }}
            />

            {/* Markers */}
            {filteredReports.map((report) => {
              const riskColor = HAZARD_COLORS[report.risk_level?.toLowerCase()] || '#3b82f6';
              const rptStatus = report.status || report.report_status || 'pending';
              const isPending = rptStatus === 'pending';
              const isActive = activeReport?.id === report.id;

              return (
                <Marker
                  key={report.id}
                  position={[parseFloat(report.latitude), parseFloat(report.longitude)]}
                  icon={createColoredIcon(
                    isActive ? '#a855f7' : (isPending ? '#f59e0b' : riskColor),
                    isPending || isActive
                  )}
                  eventHandlers={{
                    click: () => setActiveReport(report),
                  }}
                />
              );
            })}
          </MapContainer>
        </div>

        {/* ══════ RIGHT DETAIL PANEL ══════ */}
        {activeReport && (
          <DetailPanel
            report={activeReport}
            onClose={() => setActiveReport(null)}
            onUpdateStatus={updateStatus}
            onToggleHeatmap={toggleHeatmap}
            onDelete={(report) => setConfirmAction({
              title: 'Delete Report?',
              message: 'This permanently deletes the report and all its data. Cannot be undone.',
              action: 'Delete',
              danger: true,
              onConfirm: () => deleteReport(report)
            })}
            heatmapVisible={heatmapToggles[activeReport.id] ?? true}
            photos={getPhotoUrls(activeReport.hazard_photos)}
            onOpenLightbox={(images, index) => setLightbox({ open: true, images, index })}
          />
        )}
      </div>
    </div>
  );
};

export default AdminHazardMap;