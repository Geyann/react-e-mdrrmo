"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../createClient";

/* ══════════════════════════════════════════════════════════════════
   MAP VIEW OPTIONS
   ══════════════════════════════════════════════════════════════════ */

const VIEW_OPTIONS = [
  {
    id: "roadmap",
    label: "Default / Roadmap",
    description:
      "Standard streets, road names, and local landmarks.",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    maxZoom: 19,
    attribution:
      "&copy; OpenStreetMap contributors",
  },
  {
    id: "satellite",
    label: "Satellite",
    description:
      "High-resolution aerial and bird's-eye imagery.",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
  {
    id: "terrain",
    label: "Terrain",
    description:
      "Topographic roads, physical features, terrain details, and elevation shading.",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri — Esri, HERE, Garmin, USGS, and the GIS User Community",
  },
 
];

/* ══════════════════════════════════════════════════════════════════
   RISK COLORS
   ══════════════════════════════════════════════════════════════════ */

const RISK_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#eab308",
  low: "#22c55e",
};

const RISK_PRIORITY = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const WORLD_BOUNDS = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
];

/* ══════════════════════════════════════════════════════════════════
   NAIC BOUNDARY
   Stored as [longitude, latitude].
   ══════════════════════════════════════════════════════════════════ */

const NAIC_BOUNDARY_RAW = [
  [120.676693, 14.346669],
  [120.683441, 14.335786],
  [120.723202, 14.313171],
  [120.726786, 14.310712],
  [120.73377, 14.306325],
  [120.736533, 14.303019],
  [120.737455, 14.302343],
  [120.745282, 14.294946],
  [120.745602, 14.294668],
  [120.745803, 14.29452],
  [120.746162, 14.294151],
  [120.746301, 14.294031],
  [120.74645, 14.293735],
  [120.747109, 14.293254],
  [120.747533, 14.292911],
  [120.747852, 14.292674],
  [120.748284, 14.292371],
  [120.748703, 14.292116],
  [120.749145, 14.291734],
  [120.749515, 14.291505],
  [120.74952, 14.291427],
  [120.749729, 14.291396],
  [120.750271, 14.291021],
  [120.750813, 14.290548],
  [120.751204, 14.290262],
  [120.756628, 14.286374],
  [120.758951, 14.283754],
  [120.760941, 14.282012],
  [120.761349, 14.281711],
  [120.763151, 14.280016],
  [120.763296, 14.279912],
  [120.763398, 14.279792],
  [120.763548, 14.279813],
  [120.763682, 14.279725],
  [120.763763, 14.279626],
  [120.764036, 14.279434],
  [120.764192, 14.279293],
  [120.76439, 14.278862],
  [120.765098, 14.278269],
  [120.765227, 14.278087],
  [120.765517, 14.277874],
  [120.766091, 14.277261],
  [120.766504, 14.27697],
  [120.769116, 14.274531],
  [120.76932, 14.274391],
  [120.769433, 14.274235],
  [120.769449, 14.274043],
  [120.769395, 14.273622],
  [120.769313, 14.273443],
  [120.769302, 14.273188],
  [120.769733, 14.273133],
  [120.770565, 14.272956],
  [120.77086, 14.27292],
  [120.771487, 14.273045],
  [120.771745, 14.27307],
  [120.772024, 14.273034],
  [120.77234, 14.272889],
  [120.772689, 14.272785],
  [120.773274, 14.272452],
  [120.773574, 14.272161],
  [120.773681, 14.272114],
  [120.773944, 14.272187],
  [120.774239, 14.272389],
  [120.77432, 14.27266],
  [120.774271, 14.273705],
  [120.774411, 14.274277],
  [120.774658, 14.274453],
  [120.775044, 14.27449],
  [120.775377, 14.274448],
  [120.775736, 14.274329],
  [120.776047, 14.274079],
  [120.776369, 14.274043],
  [120.776605, 14.274058],
  [120.777463, 14.274308],
  [120.777748, 14.274251],
  [120.77793, 14.274074],
  [120.778064, 14.273767],
  [120.778064, 14.273414],
  [120.778193, 14.273148],
  [120.77823, 14.272915],
  [120.778466, 14.272618],
  [120.77867, 14.272582],
  [120.778767, 14.27267],
  [120.778831, 14.27293],
  [120.778976, 14.273065],
  [120.779276, 14.273159],
  [120.779684, 14.273112],
  [120.780247, 14.273096],
  [120.780355, 14.273003],
  [120.780489, 14.272748],
  [120.780628, 14.272462],
  [120.781251, 14.271958],
  [120.781723, 14.271755],
  [120.782066, 14.271688],
  [120.78257, 14.271823],
  [120.782849, 14.271708],
  [120.783064, 14.271537],
  [120.783262, 14.271495],
  [120.783573, 14.271485],
  [120.783927, 14.271209],
  [120.784228, 14.270918],
  [120.784748, 14.270674],
  [120.785456, 14.270258],
  [120.786057, 14.270086],
  [120.786465, 14.270081],
  [120.786722, 14.27004],
  [120.787017, 14.26991],
  [120.787135, 14.269754],
  [120.788637, 14.269083],
  [120.788788, 14.269088],
  [120.788879, 14.269192],
  [120.788949, 14.2694],
  [120.789056, 14.26939],
  [120.789142, 14.269333],
  [120.789673, 14.268724],
  [120.789877, 14.268298],
  [120.789909, 14.267788],
  [120.789807, 14.267575],
  [120.789812, 14.267373],
  [120.789973, 14.267029],
  [120.790424, 14.266847],
  [120.790885, 14.266842],
  [120.792081, 14.266265],
  [120.792666, 14.265771],
  [120.792816, 14.265527],
  [120.792806, 14.264981],
  [120.792859, 14.264752],
  [120.79302, 14.264529],
  [120.793294, 14.264061],
  [120.793626, 14.263837],
  [120.794694, 14.263452],
  [120.79508, 14.263177],
  [120.7953, 14.262896],
  [120.795332, 14.262397],
  [120.795386, 14.26222],
  [120.795606, 14.261747],
  [120.7956, 14.26038],
  [120.795681, 14.260219],
  [120.795944, 14.260099],
  [120.7964, 14.259985],
  [120.797001, 14.259725],
  [120.797279, 14.259553],
  [120.797414, 14.25935],
  [120.797296, 14.25895],
  [120.797124, 14.258674],
  [120.796668, 14.258508],
  [120.796405, 14.258331],
  [120.796303, 14.258056],
  [120.796228, 14.257276],
  [120.796292, 14.256527],
  [120.796518, 14.255519],
  [120.796571, 14.25504],
  [120.79655, 14.254619],
  [120.796486, 14.254323],
  [120.796545, 14.253954],
  [120.796689, 14.253621],
  [120.797011, 14.253356],
  [120.797306, 14.253226],
  [120.797821, 14.253143],
  [120.798234, 14.252961],
  [120.798637, 14.252862],
  [120.79876, 14.252685],
  [120.798916, 14.251583],
  [120.799066, 14.251198],
  [120.799291, 14.251021],
  [120.800493, 14.250564],
  [120.800793, 14.250584],
  [120.801115, 14.25072],
  [120.801437, 14.251136],
  [120.802016, 14.25178],
  [120.802435, 14.251936],
  [120.802789, 14.251884],
  [120.80325, 14.251645],
  [120.803593, 14.251125],
  [120.80315, 14.250772],
  [120.804151, 14.250345],
  [120.804666, 14.249836],
  [120.805385, 14.249295],
  [120.805771, 14.24916],
  [120.80604, 14.249181],
  [120.806351, 14.249295],
  [120.806565, 14.249097],
  [120.806544, 14.248671],
  [120.806726, 14.247824],
  [120.807118, 14.247345],
  [120.807885, 14.246986],
  [120.808164, 14.246633],
  [120.808239, 14.246238],
  [120.808389, 14.245884],
  [120.808336, 14.245343],
  [120.80869, 14.244761],
  [120.809307, 14.244054],
  [120.809934, 14.243217],
  [120.81053, 14.241543],
  [120.810653, 14.240815],
  [120.811356, 14.240118],
  [120.811999, 14.239728],
  [120.812327, 14.239832],
  [120.812654, 14.240066],
  [120.813029, 14.240128],
  [120.813421, 14.239946],
  [120.813657, 14.239504],
  [120.813501, 14.238194],
  [120.814156, 14.23679],
  [120.814725, 14.236317],
  [120.815331, 14.236041],
  [120.815776, 14.235225],
  [120.816275, 14.234539],
  [120.816801, 14.233702],
  [120.816908, 14.233572],
  [120.817798, 14.233993],
  [120.818222, 14.234144],
  [120.81848, 14.234388],
  [120.818571, 14.234346],
  [120.81878, 14.234341],
  [120.819021, 14.234424],
  [120.819386, 14.234617],
  [120.819869, 14.235152],
  [120.82032, 14.235584],
  [120.820513, 14.23549],
  [120.821076, 14.236041],
  [120.821387, 14.236275],
  [120.822541, 14.236951],
  [120.822959, 14.237243],
  [120.823404, 14.237627],
  [120.823619, 14.237846],
  [120.824692, 14.239068],
  [120.824794, 14.238964],
  [120.825271, 14.239291],
  [120.825556, 14.23964],
  [120.826591, 14.24018],
  [120.82687, 14.24044],
  [120.827385, 14.240789],
  [120.827873, 14.240279],
  [120.829074, 14.239333],
  [120.829439, 14.239593],
  [120.829782, 14.239146],
  [120.830748, 14.238178],
  [120.831499, 14.237076],
  [120.831864, 14.23744],
  [120.832679, 14.23795],
  [120.834235, 14.235974],
  [120.835319, 14.236431],
  [120.836209, 14.237045],
  [120.836563, 14.237752],
  [120.836853, 14.237752],
  [120.837185, 14.237544],
  [120.837604, 14.237461],
  [120.838376, 14.238012],
  [120.839331, 14.238771],
  [120.839589, 14.238917],
  [120.840511, 14.239302],
  [120.841305, 14.239707],
  [120.841606, 14.239811],
  [120.842217, 14.240123],
  [120.842915, 14.240373],
  [120.843548, 14.240633],
  [120.844245, 14.240809],
  [120.844513, 14.240913],
  [120.845232, 14.241101],
  [120.847882, 14.241953],
  [120.848848, 14.241995],
  [120.849631, 14.242889],
  [120.849717, 14.242661],
  [120.851036, 14.243056],
  [120.851562, 14.243128],
  [120.853697, 14.243711],
  [120.854427, 14.243773],
  [120.854641, 14.243836],
  [120.854888, 14.243856],
  [120.855103, 14.243908],
  [120.855328, 14.244106],
  [120.855532, 14.2442],
  [120.856025, 14.244324],
  [120.856476, 14.244501],
  [120.856948, 14.24473],
  [120.857227, 14.244803],
  [120.858278, 14.245208],
  [120.858783, 14.245395],
  [120.859179, 14.245603],
  [120.859373, 14.245603],
  [120.859469, 14.245624],
  [120.859609, 14.245811],
  [120.859759, 14.245624],
  [120.860317, 14.245988],
  [120.861218, 14.246435],
  [120.861105, 14.246591],
  [120.861019, 14.246685],
  [120.86095, 14.246836],
  [120.860955, 14.247064],
  [120.860998, 14.247283],
  [120.861014, 14.247579],
  [120.861073, 14.247818],
  [120.861025, 14.247933],
  [120.860596, 14.248422],
  [120.860108, 14.248676],
  [120.859979, 14.249004],
  [120.860011, 14.249186],
  [120.859947, 14.249383],
  [120.859426, 14.249643],
  [120.858777, 14.249758],
  [120.858493, 14.250007],
  [120.858343, 14.249992],
  [120.858209, 14.250018],
  [120.858166, 14.250132],
  [120.858064, 14.250184],
  [120.85794, 14.250174],
  [120.857774, 14.25022],
  [120.857624, 14.25034],
  [120.857082, 14.250714],
  [120.857028, 14.250933],
  [120.857077, 14.251172],
  [120.857098, 14.251286],
  [120.857184, 14.251349],
  [120.857157, 14.251666],
  [120.857168, 14.251796],
  [120.857087, 14.251931],
  [120.857012, 14.252009],
  [120.856894, 14.252087],
  [120.856782, 14.252113],
  [120.856159, 14.252056],
  [120.855612, 14.252264],
  [120.855446, 14.252363],
  [120.855328, 14.252524],
  [120.85528, 14.252747],
  [120.855119, 14.253075],
  [120.854802, 14.253205],
  [120.854539, 14.253189],
  [120.854411, 14.253241],
  [120.85425, 14.253371],
  [120.854335, 14.253636],
  [120.854459, 14.253746],
  [120.85448, 14.254016],
  [120.854464, 14.254546],
  [120.854405, 14.254681],
  [120.854276, 14.254728],
  [120.854196, 14.254723],
  [120.854056, 14.254645],
  [120.853509, 14.254619],
  [120.853322, 14.254562],
  [120.852887, 14.254552],
  [120.852656, 14.254484],
  [120.852415, 14.254562],
  [120.85212, 14.254697],
  [120.852034, 14.254869],
  [120.852141, 14.256023],
  [120.851959, 14.256886],
  [120.851508, 14.257136],
  [120.851229, 14.257479],
  [120.850822, 14.257676],
  [120.850425, 14.25752],
  [120.850317, 14.257385],
  [120.849835, 14.257489],
  [120.849663, 14.25778],
  [120.849459, 14.257895],
  [120.84932, 14.258103],
  [120.849328, 14.258425],
  [120.849481, 14.258955],
  [120.849416, 14.259413],
  [120.849234, 14.25961],
  [120.849094, 14.260026],
  [120.848848, 14.260109],
  [120.848558, 14.260151],
  [120.848322, 14.260172],
  [120.847625, 14.260151],
  [120.847517, 14.260057],
  [120.847313, 14.26013],
  [120.847356, 14.260359],
  [120.847228, 14.261305],
  [120.847324, 14.26299],
  [120.847204, 14.263278],
  [120.845954, 14.263309],
  [120.845227, 14.263806],
  [120.843419, 14.264399],
  [120.843118, 14.264549],
  [120.842153, 14.264747],
  [120.841772, 14.265215],
  [120.840431, 14.265797],
  [120.839111, 14.266754],
  [120.838553, 14.266946],
  [120.83799, 14.267502],
  [120.837395, 14.2677],
  [120.836445, 14.268469],
  [120.835635, 14.26965],
  [120.835351, 14.270362],
  [120.835129, 14.270509],
  [120.834857, 14.270622],
  [120.83431, 14.271402],
  [120.83402, 14.271573],
  [120.832829, 14.272135],
  [120.831757, 14.272863],
  [120.830977, 14.273624],
  [120.830464, 14.27475],
  [120.830324, 14.274895],
  [120.828388, 14.27553],
  [120.827851, 14.275997],
  [120.826564, 14.276678],
  [120.82592, 14.27672],
  [120.825355, 14.276904],
  [120.825027, 14.277107],
  [120.824477, 14.278675],
  [120.82452, 14.279278],
  [120.824584, 14.279522],
  [120.824193, 14.27999],
  [120.823662, 14.280026],
  [120.82319, 14.280328],
  [120.82298, 14.280843],
  [120.822948, 14.282111],
  [120.822423, 14.282324],
  [120.822074, 14.282844],
  [120.821768, 14.28339],
  [120.821301, 14.283795],
  [120.820679, 14.28391],
  [120.81981, 14.284513],
  [120.819317, 14.284664],
  [120.81915, 14.285209],
  [120.818506, 14.285901],
  [120.818329, 14.286062],
  [120.818024, 14.286566],
  [120.817389, 14.286896],
  [120.816975, 14.286984],
  [120.81643, 14.287161],
  [120.816548, 14.287429],
  [120.816854, 14.287965],
  [120.817292, 14.288653],
  [120.81726, 14.288892],
  [120.817013, 14.289105],
  [120.816766, 14.28923],
  [120.816366, 14.289358],
  [120.816329, 14.289519],
  [120.814059, 14.329502],
  [120.813791, 14.32959],
  [120.813625, 14.329601],
  [120.813507, 14.329575],
  [120.813389, 14.329559],
  [120.81319, 14.329543],
  [120.81296, 14.329627],
  [120.812697, 14.330697],
  [120.812767, 14.330973],
  [120.812895, 14.331196],
  [120.812981, 14.331451],
  [120.812976, 14.332407],
  [120.812622, 14.333041],
  [120.812461, 14.333546],
  [120.812176, 14.333847],
  [120.811978, 14.334221],
  [120.81171, 14.334419],
  [120.811479, 14.334393],
  [120.811018, 14.334689],
  [120.810626, 14.334881],
  [120.810288, 14.335141],
  [120.81002, 14.335396],
  [120.809897, 14.335599],
  [120.809859, 14.335812],
  [120.809736, 14.335952],
  [120.808641, 14.336243],
  [120.808142, 14.336285],
  [120.807869, 14.336357],
  [120.807607, 14.336633],
  [120.807488, 14.336893],
  [120.807343, 14.337085],
  [120.807053, 14.337251],
  [120.806614, 14.337215],
  [120.806496, 14.337251],
  [120.806308, 14.337454],
  [120.806131, 14.337818],
  [120.805643, 14.338493],
  [120.805369, 14.33919],
  [120.8045, 14.339767],
  [120.803095, 14.340884],
  [120.802842, 14.341144],
  [120.802687, 14.341456],
  [120.802698, 14.341804],
  [120.802853, 14.342012],
  [120.802799, 14.342142],
  [120.80171, 14.342953],
  [120.801061, 14.34327],
  [120.79928, 14.343618],
  [120.798736, 14.343921],
  [120.797247, 14.345437],
  [120.79641, 14.346357],
  [120.796142, 14.346419],
  [120.795552, 14.34617],
  [120.794391, 14.345532],
  [120.793377, 14.3452],
  [120.792655, 14.345151],
  [120.790778, 14.34564],
  [120.790064, 14.345842],
  [120.788729, 14.346414],
  [120.788329, 14.346525],
  [120.787951, 14.346398],
  [120.787827, 14.346201],
  [120.787854, 14.345842],
  [120.788181, 14.344798],
  [120.78808, 14.344621],
  [120.787817, 14.344626],
  [120.787039, 14.345084],
  [120.78573, 14.345707],
  [120.784617, 14.34573],
  [120.782468, 14.346045],
  [120.782134, 14.346156],
  [120.781753, 14.346354],
  [120.781417, 14.346684],
  [120.781304, 14.346866],
  [120.781143, 14.347396],
  [120.781047, 14.347952],
  [120.780961, 14.348087],
  [120.744502, 14.377321],
  [120.708761, 14.406043],
  [120.708354, 14.403861],
  [120.687116, 14.363579],
  [120.686765, 14.362958],
];

