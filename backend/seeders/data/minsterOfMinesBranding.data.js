"use strict";

const { SECTOR_NAMES } = require("./minsterOfMinesStructure.data");

const BRANDING_IDS = {
  MIDI: "80000000-0000-4000-8000-000000000008",
  GIE: "80000000-0000-4000-8000-000000000009",
};

function buildMidiBranding(governmentStructureId) {
  return {
    branding_setting_id: BRANDING_IDS.MIDI,
    government_structure_id: governmentStructureId,
    system_name_full: "MIDI Plan Management System",
    system_name_short: "MIDI PMS",
    system_tagline: "Mining Industry Development Institute — planning and performance",
    logo_primary_path: "/midi.jpg",
    logo_secondary_path: "/midi.jpg",
    favicon_path: "/midi.jpg",
    primary_color: "#166534",
    secondary_color: "#4B5563",
    accent_color: "#22C55E",
    success_color: "#15803D",
    warning_color: "#CA8A04",
    error_color: "#DC2626",
    info_color: "#0D9488",
    background_color: "#F0FDF4",
    surface_color: "#FFFFFF",
    sidebar_color: "#FFFFFF",
    header_color: "#FFFFFF",
    text_primary_color: "#14532D",
    text_secondary_color: "#4B5563",
    border_color: "#BBF7D0",
    sidebar_nav_hover_color: "#DCFCE7",
    sidebar_nav_active_color: "#166534",
    sidebar_nav_active_text_color: "#FFFFFF",
    sidebar_subnav_active_color: "#DCFCE7",
    sidebar_subnav_active_text_color: "#166534",
    sidebar_header_text_color: "#15803D",
    toolbar_button_color: "#166534",
    toolbar_button_hover_color: "#14532D",
    toolbar_button_text_color: "#FFFFFF",
    table_header_color: "#166534",
    table_header_hover_color: "#14532D",
    table_header_text_color: "#FFFFFF",
  };
}

function buildGieBranding(governmentStructureId) {
  return {
    branding_setting_id: BRANDING_IDS.GIE,
    government_structure_id: governmentStructureId,
    system_name_full: "GIE Plan Management System",
    system_name_short: "GIE PMS",
    system_tagline: "Ethiopian Geological Institute — planning and performance",
    logo_primary_path: "/gie.webp",
    logo_secondary_path: "/gie.webp",
    favicon_path: "/gie.webp",
    primary_color: "#78350F",
    secondary_color: "#57534E",
    accent_color: "#D97706",
    success_color: "#16A34A",
    warning_color: "#EA580C",
    error_color: "#DC2626",
    info_color: "#0284C7",
    background_color: "#FFFBEB",
    surface_color: "#FFFFFF",
    sidebar_color: "#FFFFFF",
    header_color: "#FFFFFF",
    text_primary_color: "#451A03",
    text_secondary_color: "#78716C",
    border_color: "#FDE68A",
    sidebar_nav_hover_color: "#FEF3C7",
    sidebar_nav_active_color: "#92400E",
    sidebar_nav_active_text_color: "#FFFFFF",
    sidebar_subnav_active_color: "#FEF3C7",
    sidebar_subnav_active_text_color: "#78350F",
    sidebar_header_text_color: "#92400E",
    toolbar_button_color: "#92400E",
    toolbar_button_hover_color: "#78350F",
    toolbar_button_text_color: "#FFFFFF",
    table_header_color: "#92400E",
    table_header_hover_color: "#78350F",
    table_header_text_color: "#FFFFFF",
  };
}

/** Branding targets under the Minster Of Mines parent (parent keeps global default). */
const CHILD_SECTOR_BRANDING = [
  {
    sectorName: SECTOR_NAMES.MIDI,
    logoPath: "/midi.jpg",
    buildBranding: buildMidiBranding,
  },
  {
    sectorName: SECTOR_NAMES.GIE,
    logoPath: "/gie.webp",
    buildBranding: buildGieBranding,
  },
];

module.exports = {
  BRANDING_IDS,
  PARENT_SECTOR_NAME: SECTOR_NAMES.MINSTER,
  CHILD_SECTOR_BRANDING,
  buildMidiBranding,
  buildGieBranding,
};
