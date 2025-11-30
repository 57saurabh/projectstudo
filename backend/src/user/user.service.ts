import { User, IUser } from './user.model';

export class UserService {
    public async getUserById(userId: string): Promise<IUser | null> {
        return await User.findById(userId).select('-password');
    }

    public async getUserByPrivateId(privateId: string): Promise<IUser | null> {
        return await User.findOne({ privateId }).select('-password');
    }

    public async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser | null> {
        // Prevent updating sensitive fields
        delete updateData.password;
        delete updateData.email;
        delete updateData.privateId;
        delete updateData._id;

        return await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    }
}
