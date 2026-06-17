"use strict";

const { SECTOR_ID: ALT_MOM_SECTOR_ID } = require("./alternativeMomOrganogram.data");

/**
 * Institute sectors under Alternative Minister of Mines (2016 E.C. organogram).
 * The main MoM organogram lists these as direct children of the Minister;
 * internal units follow the same Director General root pattern as the ministry.
 */
const PARENT_SECTOR_ID = ALT_MOM_SECTOR_ID;
const PARENT_SECTOR_NAME = "Alternative Minister of Mines";

const ROOT_DIRECTOR_GENERAL = "Director General";

const INSTITUTES = [
    {
        sectorId: "10000000-0000-4000-8000-000000000005",
        sectorKey: "alt-mom-egi",
        name: "Ethiopian Geological Institute",
        description:
            "Ethiopian Geological Institute under Alternative Minister of Mines — geological surveys, mapping, data management, exploration support, laboratory services, and geospatial information.",
        departmentTree: [
            {
                name: ROOT_DIRECTOR_GENERAL,
                children: [
                    { name: "Chief Executive Office" },
                    {
                        name: "Geological Survey Department",
                        children: [
                            { name: "Field Survey Section" },
                            { name: "Regional Survey Unit" },
                        ],
                    },
                    {
                        name: "Mapping Department",
                        children: [
                            { name: "Cartography Desk" },
                            { name: "GIS and Remote Sensing Unit" },
                        ],
                    },
                    {
                        name: "Data Management Department",
                        children: [
                            { name: "Geoscience Data Catalog Desk" },
                            { name: "Records and Archive Section" },
                        ],
                    },
                    {
                        name: "Laboratory Department",
                        children: [
                            { name: "Analytical Testing Desk" },
                            { name: "Sample Processing Unit" },
                        ],
                    },
                    {
                        name: "Exploration Support Department",
                        children: [
                            { name: "Technical Advisory Desk" },
                            { name: "Exploration Data Support Unit" },
                        ],
                    },
                    { name: "Strategic Planning Directorate" },
                    { name: "Human Resources Directorate" },
                ],
            },
        ],
    },
    {
        sectorId: "10000000-0000-4000-8000-000000000006",
        sectorKey: "alt-mom-midi",
        name: "Mining Industry Development Institute",
        description:
            "Mining Industry Development Institute under Alternative Minister of Mines — mining investment promotion, investor support, licensing facilitation, sector development, and project coordination.",
        departmentTree: [
            {
                name: ROOT_DIRECTOR_GENERAL,
                children: [
                    { name: "Director General Office" },
                    {
                        name: "Investment Promotion Department",
                        children: [
                            { name: "Domestic Investment Desk" },
                            { name: "Foreign Investment Desk" },
                        ],
                    },
                    {
                        name: "Licensing Department",
                        children: [
                            { name: "License Processing Desk" },
                            { name: "License Compliance Unit" },
                        ],
                    },
                    {
                        name: "Mineral Development Department",
                        children: [
                            { name: "Feasibility Studies Desk" },
                            { name: "Project Appraisal Unit" },
                        ],
                    },
                    {
                        name: "Investor Support Department",
                        children: [
                            { name: "Investor Help Desk" },
                            { name: "One-Stop Service Unit" },
                        ],
                    },
                    {
                        name: "Project Management Department",
                        children: [
                            { name: "Project Monitoring Desk" },
                            { name: "Project Coordination Unit" },
                        ],
                    },
                    { name: "Human Resources Directorate" },
                    { name: "Finance Directorate" },
                ],
            },
        ],
    },
];

module.exports = {
    PARENT_SECTOR_ID,
    PARENT_SECTOR_NAME,
    ROOT_DIRECTOR_GENERAL,
    INSTITUTES,
};
