"use strict";

/**
 * Minster Of Mines — government sectors (parent + MIDI + GIE)
 * and a 7-node department tree per sector:
 *   1 root → 2 sub-departments → 2 children each
 */
const SECTOR_IDS = {
  MINSTER: "10000000-0000-4000-8000-000000000007",
  MIDI: "10000000-0000-4000-8000-000000000008",
  GIE: "10000000-0000-4000-8000-000000000009",
};

const SECTOR_NAMES = {
  MINSTER: "Minster Of Mines",
  MIDI: "MIDI",
  GIE: "GIE",
};

/** Builds: root → 2 subs → 2 children per sub (7 departments total). */
function buildDepartmentTree(rootName, subDepartments) {
  return [
    {
      name: rootName,
      children: subDepartments.map((sub) => ({
        name: sub.name,
        children: (sub.children || []).map((child) =>
          typeof child === "string" ? { name: child } : child
        ),
      })),
    },
  ];
}

const SECTORS = [
  {
    id: SECTOR_IDS.MINSTER,
    name: SECTOR_NAMES.MINSTER,
    parentId: null,
    level: 1,
    sectorKey: "minster-mom",
    departmentTree: buildDepartmentTree("Ministry Headquarters", [
      {
        name: "Policy & Planning Directorate",
        children: [{ name: "Strategic Planning Unit" }, { name: "Monitoring & Evaluation Unit" }],
      },
      {
        name: "Corporate Services Directorate",
        children: [{ name: "Human Resources Unit" }, { name: "Finance & Procurement Unit" }],
      },
    ]),
  },
  {
    id: SECTOR_IDS.MIDI,
    name: SECTOR_NAMES.MIDI,
    parentId: SECTOR_IDS.MINSTER,
    level: 2,
    sectorKey: "minster-midi",
    logoPath: "/midi.jpg",
    departmentTree: buildDepartmentTree("Director General Office", [
      {
        name: "Investment & Licensing Directorate",
        children: [{ name: "Investment Promotion Unit" }, { name: "Licensing Operations Unit" }],
      },
      {
        name: "Sector Development Directorate",
        children: [{ name: "Project Management Unit" }, { name: "Investor Support Unit" }],
      },
    ]),
  },
  {
    id: SECTOR_IDS.GIE,
    name: SECTOR_NAMES.GIE,
    parentId: SECTOR_IDS.MINSTER,
    level: 2,
    sectorKey: "minster-gie",
    logoPath: "/gie.webp",
    departmentTree: buildDepartmentTree("Chief Executive Office", [
      {
        name: "Geoscience Directorate",
        children: [{ name: "Geological Survey Unit" }, { name: "Mapping & Cartography Unit" }],
      },
      {
        name: "Data & Laboratory Directorate",
        children: [{ name: "Geological Data Management Unit" }, { name: "Laboratory Services Unit" }],
      },
    ]),
  },
];

module.exports = {
  SECTOR_IDS,
  SECTOR_NAMES,
  SECTORS,
  buildDepartmentTree,
};
