import { generateHumorousUsername } from '../utils/usernameGenerator';

// ... (imports)

export class AuthService {
    async signup(userData: any) {
        const { email, password, displayName } = userData;

        // Check if user exists by email
        const existingEmail = await UserModel.findOne({ email });
        if (existingEmail) {
            throw new Error('Email is already registered');
        }

        // Auto-generate Unique Username
        let username = userData.username;

        // Always generate a new unique username as per requirement
        // "every time when user create always create new unique and humaruos username"
        let isUnique = false;
        while (!isUnique) {
            username = generateHumorousUsername();
            const existing = await UserModel.findOne({ username });
            if (!existing) {
                isUnique = true;
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new UserModel({
            email,
            password: hashedPassword,
            displayName: displayName || username,
            username, // Use the generated username
            privateId: uuidv4(),
            status: 'online',
            lastActive: Date.now()
        });

        await newUser.save();

        // Generate Token
        const token = this.generateToken(newUser);

        return { user: newUser, token };
    }

    async login(credentials: any) {
        const { email, password } = credentials;

        // Find user
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Update status
        user.status = 'online';
        user.lastActive = Date.now();
        await user.save();

        // Generate Token
        const token = this.generateToken(user);

        return { user, token };
    }

    private generateToken(user: any) {
        return jwt.sign(
            { id: user._id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
    }
}
