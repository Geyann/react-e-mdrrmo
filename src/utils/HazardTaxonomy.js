/**
 * Natural-disaster taxonomy for SafeResponse hazard reports (HazardReport.jsx).
 * Hazard reports = non-emergency conditions for admin verification and map display.
 * Emergency situations belong on Report.jsx (incident report / dispatch).
 */

export const HAZARD_CATEGORIES = [
  {
    id: "Flood",
    label: "Flood",
    icon: "🌊",
    color: "#0ea5e9",
    types: [
      "Flooding",
      "Flash flood",
      "Coastal flooding",
      "Storm surge",
      "High tides causing inundation",
      "Other flood-related",
    ],
  },
  {
    id: "Weather",
    label: "Weather",
    icon: "🌪️",
    color: "#6366f1",
    types: [
      "Typhoon",
      "Strong winds",
      "Heavy rainfall",
      "Thunderstorm",
      "Lightning",
      "Tornado / waterspout",
      "Drought / extreme heat",
      "Other weather-related",
    ],
  },
  {
    id: "Geological",
    label: "Geological",
    icon: "🌋",
    color: "#b45309",
    types: [
      "Landslide",
      "Earthquake",
      "Ground rupture",
      "Soil liquefaction",
      "Tsunami",
      "Volcanic eruption",
      "Ashfall",
      "Other geological",
    ],
  },
  {
    id: "Other Natural",
    label: "Other Natural Disaster",
    icon: "📋",
    color: "#475569",
    types: ["Other natural disaster / does not fit above"],
  },
];

/** Legacy values from older forms — still filterable on the map */
export const LEGACY_HAZARD_CATEGORIES = [
  { id: "physical", label: "Physical (legacy)", icon: "🏗️" },
  { id: "chemical/biological", label: "Chemical / Biological (legacy)", icon: "☣️" },
  { id: "electrical", label: "Electrical (legacy)", icon: "⚡" },
  { id: "procedural/safety practices", label: "Procedural / Safety (legacy)", icon: "📋" },
  { id: "natural disaster", label: "Natural Disaster (legacy)", icon: "🌊" },
  { id: "fire", label: "Fire (legacy)", icon: "🔥" },
  { id: "road and transport", label: "Road and Transport (legacy)", icon: "🚗" },
  { id: "medical emergency", label: "Medical Emergency (legacy)", icon: "🚑" },
  { id: "infrastructure", label: "Infrastructure (legacy)", icon: "🏗️" },
  { id: "environmental", label: "Environmental (legacy)", icon: "🌿" },
  { id: "public safety", label: "Public Safety (legacy)", icon: "🛡️" },
  { id: "other", label: "Other (legacy)", icon: "📋" },
];

export const CATEGORY_BY_ID = Object.fromEntries(
  HAZARD_CATEGORIES.map((c) => [c.id.toLowerCase(), c]),
);

export const CATEGORY_ICONS = Object.fromEntries([
  ...HAZARD_CATEGORIES.map((c) => [c.id.toLowerCase(), c.icon]),
  ...LEGACY_HAZARD_CATEGORIES.map((c) => [c.id.toLowerCase(), c.icon]),
]);

/** Filter dropdown options for maps / admin tables */
export const HAZARD_FILTER_OPTIONS = [
  { id: "all", label: "All Natural Hazards", icon: "📍" },
  ...HAZARD_CATEGORIES.map((c) => ({
    id: c.id.toLowerCase(),
    label: c.label,
    icon: c.icon,
  })),
  ...LEGACY_HAZARD_CATEGORIES.map((c) => ({
    id: c.id.toLowerCase(),
    label: c.label,
    icon: c.icon,
  })),
];

export function getTypesForCategory(categoryId) {
  if (!categoryId) return [];
  const found = HAZARD_CATEGORIES.find(
    (c) => c.id.toLowerCase() === String(categoryId).toLowerCase(),
  );
  return found?.types || [];
}

