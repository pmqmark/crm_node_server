import mongoose from 'mongoose';

export const connect = (): void => {
    // Local MongoDB connection URL
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is not defined in environment configuration');
    }
   
    mongoose.connect(process.env.DATABASE_URL).then(() => {
        console.log('Database connected');
    }).catch(err => {
        console.error('Database connection error:', err);
    });
};