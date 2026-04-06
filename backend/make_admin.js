import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from './src/models/User.js';

const makeAdmin = async () => {
    const username = process.argv[2];
    
    if (!username) {
        console.error('Please provide a username: node make_admin.js <username>');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/codearena');

        const user = await User.findOne({ username });
        
        if (!user) {
            console.error(`User '${username}' not found in the database.`);
            process.exit(1);
        }

        user.role = 'Admin';
        await user.save();
        
        console.log(`Success! '${username}' has been promoted to Admin role.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

makeAdmin();
