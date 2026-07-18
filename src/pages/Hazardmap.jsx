import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from "../createClient";

// ════════════════════════════════════════════════════════════════════════════
//  NAIC BOUNDARY COORDINATES (lng, lat)
// ════════════════════════════════════════════════════════════════════════════
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
//  CATEGORY ICONS & COLORS
// ════════════════════════════════════════════════════════════════════════════
const CATEGORY_CONFIG = {
  'flood':             { label: 'Flood' },
  'fire':              { label: 'Fire' },
  'earthquake':        { label: 'Earthquake' },
  'landslide':         { label: 'Landslide' },
  'typhoon':           { label: 'Typhoon' },
  'volcanic':          { label: 'Volcanic' },
  'industrial':        { label: 'Industrial' },
  'traffic':           { label: 'Traffic' },
  'health':            { label: 'Health' },
  'infrastructure':    { label: 'Infrastructure' },
  'others':            { label: 'Others' },
};

const CATEGORY_LIST = Object.entries(CATEGORY_CONFIG).map(([key, val]) => ({
  key,
  ...val,
}));
// ════════════════════════════════════════════════════════════════════════════
//  CUSTOM CANVAS HEATMAP LAYER — Properly anchored to map
// ════════════════════════════════════════════════════════════════════════════
const SimpleHeatLayer = ({ points, radius = 8, blur = 6, maxIntensity = 1.0 }) => {
  const map = useMap();
  const canvasRef = useRef(null);
  const heatRef = useRef(null);

  const gradient = {
    0.0: '#22c55e',
    0.25: '#84cc16',
    0.5: '#eab308',
    0.75: '#ea580c',
    1.0: '#dc2626',
  };

  const redraw = useCallback(() => {
    if (!heatRef.current || !canvasRef.current || !map || !points || points.length === 0) return;

    try {
      // Project all points from lat/lng to pixel coords relative to the map container
      const data = points.map(p => {
        const pt = map.latLngToContainerPoint(L.latLng(p.lat, p.lng));
        return [Math.round(pt.x), Math.round(pt.y), p.intensity];
      });

      const heat = heatRef.current;
      heat.data(data);
      heat.draw();
    } catch (err) {
      console.error('❌ Redraw error:', err);
    }
  }, [map, points]);

  useEffect(() => {
    if (!map || !points || points.length === 0) return;

    let isDestroyed = false;
    let SimpleHeatConstructor;

    const init = async () => {
      try {
        const mod = await import('simpleheat');
        SimpleHeatConstructor = mod.default || mod;

        if (isDestroyed) return;

        const size = map.getSize();

        // Create canvas element
        const canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer');
        canvas.width = size.x;
        canvas.height = size.y;
        canvas.style.width = size.x + 'px';
        canvas.style.height = size.y + 'px';
        canvas.style.pointerEvents = 'none';
        canvas.style.position = 'absolute';
        // CRITICAL: Position at top-left of the map container
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = '400';

        // ════════════════════════════════════════════════════════════════
        // FIX: Set willReadFrequently on the 2D context BEFORE simpleheat
        // uses it. simpleheat calls getImageData internally, and this
        // attribute tells the browser to optimize for repeated readback.
        // ════════════════════════════════════════════════════════════════
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        canvasRef.current = canvas;

        // Add canvas to the map container directly (not overlay pane)
        // This avoids Leaflet's transform system which was causing the disappearing
        const mapContainer = map.getContainer();
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(canvas);

        // Initialize simpleheat with the pre-configured canvas
        const heat = new SimpleHeatConstructor(canvas);
        heat.gradient(gradient);
        heat.radius(radius, blur);
        heat.max(maxIntensity);
        heatRef.current = heat;

        // Draw initial data
        redraw();

        // ── Event Handlers ──

        // Resize handler
        const handleResize = () => {
          if (!canvasRef.current || !heatRef.current) return;
          const newSize = map.getSize();
          canvasRef.current.width = newSize.x;
          canvasRef.current.height = newSize.y;
          canvasRef.current.style.width = newSize.x + 'px';
          canvasRef.current.style.height = newSize.y + 'px';
          // Re-get context with willReadFrequently after resize
          canvasRef.current.getContext('2d', { willReadFrequently: true });
          redraw();
        };

        // Redraw on any map movement (pan/zoom)
        // latLngToContainerPoint changes when the map moves, so we must redraw
        const handleMoveEnd = () => {
          redraw();
        };

        // While actively panning, redraw continuously
        const handleMove = () => {
          redraw();
        };

        // While zooming, redraw continuously
        const handleZoom = () => {
          redraw();
        };

        // Bind events
        map.on('resize', handleResize);
        map.on('moveend', handleMoveEnd);
        map.on('move', handleMove);
        map.on('zoom', handleZoom);
        map.on('zoomend', handleMoveEnd);

        // Store cleanup
        heatRef.current._cleanup = () => {
          map.off('resize', handleResize);
          map.off('moveend', handleMoveEnd);
          map.off('move', handleMove);
          map.off('zoom', handleZoom);
          map.off('zoomend', handleMoveEnd);
        };

        console.log('✅ SimpleHeat rendered:', points.length, 'points');
      } catch (err) {
        console.error('❌ SimpleHeat init error:', err);
      }
    };

    init();

    return () => {
      isDestroyed = true;
      if (heatRef.current?._cleanup) {
        heatRef.current._cleanup();
      }
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
      }
      heatRef.current = null;
      canvasRef.current = null;
    };
  }, [map, points, radius, blur, maxIntensity, redraw]);

  return null;
};

