import { User, IUser } from './user.model';

export class UserService {
    public async getUserById(userId: string): Promise<IUser | null> {
        return await User.findById(userId).select('-password');
    }

    public async getUserByPrivateId(privateId: string): Promise<IUser | null> {
        return await User.findOne({ privateId }).select('-password');
    }
}
