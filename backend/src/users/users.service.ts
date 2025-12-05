import { UserModel, IUser } from '../models/User';

export class UsersService {
    async getUserProfile(userId: string) {
        const user = await UserModel.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async updateUser(userId: string, updates: Partial<IUser>) {
        const user = await UserModel.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async searchUsers(query: string) {
        if (!query) return [];

        const users = await UserModel.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { displayName: { $regex: query, $options: 'i' } }
            ]
        }).select('displayName username avatarUrl _id').limit(10);

        return users;
    }
}
