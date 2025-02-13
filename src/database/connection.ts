import mongoose from 'mongoose';
import config from '../config/env.config';
export const connect = (): void => {
    // Local MongoDB connection URL
    if (!config.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined in environment configuration');
    }
   
    mongoose.connect(config.DATABASE_URL).then(() => {
        console.log('Database connected');
    }).catch(err => {
        console.error('Database connection error:', err);
    });
};

    

    