/* Convert [longitude, latitude] to [latitude, longitude]. */
const NAIC_LAT_LNG = NAIC_BOUNDARY_RAW.map(
  ([longitude, latitude]) => [latitude, longitude],
);

const NAIC_BOUNDS = L.latLngBounds(NAIC_LAT_LNG);

/* ══════════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════════ */

const MAP_STYLES = `
  .hazard-map-page {
    background: #020617;
  }

  .hazard-map-page .leaflet-container {
    width: 100%;
    height: 100%;
    background: #020617;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .hazard-map-page.roadmap-mode
    .leaflet-tile-pane {
    filter: saturate(0.85);
  }

  .hazard-map-page.satellite-mode
    .leaflet-tile-pane {
    filter:
      brightness(0.68)
      contrast(1.16)
      saturate(0.85)
      hue-rotate(150deg);
  }

  /*
   * Do not tint the terrain tiles. Esri World Topographic Map
   * already provides the proper colors, contours, labels,
   * roads, and physical details.
   */
  .hazard-map-page.terrain-mode
    .leaflet-tile-pane {
    filter: none !important;
  }

  .hazard-map-page .naic-boundary {
    pointer-events: none;
  }

  .hazard-map-page .hazard-hotspot-glow {
    transform-box: fill-box;
    transform-origin: center;
    animation:
      hazard-hotspot-pulse 3.2s ease-in-out infinite;
    pointer-events: none;
  }

  .hazard-map-page .hazard-hotspot-core {
    filter:
      drop-shadow(
        0 0 5px rgba(255, 255, 255, 0.45)
      );
    pointer-events: none;
  }

  @keyframes hazard-hotspot-pulse {
    0%,
    100% {
      opacity: 0.35;
    }

    50% {
      opacity: 0.9;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hazard-map-page .hazard-hotspot-glow {
      animation: none;
      opacity: 0.65;
    }
  }
`;

