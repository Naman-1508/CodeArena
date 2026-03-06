import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import { connectDB } from './config/db.js';
import Problem from './models/Problem.js';

async function seedBulk() {
    await connectDB();

    console.log('Loading bulk problems from JSON...');
    const rawData = fs.readFileSync('leetcode_problems.json', 'utf8');
    const problems = JSON.parse(rawData);

    console.log(`Found ${problems.length} problems. Inserting into CodeArena database...`);

    // We do NOT delete the existing 13 manual problems (which have actual testcases).
    // Let's use ordered: false to skip duplicates (by slug) smoothly if they exist.
    try {
        await Problem.insertMany(problems, { ordered: false });
        console.log('Successfully inserted bulk problems!');
    } catch (err) {
        // Mongoose throws error on duplicates if unique constraints fail
        if (err.code === 11000) {
            console.log('Inserted bulk problems (some skipped due to duplicate slugs).');
        } else {
            console.error('Error inserting problems:', err.message);
        }
    }

    // Verify total
    const totalCount = await Problem.countDocuments();
    console.log(`Total Problems in CodeArena Database: ${totalCount}`);

    process.exit(0);
}

seedBulk().catch(err => {
    console.error(err);
    process.exit(1);
});
