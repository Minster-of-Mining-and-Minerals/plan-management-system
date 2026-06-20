"use strict";

const { seedUsersForExistingOrganogram } = require("./utils/organogramSeederUtils");

module.exports = {
    async up(queryInterface) {
        const now = new Date();
        const result = await seedUsersForExistingOrganogram(queryInterface, { now });

        if (result.departments === 0) {
            console.log("No organogram departments found. Run a structure seeder first.");
            return;
        }

        console.log("Organogram demo users seeded (existing structure unchanged).");
        console.log(`  Departments in organogram: ${result.departments}`);
        console.log(`  Users created: ${result.usersCreated} (2 per department where missing)`);
        console.log(`  Departments skipped (already have users): ${result.skippedDepartments}`);
        console.log("  Password for new users: password");
        console.log("  Email pattern: {sector}.{department-path}.{role}@mom-demo.et");
    },

    async down() {
        console.log(
            "Undo not supported for organogram users seeder. Remove demo users manually if needed."
        );
    },
};