// ════════════════════════════════════════════════════════════════════════════
//  CATEGORY FILTER COMPONENT
// ════════════════════════════════════════════════════════════════════════════
const CategoryFilter = ({ categories, selected, onChange, uniqueCounts }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative ">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-600/80 border border-purple-600/60 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-100 transition"
      >
        <svg className="w-3.5 h-3.5 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
        </svg>
        {selected.length === 0 || selected.length === categories.length
          ? 'All Categories'
          : `${selected.length} Selected`}
        <span className="text-[8px] text-slate-100">▼</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-full mt-1 z-1000 bg-purple-600 border border-purple-700/80 rounded-xl shadow-2xl backdrop-blur-md p-4 w-70 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600/50 scrollbar-track-purple-600/50">
            <div className="flex gap-2 px-3 pb-2 border-b border-purple-700/60 mb-2">
              <button
                onClick={() => onChange(categories.map(c => c.key))}
                className="flex-1 text-[9px] uppercase font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-md py-1 transition"
              >
                All
              </button>
              <button
                onClick={() => onChange([])}
                className="flex-1 text-[9px] uppercase font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-md py-1 transition"
              >
                None
              </button>
            </div>

            {categories.map(cat => {
              const isSelected = selected.includes(cat.key);
              const count = uniqueCounts[cat.key] || 0;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    if (isSelected) {
                      onChange(selected.filter(k => k !== cat.key));
                    } else {
                      onChange([...selected, cat.key]);
                    }
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] transition mb-0.5 ${
                    isSelected
                      ? 'bg-slate-700/80 text-white'
                      : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-200'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-slate-600 bg-transparent'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </div>

                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>

                  <span className="mr-auto">{cat.icon} {cat.label}</span>

                  <span className="text-[9px] text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded-md">{count}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
//  MAIN USER HAZARD MAP
// ════════════════════════════════════════════════════════════════════════════
const UserHazardMap = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRealistic, setIsRealistic] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchStatus, setFetchStatus] = useState('');

  // ── Category filter state ──
  const [selectedCategories, setSelectedCategories] = useState(CATEGORY_LIST.map(c => c.key));

  // ── Boundary ──
  const flippedBoundary = useMemo(() => naicBoundaryRaw.map(c => [c[1], c[0]]), []);
  const bounds = useMemo(() => L.latLngBounds(flippedBoundary), [flippedBoundary]);
  const worldBounds = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
  const maskCoords = [worldBounds, flippedBoundary];

  // ── Fetch approved reports ──
  const fetchApprovedReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFetchStatus('Fetching reports...');
    try {
      const { data, error: supabaseError } = await supabase
        .from('hazard_reports')
        .select('id, latitude, longitude, risk_level, hazard_category, hazard_description, address, reporter_name, date_observed, created_at')
        .or('status.eq.approved,report_status.eq.approved')
        .eq('show_on_heatmap', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        setFetchStatus('No approved reports found. Approve in admin panel first.');
        setReports([]);
      } else {
        setFetchStatus(`Loaded ${data.length} reports`);
        setReports(data);  
      }
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
      setFetchStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovedReports();
  }, [fetchApprovedReports]);

  // ── Unique category counts (from all reports) ──
  const uniqueCategoryCounts = useMemo(() => {
    const counts = {};
    reports.forEach(r => {
      const cat = (r.hazard_category || 'others').toLowerCase().trim();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [reports]);

  // ── Filtered reports ──
  const filteredReports = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    if (selectedCategories.length === CATEGORY_LIST.length) return reports;
    return reports.filter(r => {
      const cat = (r.hazard_category || 'others').toLowerCase().trim();
      return selectedCategories.includes(cat);
    });
  }, [reports, selectedCategories]);

  // ── Stats ──
  const stats = useMemo(() => ({
    total: filteredReports.length,
    critical: filteredReports.filter(r => r.risk_level?.toLowerCase() === 'critical').length,
    high: filteredReports.filter(r => r.risk_level?.toLowerCase() === 'high').length,
    medium: filteredReports.filter(r => r.risk_level?.toLowerCase() === 'medium').length,
    low: filteredReports.filter(r => r.risk_level?.toLowerCase() === 'low').length,
  }), [filteredReports]);

  // ── Heatmap points — each report gets its own intensity based on risk_level ──
  const heatPoints = useMemo(() => {
    return filteredReports.map(r => ({
      lat: parseFloat(r.latitude),
      lng: parseFloat(r.longitude),
      intensity:
        r.risk_level?.toLowerCase() === 'critical' ? 1.0 :
        r.risk_level?.toLowerCase() === 'high' ? 0.8 :
        r.risk_level?.toLowerCase() === 'medium' ? 0.5 :
        r.risk_level?.toLowerCase() === 'low' ? 0.3 :
        0.5,
    }));
  }, [filteredReports]);

  // ── Cluster info ──
  const clusterInfo = useMemo(() => {
    if (filteredReports.length === 0) return { maxCluster: 0, totalClusters: 0 };
    const gridSize = 0.002;
    const clusters = {};
    filteredReports.forEach(r => {
      const cellKey = `${Math.floor(parseFloat(r.latitude) / gridSize)},${Math.floor(parseFloat(r.longitude) / gridSize)}`;
      clusters[cellKey] = (clusters[cellKey] || 0) + 1;
    });
    const counts = Object.values(clusters);
    return { maxCluster: Math.max(...counts, 1), totalClusters: counts.length };
  }, [filteredReports]);

  // ═════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[calc(screen-20px)] bg-slate-900 font-mono">
      
      {/* Header */}
      <div className="bg-slate-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          
          <div>
            <h1 className="text-lg font-bold text-gray-700 tracking-wider uppercase leading-tight">Hazard Heatmap</h1>
            <p className="text-[9px] text-slate-600 tracking-widest uppercase">NAIC Area • Pinpoint hazard locations</p>
          </div>
        </div>

        <div className="flex items-center gap-2 ">
          
          <CategoryFilter
            categories={CATEGORY_LIST}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            uniqueCounts={uniqueCategoryCounts}
          />

          <button onClick={fetchApprovedReports}
            className="ml-1 p-2 bg-purple-600 hover:bg-purple-700 rounded-md border border-purple-600 transition" title="Refresh">
            <svg className={`w-3.5 h-3.5 text-slate-300 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
          <button onClick={() => setIsRealistic(!isRealistic)}
            className="ml-1 px-3 py-1.5 text-[9px] font-bold uppercase rounded-lg border bg-purple-600 border-purple-600 text-slate-300 hover:bg-purple-700 transition">
            {isRealistic ? 'Map' : 'Satellite'}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[82vh]">
        
        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 z-[1000] bg-slate-900/85 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Loading hazard data...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-600/90 text-white px-5 py-2.5 rounded-lg shadow-xl text-xs font-bold">
            {error}
            <button onClick={fetchApprovedReports} className="ml-3 underline">Retry</button>
          </div>
        )}

        {/* ─── Legend ─── */}
        <div className="absolute bottom-6 left-4 z-[1000] bg-slate-200 border border-slate-700/60 rounded-xl p-4 backdrop-blur-md shadow-2xl w-56">
          <h3 className="text-[15px] uppercase text-slate-900 font-bold tracking-wider mb-3 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Hazard Intensity
          </h3>

          <div className="relative mb-3">
            <div className="w-full h-5 rounded-md" style={{
              background: 'linear-gradient(to right, #22c55e, #84cc16, #eab308, #ea580c, #dc2626)'
            }}></div>
            <div className="flex justify-between text-[8px] text-slate-900 mt-0.5">
              <span>Low</span>
              <span>Moderate</span>
              <span>Critical</span>
            </div>
          </div>

          <div className="space-y-1.5 mb-3">
            {[
              { color: '#22c55e', label: 'Low risk' },
              { color: '#84cc16', label: 'Low-Medium risk' },
              { color: '#eab308', label: 'Medium risk' },
              { color: '#ea580c', label: 'High risk' },
              { color: '#dc2626', label: 'Critical risk' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{backgroundColor: item.color}}></div>
                <span className="text-[9px] text-slate-900">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700/60 pt-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-slate-500 bg-slate-500/30"></span>
              <span className="text-[8px] text-slate-900">NAIC Boundary</span>
            </div>
          </div>

         
        </div>

       

        {/* ─── Leaflet Map ─── */}
        <MapContainer
          bounds={bounds}
          maxBounds={bounds}
          maxBoundsViscosity={1.0}
          zoom={13}
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

          <Polygon
            positions={maskCoords}
            pathOptions={{ fillColor: isRealistic ? '#000' : '#0f172a', fillOpacity: 0.55, color: 'transparent' }}
          />

          <Polygon
            positions={flippedBoundary}
            pathOptions={{ color: '#a855f7', fillOpacity: 0, weight: 2, dashArray: '6, 4', opacity: 0.7 }}
          />

          {heatPoints.length > 0 && (
            <SimpleHeatLayer
              points={heatPoints}
              radius={11}
              blur={6}
              maxIntensity={1.0}
            />
          )}
        </MapContainer>

      </div>
    </div>
  );
};

export default UserHazardMap;