/* ══════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════ */

const normalizeRisk = (value) => {
  const risk = String(value || "medium")
    .trim()
    .toLowerCase();

  if (
    risk === "critical" ||
    risk === "high" ||
    risk === "medium" ||
    risk === "low"
  ) {
    return risk;
  }

  return "medium";
};

const isPointInsidePolygon = (
  point,
  polygon,
) => {
  const [latitude, longitude] = point;

  let inside = false;

  for (
    let current = 0,
      previous = polygon.length - 1;
    current < polygon.length;
    previous = current++
  ) {
    const [
      currentLatitude,
      currentLongitude,
    ] = polygon[current];

    const [
      previousLatitude,
      previousLongitude,
    ] = polygon[previous];

    const intersects =
      (currentLongitude > longitude) !==
        (previousLongitude > longitude) &&
      latitude <
        ((previousLatitude - currentLatitude) *
          (longitude - currentLongitude)) /
          (previousLongitude - currentLongitude) +
          currentLatitude;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const getStreetViewUrl = (
  latitude,
  longitude,
) =>
  `https://www.google.com/maps/@?api=1&map_action=papi&viewpoint=${latitude},${longitude}&heading=0&pitch=0&fov=90`;

const formatSupabaseError = (
  error,
  field,
) => {
  const parts = [
    `${field} query failed`,
  ];

  if (error?.code) {
    parts.push(`code: ${error.code}`);
  }

  if (error?.message) {
    parts.push(`message: ${error.message}`);
  }

  if (error?.details) {
    parts.push(`details: ${error.details}`);
  }

  if (error?.hint) {
    parts.push(`hint: ${error.hint}`);
  }

  return parts.join(" — ");
};

const fetchApprovedHotspotRows = async () => {
  const columns =
    "latitude, longitude, risk_level, show_on_heatmap";

  const attempts = [
    {
      field: "report_status",
      query: supabase
        .from("hazard_reports")
        .select(columns)
        .eq("report_status", "approved")
        .eq("show_on_heatmap", true)
        .limit(5000),
    },
    {
      field: "status",
      query: supabase
        .from("hazard_reports")
        .select(columns)
        .eq("status", "approved")
        .eq("show_on_heatmap", true)
        .limit(5000),
    },
  ];

  const results = await Promise.allSettled(
    attempts.map((attempt) => attempt.query),
  );

  const rows = [];
  const failures = [];
  let successfulQueries = 0;

  results.forEach((result, index) => {
    const field = attempts[index].field;

    if (result.status === "fulfilled") {
      if (result.value.error) {
        failures.push(
          formatSupabaseError(
            result.value.error,
            field,
          ),
        );

        return;
      }

      successfulQueries += 1;

      if (Array.isArray(result.value.data)) {
        rows.push(...result.value.data);
      }

      return;
    }

    failures.push(
      `${field} query failed — ${
        result.reason?.message ||
        String(result.reason)
      }`,
    );
  });

  if (successfulQueries === 0) {
    throw new Error(
      failures.join(" | ") ||
        "No hotspot status query could be completed.",
    );
  }

  if (failures.length > 0) {
    console.warn(
      "Some hazard hotspot status queries failed:",
      failures,
    );
  }

  return rows;
};

/* ══════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export default function Hazardmap() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const hotspotLayerRef = useRef(null);
  const viewMenuRef = useRef(null);
  const loadRequestRef = useRef(0);
  const viewModeRef = useRef("roadmap");

  const [viewMode, setViewMode] =
    useState("roadmap");
  const [viewMenuOpen, setViewMenuOpen] =
    useState(false);
  const [notice, setNotice] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadVersion, setReloadVersion] =
    useState(0);

  const selectedView =
    VIEW_OPTIONS.find(
      (option) => option.id === viewMode,
    ) || VIEW_OPTIONS[0];

  /* ── Initialize Leaflet map ─────────────────────────────────── */

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      mapRef.current
    ) {
      return undefined;
    }

    const container = mapContainerRef.current;
    const initialProvider = VIEW_OPTIONS[0];

    const map = L.map(container, {
      center: NAIC_BOUNDS.getCenter(),
      zoom: 12,
      minZoom: 10,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: false,
      worldCopyJump: false,
      maxBounds: NAIC_BOUNDS.pad(0.18),
      maxBoundsViscosity: 0.9,
    });

    mapRef.current = map;

    map.fitBounds(NAIC_BOUNDS, {
      padding: [8, 8],
      animate: false,
    });

    const initialTileLayer = L.tileLayer(
      initialProvider.url,
      {
        maxZoom: initialProvider.maxZoom,
        updateWhenIdle: true,
        keepBuffer: 2,
        crossOrigin: true,
      },
    ).addTo(map);

    tileLayerRef.current = initialTileLayer;

    /* Darken only the area outside Naic. */
    L.polygon(
      [WORLD_BOUNDS, NAIC_LAT_LNG],
      {
        fillColor: "#020617",
        fillOpacity: 0.76,
        color: "transparent",
        weight: 0,
        fillRule: "evenodd",
        interactive: false,
        pane: "overlayPane",
      },
    ).addTo(map);

    /* Draw the exact Naic boundary. */
    L.polygon(NAIC_LAT_LNG, {
      className: "naic-boundary",
      color: "#a855f7",
      fill: false,
      opacity: 0.95,
      weight: 2.5,
      dashArray: "7 6",
      lineCap: "round",
      lineJoin: "round",
      interactive: false,
      pane: "overlayPane",
    }).addTo(map);

    const invalidateMapSize = () => {
      if (
        !mapRef.current ||
        mapRef.current !== map
      ) {
        return;
      }

      map.invalidateSize({
        pan: false,
        animate: false,
      });
    };

    requestAnimationFrame(invalidateMapSize);

    window.addEventListener(
      "resize",
      invalidateMapSize,
    );

    let resizeObserver = null;

    if (
      typeof ResizeObserver !== "undefined"
    ) {
      resizeObserver = new ResizeObserver(
        invalidateMapSize,
      );

      resizeObserver.observe(container);
    }

    return () => {
      window.removeEventListener(
        "resize",
        invalidateMapSize,
      );

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (hotspotLayerRef.current) {
        hotspotLayerRef.current.remove();
        hotspotLayerRef.current = null;
      }

      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }

      if (mapRef.current === map) {
        mapRef.current = null;
      }

      map.remove();
    };
  }, []);

  /* ── Close dropdown when clicking outside ───────────────────── */

  useEffect(() => {
    if (!viewMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (
      event,
    ) => {
      if (
        viewMenuRef.current &&
        !viewMenuRef.current.contains(
          event.target,
        )
      ) {
        setViewMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setViewMenuOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [viewMenuOpen]);

  /* ── Clear temporary notice ─────────────────────────────────── */

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      setNotice("");
    }, 4500);

    return () => clearTimeout(timeout);
  }, [notice]);

  /* ── Install a tile provider ─────────────────────────────────── */

  const installTileProvider = useCallback(
    (nextView) => {
      const map = mapRef.current;

      if (!map || !nextView?.url) {
        return;
      }

      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }

      const nextTileLayer = L.tileLayer(
        nextView.url,
        {
          maxZoom: nextView.maxZoom,
          minZoom: 10,
          updateWhenIdle: true,
          keepBuffer: 2,
          crossOrigin: true,
        },
      );

      nextTileLayer.addTo(map);
      nextTileLayer.bringToBack();

      tileLayerRef.current = nextTileLayer;
      viewModeRef.current = nextView.id;

      setViewMode(nextView.id);

      requestAnimationFrame(() => {
        if (mapRef.current !== map) {
          return;
        }

        map.invalidateSize({
          pan: false,
          animate: false,
        });
      });
    },
    [],
  );

  /* ── Change map view ────────────────────────────────────────── */

  const changeView = useCallback(
    (nextViewId) => {
      const nextView =
        VIEW_OPTIONS.find(
          (option) => option.id === nextViewId,
        );

      if (!nextView) {
        return;
      }

      if (nextView.disabled) {
        setViewMenuOpen(false);

        setNotice(
          "Traffic, transit, and bicycling views require a routing provider API key.",
        );

        return;
      }

      if (nextView.action === "street-view") {
        const map = mapRef.current;

        if (!map) {
          return;
        }

        const center = map.getCenter();

        window.open(
          getStreetViewUrl(
            center.lat,
            center.lng,
          ),
          "_blank",
          "noopener,noreferrer",
        );

        setViewMenuOpen(false);

        setNotice(
          "Street View opened in a new tab.",
        );

        return;
      }

      if (nextViewId === viewModeRef.current) {
        setViewMenuOpen(false);
        return;
      }

      installTileProvider(nextView);
      setViewMenuOpen(false);
      setNotice("");
    },
    [installTileProvider],
  );

  /* ── Load approved public hotspots ──────────────────────────── */

  const loadHotspots = useCallback(async () => {
    const map = mapRef.current;
    const requestId = ++loadRequestRef.current;

    if (!map) {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }

      return;
    }

    setLoading(true);
    setError("");

    try {
      const approvedRows =
        await fetchApprovedHotspotRows();

      if (
        requestId !== loadRequestRef.current ||
        mapRef.current !== map ||
        !map.getPane("overlayPane") ||
        !map.getPane("markerPane")
      ) {
        return;
      }

      if (hotspotLayerRef.current) {
        hotspotLayerRef.current.remove();
        hotspotLayerRef.current = null;
      }

      /*
       * Deduplicate identical coordinates. If several reports
       * share a location, use the highest risk color.
       */
      const uniqueCoordinates = new Map();

      for (const row of approvedRows) {
        if (row.show_on_heatmap !== true) {
          continue;
        }

        const latitude = Number(row.latitude);
        const longitude = Number(row.longitude);

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          continue;
        }

        const point = [latitude, longitude];

        if (
          !isPointInsidePolygon(
            point,
            NAIC_LAT_LNG,
          )
        ) {
          continue;
        }

        const risk = normalizeRisk(
          row.risk_level,
        );

        const coordinateKey =
          `${latitude.toFixed(5)},` +
          `${longitude.toFixed(5)}`;

        const existing =
          uniqueCoordinates.get(coordinateKey);

        if (
          !existing ||
          RISK_PRIORITY[risk] >
            RISK_PRIORITY[existing.risk]
        ) {
          uniqueCoordinates.set(
            coordinateKey,
            {
              point,
              risk,
            },
          );
        }
      }

      /*
       * Separate SVG renderers are required because Leaflet
       * renderers belong to a specific pane.
       */
      const overlayRenderer = L.svg({
        padding: 0.35,
      });

      const markerRenderer = L.svg({
        padding: 0.35,
      });

      const hotspotLayer = L.layerGroup();

      for (const hotspot of uniqueCoordinates.values()) {
        const color =
          RISK_COLORS[hotspot.risk];

        /* Non-interactive glow. */
        L.circle(hotspot.point, {
          renderer: overlayRenderer,
          pane: "overlayPane",
          radius: 90,
          color,
          opacity: 0.55,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.14,
          className: "hazard-hotspot-glow",
          interactive: false,
          keyboard: false,
          bubblingMouseEvents: false,
        }).addTo(hotspotLayer);

        /* Non-interactive center. */
        L.circleMarker(hotspot.point, {
          renderer: markerRenderer,
          pane: "markerPane",
          radius: 7,
          color: "#ffffff",
          opacity: 0.95,
          weight: 1.5,
          fillColor: color,
          fillOpacity: 1,
          className: "hazard-hotspot-core",
          interactive: false,
          keyboard: false,
          bubblingMouseEvents: false,
        }).addTo(hotspotLayer);
      }

      if (
        requestId !== loadRequestRef.current ||
        mapRef.current !== map ||
        !map.getPane("overlayPane") ||
        !map.getPane("markerPane")
      ) {
        hotspotLayer.remove();
        return;
      }

      hotspotLayer.addTo(map);
      hotspotLayerRef.current = hotspotLayer;
    } catch (loadError) {
      if (
        requestId !== loadRequestRef.current ||
        mapRef.current !== map
      ) {
        return;
      }

      console.error(
        "Unable to load hazard hotspots:",
        loadError,
      );

      if (hotspotLayerRef.current) {
        hotspotLayerRef.current.remove();
        hotspotLayerRef.current = null;
      }

      setError(
        loadError?.message ||
          "The hazard hotspot map is temporarily unavailable.",
      );
    } finally {
      if (
        requestId === loadRequestRef.current &&
        mapRef.current === map
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadHotspots();
  }, [loadHotspots, reloadVersion]);

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div
      className={`hazard-map-page fixed inset-0 z-0 h-[100dvh] w-screen overflow-hidden bg-slate-950 ${
        viewMode === "satellite"
          ? "satellite-mode"
          : viewMode === "terrain"
            ? "terrain-mode"
            : "roadmap-mode"
      }`}
    >
      <style>{MAP_STYLES}</style>

      <div
        ref={mapContainerRef}
        role="application"
        aria-label="Naic hazard hotspot map"
        className="h-full w-full"
      />

      {/* Map view dropdown */}
      <div
        ref={viewMenuRef}
        className="absolute right-3 top-20 z-[1000] sm:right-5 sm:top-24"
      >
        <button
          type="button"
          onClick={() =>
            setViewMenuOpen((open) => !open)
          }
          aria-haspopup="listbox"
          aria-expanded={viewMenuOpen}
          aria-label="Choose map view"
          className="flex min-w-[220px] items-center justify-between gap-4 rounded-xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-left shadow-2xl backdrop-blur-md transition hover:bg-slate-900/95 sm:min-w-[270px]"
        >
          <span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Map View
            </span>

            <span className="mt-1 block text-sm font-bold text-white">
              {selectedView.label}
            </span>
          </span>

          <svg
            className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${
              viewMenuOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </button>

        {viewMenuOpen && (
          <div
            role="listbox"
            aria-label="Map view options"
            className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-md"
          >
            {VIEW_OPTIONS.map((option) => {
              const active =
                option.id === viewMode;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onClick={() =>
                    changeView(option.id)
                  }
                  className={`w-full rounded-lg px-3 py-3 text-left transition ${
                    option.disabled
                      ? "cursor-not-allowed opacity-55"
                      : active
                        ? "bg-purple-600 text-white"
                        : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold">
                      {option.label}
                    </span>

                    {option.disabled && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                        API required
                      </span>
                    )}

                    {active && (
                      <span className="shrink-0 text-xs">
                        ✓
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-1 text-[11px] leading-relaxed ${
                      active
                        ? "text-purple-100"
                        : "text-slate-400"
                    }`}
                  >
                    {option.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Risk legend */}
      <div className="absolute bottom-5 left-4 z-[1000] sm:left-6 lg:left-20">
        <div className="w-44 rounded-xl border border-slate-700/80 bg-slate-950/90 p-4 text-slate-200 shadow-2xl backdrop-blur-md">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Risk Level
          </p>

          <div className="space-y-2.5">
            {[
              ["critical", "Critical"],
              ["high", "High"],
              ["medium", "Medium"],
              ["low", "Low"],
            ].map(([risk, label]) => (
              <div
                key={risk}
                className="flex items-center gap-2.5"
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/60 shadow-[0_0_8px_currentColor]"
                  style={{
                    backgroundColor:
                      RISK_COLORS[risk],
                    color: RISK_COLORS[risk],
                  }}
                />

                <span className="text-xs font-semibold text-slate-200">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attribution */}
      <div className="absolute bottom-1 right-1 z-[1000] max-w-[calc(100%-1rem)] rounded-md bg-slate-950/80 px-2 py-1 text-[9px] text-slate-400 backdrop-blur-sm">
        {selectedView.attribution ? (
          <a
            href={
              viewMode === "roadmap"
                ? "https://www.openstreetmap.org/copyright"
                : "https://www.esri.com/"
            }
            target="_blank"
            rel="noreferrer"
            className="text-purple-300 hover:text-purple-200"
          >
            {selectedView.attribution}
          </a>
        ) : null}
      </div>

      {/* Notice */}
      {notice && (
        <div className="pointer-events-none fixed left-1/2 top-24 z-[1100] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-purple-400/40 bg-slate-950/95 px-4 py-3 text-center text-sm font-semibold text-slate-100 shadow-2xl backdrop-blur">
          {notice}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="pointer-events-none fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white">
              Loading hotspot map
            </p>
          </div>
        </div>
      )}

      {/* Database/network error */}
      {!loading && error && (
        <div className="fixed left-1/2 top-24 z-[1100] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 rounded-xl border border-red-400/50 bg-red-950/95 px-4 py-3 text-center shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold text-red-100">
            {error}
          </p>

          <button
            type="button"
            onClick={() => {
              setReloadVersion(
                (version) => version + 1,
              );
            }}
            className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