export function normalizeCategoryKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function composeHazardDescription(hazardType, description) {
  const desc = String(description || "").trim();
  const type = String(hazardType || "").trim();
  if (!type) return desc;
  if (!desc) return `Type: ${type}`;
  if (desc.toLowerCase().startsWith("type:")) return desc;
  return `Type: ${type}\n\n${desc}`;
}

export function parseHazardTypeFromDescription(description) {
  const match = String(description || "").match(/^Type:\s*(.+?)(?:\n|$)/i);
  return match ? match[1].trim() : null;
}

/**
 * Emergency incident types for Report.jsx (dispatch / immediate response).
 * These are NOT hazard-map categories.
 */
export const EMERGENCY_INCIDENT_TYPES = [
  {
    id: "Medical Emergency",
    label: "Medical Emergency",
    icon: "🚑",
    types: [
      "Cardiac emergency",
      "Difficulty breathing",
      "Stroke symptoms",
      "Severe bleeding",
      "Unconsciousness",
      "Poisoning",
      "Heat-related illness",
      "Injury / trauma",
      "Other medical emergency",
    ],
  },
  {
    id: "Fire",
    label: "Fire / Explosion",
    icon: "🔥",
    types: [
      "Residential fire",
      "Commercial building fire",
      "Electrical fire",
      "Industrial fire",
      "Gas leak with fire risk",
      "Explosion",
      "Other fire / explosion",
    ],
  },
  {
    id: "Road and Transport Accident",
    label: "Road and Transport Accident",
    icon: "🚗",
    types: [
      "Road collision",
      "Motorcycle collision",
      "Vehicle-pedestrian accident",
      "Vehicle rollover",
      "Boat accident",
      "Road obstruction from accident",
      "Other transport accident",
    ],
  },
  {
    id: "Chemical and Industrial Emergency",
    label: "Chemical and Industrial Emergency",
    icon: "☣️",
    types: [
      "Chemical spill",
      "Toxic gas leak",
      "Fuel spill",
      "Hazardous material exposure",
      "Industrial accident",
      "Gas tank explosion",
      "Other chemical / industrial emergency",
    ],
  },
  {
    id: "Structural / Collapse Emergency",
    label: "Structural / Collapse Emergency",
    icon: "🏗️",
    types: [
      "Collapsed building",
      "Trapped persons",
      "Falling structure / debris",
      "Construction accident",
      "Falling from height",
      "Other structural emergency",
    ],
  },
  {
    id: "Utility Emergency",
    label: "Utility Emergency",
    icon: "⚡",
    types: [
      "Live fallen electrical wires",
      "Major power hazard",
      "Water main break with immediate danger",
      "Gas line emergency",
      "Other utility emergency",
    ],
  },
  {
    id: "Public Safety Emergency",
    label: "Public Safety Emergency",
    icon: "🛡️",
    types: [
      "Violence or physical assault",
      "Civil disturbance",
      "Bomb threat",
      "Suspicious package",
      "Crowd-related emergency",
      "Missing person (urgent)",
      "Other public safety emergency",
    ],
  },
  {
    id: "Other Emergency",
    label: "Other Emergency",
    icon: "⚠️",
    types: [], // free-text input in the form
  },
];

export function getEmergencyTypesForCategory(categoryId) {
  if (!categoryId) return [];
  const found = EMERGENCY_INCIDENT_TYPES.find((t) => t.id === categoryId);
  return found?.types || [];
}

export function isOtherEmergency(categoryId) {
  return String(categoryId || "") === "Other Emergency";
}

/** Compose incidentType for DB storage: main category, optionally with specific type. */
export function composeIncidentType(mainType, specificType, otherText) {
  const main = String(mainType || "").trim();
  if (!main) return "";
  if (isOtherEmergency(main)) {
    const detail = String(otherText || "").trim();
    return detail ? `Other Emergency — ${detail}` : "Other Emergency";
  }
  const specific = String(specificType || "").trim();
  return specific ? `${main} — ${specific}` : main;
}


export function isOtherNaturalHazard(categoryId) {
  const key = String(categoryId || "").trim().toLowerCase();
  return key === "other natural" || key === "other";
}