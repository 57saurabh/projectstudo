import { UserModel } from '../models/User';

export class UsersService {
    async getUserProfile(userId: string) {
        const user = await UserModel.findById(userId).select('-password');
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
