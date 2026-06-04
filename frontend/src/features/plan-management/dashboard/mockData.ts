import type {
  MockDepartment,
  MockPlanNode,
  MockStructure,
  MockUser,
} from "./types";

export const MOCK_STRUCTURES: MockStructure[] = [
  {
    id: "struct-mom",
    name: "Ministry of Mines",
    code: "MoM",
    totalPlans: 48,
    completionPercent: 72,
    activeDepartments: 12,
    performance: "good",
    departmentIds: ["dept-midi-inv", "dept-midi-lic", "dept-gie-geo"],
    userIds: ["user-1", "user-2", "user-3", "user-4", "user-5"],
  },
  {
    id: "struct-midi",
    name: "MIDI",
    code: "MIDI",
    totalPlans: 28,
    completionPercent: 68,
    activeDepartments: 6,
    performance: "good",
    departmentIds: ["dept-midi-inv", "dept-midi-lic"],
    userIds: ["user-1", "user-2", "user-3"],
  },
  {
    id: "struct-gie",
    name: "GIE",
    code: "GIE",
    totalPlans: 20,
    completionPercent: 81,
    activeDepartments: 4,
    performance: "excellent",
    departmentIds: ["dept-gie-geo"],
    userIds: ["user-4", "user-5"],
  },
];

export const MOCK_DEPARTMENTS: MockDepartment[] = [
  {
    id: "dept-midi-inv",
    name: "Investment Promotion",
    structureId: "struct-midi",
    planCount: 14,
    progress: 74,
    status: "active",
    userIds: ["user-1", "user-2"],
  },
  {
    id: "dept-midi-lic",
    name: "Licensing",
    structureId: "struct-midi",
    planCount: 14,
    progress: 62,
    status: "delayed",
    userIds: ["user-3"],
  },
  {
    id: "dept-gie-geo",
    name: "Geological Survey",
    structureId: "struct-gie",
    planCount: 20,
    progress: 81,
    status: "active",
    userIds: ["user-4", "user-5"],
  },
];

export const MOCK_USERS: MockUser[] = [
  {
    id: "user-1",
    name: "Alemayehu Bekele",
    role: "Plan Coordinator",
    departmentId: "dept-midi-inv",
    structureId: "struct-midi",
    performance: "excellent",
    activityScore: 94,
  },
  {
    id: "user-2",
    name: "Sara Tadesse",
    role: "Department Lead",
    departmentId: "dept-midi-inv",
    structureId: "struct-midi",
    performance: "good",
    activityScore: 86,
  },
  {
    id: "user-3",
    name: "Daniel Hailu",
    role: "Licensing Officer",
    departmentId: "dept-midi-lic",
    structureId: "struct-midi",
    performance: "average",
    activityScore: 71,
  },
  {
    id: "user-4",
    name: "Meron Assefa",
    role: "Survey Analyst",
    departmentId: "dept-gie-geo",
    structureId: "struct-gie",
    performance: "excellent",
    activityScore: 91,
  },
  {
    id: "user-5",
    name: "Yonas Mekonnen",
    role: "Field Supervisor",
    departmentId: "dept-gie-geo",
    structureId: "struct-gie",
    performance: "good",
    activityScore: 78,
  },
];

export const MOCK_PLAN_TREE: MockPlanNode[] = [
  {
    id: "plan-1",
    title: "National Mining Development Plan",
    sharingMode: "shared",
    progress: 68,
    status: "active",
    children: [
      {
        id: "plan-1-1",
        title: "Increase Mineral Production",
        sharingMode: "shared",
        progress: 72,
        status: "active",
        children: [
          {
            id: "plan-1-1-1",
            title: "Improve Licensing Efficiency (MIDI)",
            sharingMode: "exclusive",
            progress: 58,
            status: "delayed",
          },
          {
            id: "plan-1-1-2",
            title: "Expand Exploration Capacity (GIE)",
            sharingMode: "shared",
            progress: 84,
            status: "active",
          },
        ],
      },
    ],
  },
];

export const MOCK_KPI_SUMMARY = {
  totalPlans: 48,
  activePlans: 32,
  completedPlans: 11,
  sharedPlans: 19,
  exclusivePlans: 29,
  averageProgress: 72,
};

export const MOCK_SHARED_PLANS = [
  { id: "s1", title: "Increase Mineral Production", branches: 2, progress: 72, status: "active" as const },
  { id: "s2", title: "Expand Exploration Capacity", branches: 2, progress: 84, status: "active" as const },
  { id: "s3", title: "Regional Capacity Building", branches: 3, progress: 61, status: "delayed" as const },
];

export const MOCK_EXCLUSIVE_PLANS = [
  { id: "e1", title: "Improve Licensing Efficiency", target: "MIDI", progress: 58, status: "delayed" as const },
  { id: "e2", title: "Single-Sector Audit Trail", target: "GIE", progress: 90, status: "active" as const },
  { id: "e3", title: "Dedicated Budget Unit Plan", target: "MIDI", progress: 100, status: "completed" as const },
];
