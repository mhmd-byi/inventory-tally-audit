import mongoose from 'mongoose';

export interface IUser {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'store_manager' | 'auditor';
    organization?: mongoose.Types.ObjectId | any;
    organizations?: mongoose.Types.ObjectId[] | any[];
    warehouse?: mongoose.Types.ObjectId | any;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

declare const User: mongoose.Model<IUser>;
export default User;
