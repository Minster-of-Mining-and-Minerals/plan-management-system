"use strict";

/**
 * Alternative Ministry of Mines institutional structure (2016 E.C.)
 * Parsed from backend/minster-office-organogram/MoM organogram.docx
 *
 * Excludes standalone institutes (Ethiopian Geological Institute, Mining Industry
 * Development Institute). All units report under a single root "Minister" node.
 */
const SECTOR_ID = "10000000-0000-4000-8000-000000000004";

const SECTOR_NAME = "Alternative Minister of Mines";

const ROOT_MINISTER_NAME = "Minister";

const SECTOR_DESCRIPTION =
    "Alternative institutional structure for the Ministry of Mines (2016 E.C.) — ministerial offices, state ministers, and supporting executive units under the Minister.";

const MINISTER_CHILDREN = [
    { name: "Ministry Advisors" },
    {
        name: "Chief Executive Officer",
        children: [
            { name: "Institutional Transformation Executive Officer" },
            { name: "Planning, Monitoring and Evaluation Executive Officer" },
            { name: "Women and Social Affairs Mainstreaming Executive Officer" },
            { name: "Capacity and Human Resource Development Executive Officer" },
            { name: "Information Communication Technology Executive Officer" },
            { name: "Procurement and Finance Executive Officer" },
            { name: "Basic Services Executive Officer" },
        ],
    },
    {
        name: "State Minister, Mineral Resources Development Sector",
        children: [
            {
                name: "Executive Lead, Mining Operations, Processing License and Administration",
                children: [
                    { name: "License Operations Administration Desk" },
                    { name: "Mining License Operations Desk" },
                ],
            },
            { name: "Ministry Deputy Advisor" },
            { name: "Environment and Community Development Desk" },
            {
                name: "Executive Lead, Mining Mega Projects",
                children: [
                    { name: "Head, Mega Project Monitoring and Support Desk (1)" },
                    { name: "Head, Mega Projects Desk" },
                    { name: "Head, Mega Project Monitoring and Support Desk (2)" },
                ],
            },
            {
                name: "Executive Lead, Mining Trade and Artisanal Mining Operations",
                children: [
                    { name: "Artisanal Mining Operations Desk" },
                    { name: "Mining Trade Operations Desk" },
                ],
            },
        ],
    },
    {
        name: "State Minister, Petroleum and Geothermal Resources Sector",
        children: [
            { name: "Head, Promotion Desk" },
            { name: "Executive Officer, Petroleum License and Administration" },
            {
                name: "Executive Lead, Petroleum Mega Projects",
                children: [
                    { name: "Head, Mega Projects Desk" },
                    { name: "Head, Mega Project Monitoring and Support Desk (2)" },
                    { name: "Head, Mega Project Monitoring and Support Desk (1)" },
                ],
            },
            { name: "Executive Officer, Geothermal License and Administration" },
            { name: "Ministry Deputy Advisor" },
        ],
    },
    {
        name: "Minister's Office",
        children: [
            { name: "Ethics and Anti-Corruption Executive Officer" },
            { name: "Internal Audit Executive Officer" },
            { name: "Public Relations and Communication Executive Officer" },
            { name: "Legal Affairs Executive Officer" },
        ],
    },
];

/** Single root "Minister" node wrapping all organogram units (except excluded institutes). */
const DEPARTMENT_TREE = [
    {
        name: ROOT_MINISTER_NAME,
        children: MINISTER_CHILDREN,
    },
];

module.exports = {
    SECTOR_ID,
    SECTOR_NAME,
    ROOT_MINISTER_NAME,
    SECTOR_DESCRIPTION,
    DEPARTMENT_TREE,
};
