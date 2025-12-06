'use client';

import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { IUser as User, PROFESSION_TYPES } from '@/models/User';
import WebcamCapture from '@/components/profile/WebcamCapture';
import {
    Camera,
    Save,
    Loader2,
    User as UserIcon,
    Globe,
    Briefcase,
    Hash,
    XCircle,
    Shield,
    CheckCircle,
    X
} from 'lucide-react';
import axios from 'axios';
import { setUser } from '@/lib/store/authSlice';
import {
    COUNTRIES,
    UNIVERSITIES_LIST,
    COUNTRY_LANGUAGES_MAPPING,
    LANGUAGE_FLAGS
} from '@/lib/constants';
import Image from 'next/image';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import Input from '@/components/ui/Input';

interface EditProfileFormProps {
    user: User;
    onCancel: () => void;
    onSuccess: (updatedUser: User) => void;
}

export default function EditProfileForm({ user, onCancel, onSuccess }: EditProfileFormProps) {
    const dispatch = useDispatch();

    const [formData, setFormData] = useState<Partial<User>>({});
    const [isCapturing, setIsCapturing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [customInterest, setCustomInterest] = useState('');
    const [universitySearch, setUniversitySearch] = useState('');
    const [showUniSuggestions, setShowUniSuggestions] = useState(false);

    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

    // Debounce checking for username
    useEffect(() => {
        const checkUsername = async () => {
            if (!formData.username || formData.username === user.username) {
                setUsernameStatus('idle');
                setUsernameSuggestions([]);
                return;
            }
            setUsernameStatus('checking');
            try {
                const res = await axios.get(`/api/users/check-username?username=${formData.username}`);
                setUsernameStatus(res.data.available ? 'available' : 'taken');
                if (!res.data.available && res.data.suggestions) {
                    setUsernameSuggestions(res.data.suggestions);
                } else {
                    setUsernameSuggestions([]);
                }
            } catch (err) {
                setUsernameStatus('idle');
            }
        };

        const timer = setTimeout(checkUsername, 500);
        return () => clearTimeout(timer);
    }, [formData.username, user.username]);

    useEffect(() => {
        if (!user) return;

        setFormData({
            displayName: user.displayName,
            username: user.username,
            bio: user.bio,
            website: user.website,
            profession: user.profession || { type: 'Looking for Opportunities' },
            gender: user.gender,
            age: user.age,
            country: user.country,
            avatarUrl: user.avatarUrl,
            interests: user.interests || [],
            email: user.email,

            preferences: {
                ...user.preferences,
                region: user.preferences?.region || [],
                languages: user.preferences?.languages || [],
                languageCountries: user.preferences?.languageCountries || [],
                matchGender: user.preferences?.matchGender || 'any'
            },

            privacy: {
                isPrivate: user.privacy?.isPrivate || false,
                allowMessagesFrom: user.privacy?.allowMessagesFrom || 'everyone',
                allowStoryRepliesFrom: user.privacy?.allowStoryRepliesFrom || 'everyone',
                allowTagging: user.privacy?.allowTagging || 'everyone',
                twoFactorEnabled: user.privacy?.twoFactorEnabled || false
            }
        });

        setUniversitySearch(user.profession?.university || '');
    }, [user]);

    // -----------------------------
    // GENERIC INPUT HANDLER
    // -----------------------------
    const handleInputChange = (e: any) => {
        const { name, value } = e.target;

        // profession type (top-level but inside object)
        if (name === "professionType") {
            setFormData(prev => ({
                ...prev,
                profession: { ...(prev.profession || {}), type: value } as any
            }));
            return;
        }

        // preferences nested fields
        if (name.startsWith("preferences.")) {
            const key = name.split(".")[1];
            setFormData(prev => ({
                ...prev,
                preferences: {
                    ...(prev.preferences || {}),
                    [key]: value
                } as any
            }));
            return;
        }

        // privacy nested fields
        if (name.startsWith("privacy.")) {
            const key = name.split(".")[1];
            setFormData(prev => ({
                ...prev,
                privacy: {
                    ...(prev.privacy || { isPrivate: false, allowMessagesFrom: 'everyone', allowStoryRepliesFrom: 'everyone', allowTagging: 'everyone', twoFactorEnabled: false }),
                    [key]: value === "true" ? true : value === "false" ? false : value
                } as any
            }));
            return;
        }

        // fallback: normal top-level field
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAvatarCapture = (imageSrc: string) => {
        setFormData(prev => ({ ...prev, avatarUrl: imageSrc }));
        setIsCapturing(false);
    };

    // -----------------------------
    // INTERESTS
    // -----------------------------
    const addInterest = (interest: string) => {
        if (!interest.trim()) return;

        const current = formData.interests || [];
        if (!current.includes(interest)) {
            setFormData(prev => ({
                ...prev,
                interests: [...current, interest.trim()]
            }));
        }
        setCustomInterest('');
    };

    const removeInterest = (interest: string) => {
        setFormData(prev => ({
            ...prev,
            interests: (prev.interests || []).filter(i => i !== interest)
        }));
    };

    // -----------------------------
    // UNIVERSITY AUTOCOMPLETE
    // -----------------------------
    const handleUniversityChange = (e: any) => {
        const value = e.target.value;
        setUniversitySearch(value);
        setShowUniSuggestions(true);
    };

    const selectUniversity = (uni: string) => {
        setUniversitySearch(uni);
        setFormData(prev => ({
            ...prev,
            profession: { ...(prev.profession || {}), university: uni } as any
        }));
        setShowUniSuggestions(false);
    };

    const handleUniversityBlur = () => {
        setTimeout(() => {
            setShowUniSuggestions(false);
        }, 200);
    };

    // -----------------------------
    // REGION LOGIC
    // -----------------------------
    const toggleRegion = (region: string) => {
        const current = formData.preferences?.region || [];
        const next = current.includes(region)
            ? current.filter(r => r !== region)
            : [...current, region];

        setFormData(prev => ({
            ...prev,
            preferences: { ...(prev.preferences || {}), region: next } as any
        }));
    };

    // ======================================================
    // 🔥 CLEAN PROFESSION + PREFERENCES BEFORE SUBMITTING
    // ======================================================
    const buildCleanPayload = () => {
        const prof = (formData.profession || {}) as any;
        const type = prof.type;

        let cleanProfession: any = { type };

        // Students
        if (["Student", "Medical Student"].includes(type)) {
            if (UNIVERSITIES_LIST.includes(universitySearch)) {
                cleanProfession.university = universitySearch;
            }
            if (prof.hospital) cleanProfession.hospital = prof.hospital;
        }

        // Medical
        else if (["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"].includes(type)) {
            cleanProfession.hospital = prof.hospital || "";
        }

        // Corporate
        else if (
            [
                "Software Engineer", "Full-Stack Developer", "Backend Developer", "Frontend Developer",
                "Mobile Developer", "Game Developer", "AI Engineer", "ML Engineer", "Data Analyst",
                "Data Scientist", "Cybersecurity Analyst", "DevOps Engineer", "Cloud Engineer",
                "UI/UX Designer", "Product Designer", "Graphic Designer", "Animator", "Video Editor",
                "Photographer", "Videographer", "Content Creator", "Influencer", "Blogger", "Writer",
                "Editor", "Architect", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
                "Technician", "Mechanic", "Marketing Specialist", "HR Executive", "Operations Manager",
                "Accountant", "Banker", "Business Analyst", "Entrepreneur", "Founder", "Freelancer",
                "Self-Employed"
            ].includes(type)
        ) {
            cleanProfession.company = prof.company || "";
        }

        // Occupation Place
        else if (!["Unemployed", "Looking for Opportunities", "Homemaker"].includes(type)) {
            cleanProfession.occupationPlace = prof.occupationPlace || "";
        }

        // -----------------------------
        // PREFERENCES CLEAN
        // -----------------------------
        const allowedPrefKeys = [
            "matchGender",
            "matchRegion",
            "minAge",
            "maxAge",
            "region",
            "languages",
            "languageCountries"
        ];

        let cleanPreferences: any = {};
        if (formData.preferences) {
            for (const key of allowedPrefKeys) {
                if (key in formData.preferences) {
                    cleanPreferences[key] = (formData.preferences as any)[key];
                }
            }
        }

        if (
            Object.keys(cleanPreferences).length === 0 ||
            Object.values(cleanPreferences).every(
                (v) =>
                    v === "" ||
                    v === null ||
                    v === undefined ||
                    (Array.isArray(v) && v.length === 0)
            )
        ) {
            cleanPreferences = undefined;
        }

        // -----------------------------
        // FINAL PAYLOAD
        // -----------------------------
        return {
            ...formData,
            profession: cleanProfession,
            preferences: cleanPreferences
        };
    };

    // ======================================================
    // SUBMIT FORM
    // ======================================================
    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const payload = buildCleanPayload();

            // We assume this component is used by the logged-in user, so we use the token from store if available,
            // but here we might not have direct access to token if not passed.
            // However, axios interceptors usually handle token if set.
            // Let's assume the parent handles auth check or axios is configured.
            // Wait, the original code used `token` from redux. I should probably get it here too.
            // But for now let's rely on the fact that we are editing "me".

            const token = localStorage.getItem('token');
            const res = await axios.put("/api/user/me", payload, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            dispatch(setUser(res.data));
            setMessage({ type: "success", text: "Profile updated successfully!" });
            onSuccess(res.data);
        } catch (err: any) {
            console.error("Update error:", err);
            setMessage({
                type: "error",
                text: err.response?.data?.message || "Failed to update profile."
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* MESSAGES */}
            {message && (
                <div
                    className={`mb-6 p-4 rounded-2xl font-bold border flex items-center gap-3 ${message.type === "success"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                >
                    {message.type === "success" ? <Shield size={20} /> : <XCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ===================
                    LEFT COLUMN (AVATAR)
                =================== */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-surface border border-border rounded-3xl p-8 flex flex-col items-center text-center shadow-sm">
                        <div className="relative w-48 h-48 rounded-3xl overflow-hidden border-4 border-gold bg-surface group shadow-gold-glow mb-6">
                            {formData.avatarUrl ? (
                                <img
                                    src={formData.avatarUrl}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gold">
                                    <UserIcon size={64} />
                                </div>
                            )}

                            <div
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm"
                                onClick={() => setIsCapturing(true)}
                            >
                                <Camera className="text-gold" size={40} />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black text-primary">
                            {formData.displayName || user?.displayName || "User"}
                        </h2>
                        <p className="text-text-muted font-medium">
                            @{formData.username || user?.username || "username"}
                        </p>

                        <button
                            type="button"
                            onClick={() => setIsCapturing(true)}
                            className="mt-6 text-gold font-bold hover:text-gold-hover transition-colors flex items-center gap-2 bg-gold/10 px-4 py-2 rounded-xl"
                        >
                            <Camera size={18} />
                            Change Photo
                        </button>

                        {isCapturing && (
                            <WebcamCapture
                                onCapture={handleAvatarCapture}
                                onCancel={() => setIsCapturing(false)}
                            />
                        )}
                    </div>
                </div>

                {/* ===================
                    RIGHT COLUMN (FORM SECTIONS)
                =================== */}
                <div className="lg:col-span-8 space-y-8">

                    {/* CARD 1: BASIC INFO */}
                    <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-surface-hover/30">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                <UserIcon size={24} className="text-gold" />
                                Basic Information
                            </h2>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Display Name"
                                icon={UserIcon}
                                type="text"
                                name="displayName"
                                value={formData.displayName || ""}
                                onChange={handleInputChange}
                                placeholder="Your Name"
                            />
                            <Input
                                label="Username"
                                icon={Hash}
                                type="text"
                                name="username"
                                value={formData.username || ""}
                                onChange={(e) => {
                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
                                    handleInputChange({ target: { name: 'username', value: val } });
                                }}
                                placeholder="username"
                                rightElement={
                                    usernameStatus === 'checking' ? (
                                        <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                    ) : usernameStatus === 'available' ? (
                                        <div className="text-green-500 text-xs font-bold">OK</div>
                                    ) : usernameStatus === 'taken' ? (
                                        <div className="text-danger text-xs font-bold">Taken</div>
                                    ) : null
                                }
                            />
                            {/* Suggestions for Edit Profile */}
                            {usernameStatus === 'taken' && usernameSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-xs text-text-muted">Try:</span>
                                    {usernameSuggestions.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => handleInputChange({ target: { name: 'username', value: s } })}
                                            className="text-xs bg-surface-hover border border-border px-2 py-1 rounded-full text-text-secondary hover:text-gold hover:border-gold transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <Input
                                label="Email"
                                icon={UserIcon}
                                disabled={true}
                                type="email"
                                name="email"
                                value={formData.email || ""}
                                onChange={() => { }}
                                placeholder="Email"
                            />
                            <Input
                                label="Website"
                                icon={Globe}
                                type="url"
                                name="website"
                                value={formData.website || ""}
                                onChange={handleInputChange}
                                placeholder="https://yourwebsite.com"
                            />

                            <div className="md:col-span-2">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio || ""}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="w-full bg-surface-hover/50 border border-border rounded-2xl px-5 py-4 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all placeholder:text-text-muted/50 resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">Gender</label>
                                <select
                                    name="gender"
                                    value={formData.gender || ""}
                                    onChange={handleInputChange}
                                    className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">Country</label>
                                <select
                                    name="country"
                                    value={formData.country || ""}
                                    onChange={handleInputChange}
                                    className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                >
                                    <option value="">Select Country</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <Input
                                label="Age"
                                type="number"
                                name="age"
                                value={formData.age || ""}
                                onChange={handleInputChange}
                                placeholder="25"
                            />
                        </div>
                    </section>

                    {/* CARD 2: PROFESSION */}
                    <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-surface-hover/30">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                <Briefcase size={24} className="text-orange" />
                                Profession & Work
                            </h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">
                                    Current Role
                                </label>
                                <select
                                    name="professionType"
                                    value={(formData.profession as any)?.type || ""}
                                    onChange={handleInputChange}
                                    className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                >
                                    <option value="">Select Profession</option>
                                    {PROFESSION_TYPES.map(p => (
                                        <option key={p} value={p}>
                                            {p}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* CONDITIONAL PROFESSION FIELDS */}
                            {(() => {
                                const type = (formData.profession as any)?.type;
                                if (!type) return null;

                                if (["Student", "Medical Student"].includes(type)) {
                                    return (
                                        <Input
                                            label="University / College"
                                            icon={Briefcase}
                                            type="text"
                                            value={universitySearch}
                                            onChange={handleUniversityChange}
                                            onBlur={handleUniversityBlur}
                                            placeholder="Search University..."
                                        />
                                    );
                                }

                                if (["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"].includes(type)) {
                                    return (
                                        <Input
                                            label="Hospital / Clinic"
                                            icon={Briefcase}
                                            type="text"
                                            value={(formData.profession as any)?.hospital || ""}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    profession: {
                                                        ...(prev.profession || {}),
                                                        hospital: e.target.value
                                                    } as any
                                                }))
                                            }
                                            placeholder="Hospital Name"
                                        />
                                    );
                                }

                                const corporate = [
                                    "Software Engineer", "Full-Stack Developer", "Backend Developer",
                                    "Frontend Developer", "Mobile Developer", "Game Developer",
                                    "AI Engineer", "ML Engineer", "Data Analyst", "Data Scientist",
                                    "Cybersecurity Analyst", "DevOps Engineer", "Cloud Engineer",
                                    "UI/UX Designer", "Product Designer", "Graphic Designer",
                                    "Animator", "Video Editor", "Photographer", "Videographer",
                                    "Content Creator", "Influencer", "Blogger", "Writer", "Editor",
                                    "Architect", "Civil Engineer", "Mechanical Engineer",
                                    "Electrical Engineer", "Technician", "Mechanic",
                                    "Marketing Specialist", "HR Executive", "Operations Manager",
                                    "Accountant", "Banker", "Business Analyst",
                                    "Entrepreneur", "Founder", "Freelancer", "Self-Employed"
                                ];

                                if (corporate.includes(type)) {
                                    return (
                                        <Input
                                            label="Company / Organization"
                                            icon={Briefcase}
                                            type="text"
                                            value={(formData.profession as any)?.company || ""}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    profession: {
                                                        ...(prev.profession || {}),
                                                        company: e.target.value
                                                    } as any
                                                }))
                                            }
                                            placeholder="Company Name"
                                        />
                                    );
                                }

                                if (!["Unemployed", "Looking for Opportunities", "Homemaker"].includes(type)) {
                                    return (
                                        <Input
                                            label="Workplace / Location"
                                            icon={Briefcase}
                                            type="text"
                                            value={(formData.profession as any)?.occupationPlace || ""}
                                            onChange={(e) =>
                                                setFormData(prev => ({
                                                    ...prev,
                                                    profession: {
                                                        ...(prev.profession || {}),
                                                        occupationPlace: e.target.value
                                                    } as any
                                                }))
                                            }
                                            placeholder="Where do you work?"
                                        />
                                    );
                                }

                                return null;
                            })()}
                        </div>
                    </section>

                    {/* CARD 3: PREFERENCES */}
                    <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-surface-hover/30">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                <Globe size={24} className="text-blue-400" />
                                Match Preferences
                            </h2>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">Match Gender</label>
                                    <select
                                        name="preferences.matchGender"
                                        value={formData.preferences?.matchGender || "any"}
                                        onChange={handleInputChange}
                                        className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                    >
                                        <option value="any">Any</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">Match Region</label>
                                    <select
                                        name="preferences.matchRegion"
                                        value={formData.preferences?.matchRegion || "global"}
                                        onChange={handleInputChange}
                                        className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                    >
                                        <option value="global">Global</option>
                                        <option value="same-country">Same Country Only</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <Input
                                    label="Min Age"
                                    type="number"
                                    name="preferences.minAge"
                                    value={formData.preferences?.minAge || ""}
                                    onChange={handleInputChange}
                                    placeholder="18"
                                />
                                <Input
                                    label="Max Age"
                                    type="number"
                                    name="preferences.maxAge"
                                    value={formData.preferences?.maxAge || ""}
                                    onChange={handleInputChange}
                                    placeholder="30"
                                />
                            </div>

                            <MultiSelectDropdown
                                label="Region Preference"
                                placeholder="Select regions..."
                                options={COUNTRIES.map(c => ({ value: c, label: c }))}
                                selectedValues={formData.preferences?.region || []}
                                onChange={(newRegions: string[]) =>
                                    setFormData(prev => ({
                                        ...prev,
                                        preferences: { ...prev.preferences, region: newRegions } as any
                                    }))
                                }
                            />

                            {/* Language Countries (Flag Selector) */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider block">
                                    Language Countries
                                </label>

                                <MultiSelectDropdown
                                    label=""
                                    placeholder="Select countries..."
                                    options={LANGUAGE_FLAGS.map(lf => ({
                                        value: lf.country,
                                        label: lf.country,
                                        flag: lf.flag,
                                    }))}
                                    selectedValues={formData.preferences?.languageCountries || []}
                                    onChange={(newCountries: string[]) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            preferences: {
                                                ...(prev.preferences || {}),
                                                languageCountries: newCountries,
                                                // We don't auto-select languages anymore, but we might want to clean up
                                                // languages that are no longer available if a country is removed?
                                                // The user's requirement "Auto-remove Country if all its languages are removed"
                                                // implies the reverse.
                                                // For now, let's keep existing languages.
                                                // Actually, if a country is removed, maybe we should remove its languages?
                                                // But the user might have selected a language that is also in another selected country.
                                                // Let's just update countries here.
                                            } as any
                                        }));
                                    }}
                                />

                                <p className="text-xs text-text-muted font-medium">
                                    Select regions to reveal available languages.
                                </p>
                            </div>

                            {/* Available Languages Selection */}
                            {(formData.preferences?.languageCountries || []).length > 0 && (
                                <div className="bg-surface-hover/30 border border-border rounded-xl p-4">
                                    <p className="text-[10px] text-text-muted uppercase font-bold mb-3">Select Languages</p>
                                    <div className="flex flex-wrap gap-2">
                                        {(() => {
                                            const availableLanguages = new Set<string>();
                                            (formData.preferences?.languageCountries || []).forEach(c => {
                                                const mapping = (COUNTRY_LANGUAGES_MAPPING as any)[c];
                                                if (mapping) {
                                                    mapping.languages.forEach((l: string) => availableLanguages.add(l));
                                                }
                                            });

                                            if (availableLanguages.size === 0) return <p className="text-xs text-text-muted italic">No languages found for selected regions.</p>;

                                            const toggleLanguage = (langToToggle: string) => {
                                                setFormData(prev => {
                                                    const currentLangs = prev.preferences?.languages || [];
                                                    let newLangs;
                                                    let newCountries = prev.preferences?.languageCountries || [];

                                                    const isSelected = currentLangs.includes(langToToggle);

                                                    if (isSelected) {
                                                        // Remove language
                                                        newLangs = currentLangs.filter(l => l !== langToToggle);
                                                    } else {
                                                        // Add language
                                                        newLangs = [...currentLangs, langToToggle];
                                                    }

                                                    // Smart Cleanup: Remove country if all its languages are deselected
                                                    newCountries = newCountries.filter(c => {
                                                        const cLangs = (COUNTRY_LANGUAGES_MAPPING as any)[c]?.languages || [];
                                                        // Keep country if it has no mapped langs (edge case) OR if it still has at least one selected language
                                                        return cLangs.length === 0 || cLangs.some((l: string) => newLangs.includes(l));
                                                    });

                                                    return {
                                                        ...prev,
                                                        preferences: {
                                                            ...(prev.preferences || {}),
                                                            languages: newLangs,
                                                            languageCountries: newCountries
                                                        } as any
                                                    };
                                                });
                                            };

                                            return Array.from(availableLanguages).map(lang => {
                                                const isSelected = (formData.preferences?.languages || []).includes(lang);
                                                return (
                                                    <button
                                                        key={lang}
                                                        type="button"
                                                        onClick={() => toggleLanguage(lang)}
                                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${isSelected
                                                            ? 'bg-gold/10 text-gold border-gold/50 shadow-sm'
                                                            : 'bg-surface border-border text-text-secondary hover:border-gold/30 hover:text-gold'
                                                            }`}
                                                    >
                                                        {lang}
                                                        {isSelected && <CheckCircle size={12} />}
                                                    </button>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Languages Included Summary */}
                            {(formData.preferences?.languages || []).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] text-text-muted uppercase font-bold">Languages Included</p>

                                    <div className="flex flex-wrap gap-2 p-4 bg-surface-hover/20 border border-border rounded-2xl min-h-[60px]">
                                        {(formData.preferences?.languages || []).map(lang => (
                                            <span
                                                key={lang}
                                                className="px-3 py-1.5 rounded-full bg-[#2A2418] text-gold border border-gold/30 text-xs font-bold flex items-center gap-2 shadow-sm"
                                            >
                                                {lang}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => {
                                                            const newLangs = (prev.preferences?.languages || []).filter(l => l !== lang);
                                                            // Smart Cleanup
                                                            const newCountries = (prev.preferences?.languageCountries || []).filter(c => {
                                                                const cLangs = (COUNTRY_LANGUAGES_MAPPING as any)[c]?.languages || [];
                                                                return cLangs.length === 0 || cLangs.some((l: string) => newLangs.includes(l));
                                                            });

                                                            return {
                                                                ...prev,
                                                                preferences: {
                                                                    ...(prev.preferences || {}),
                                                                    languages: newLangs,
                                                                    languageCountries: newCountries
                                                                } as any
                                                            };
                                                        });
                                                    }}
                                                    className="hover:text-danger hover:bg-danger/10 rounded-full p-0.5 transition-colors"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* INTERESTS */}
                            <div className="space-y-4">
                                <label className="text-sm font-bold text-text-muted uppercase tracking-wider block">Interests</label>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    {(formData.interests || []).map(i => (
                                        <span key={i} className="px-3 py-1 bg-gold/10 text-gold rounded-full flex items-center gap-2 font-medium">
                                            {i}
                                            <button type="button" onClick={() => removeInterest(i)} className="hover:text-red-400 transition-colors">
                                                <XCircle size={14} />
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customInterest}
                                        onChange={(e) => setCustomInterest(e.target.value)}
                                        className="flex-1 bg-surface-hover/50 border border-border rounded-2xl px-4 py-3 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                                        placeholder="Add interest..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => addInterest(customInterest)}
                                        className="bg-gold text-white px-6 py-3 rounded-2xl font-bold hover:bg-gold-hover transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* CARD 4: PRIVACY */}
                    <section className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-border bg-surface-hover/30">
                            <h2 className="text-xl font-bold flex items-center gap-3 text-primary">
                                <Shield size={24} className="text-green-400" />
                                Privacy Settings
                            </h2>
                        </div>
                        <div className="p-8">
                            <label className="text-sm font-bold text-text-muted uppercase tracking-wider mb-2 block">Profile Visibility</label>
                            <select
                                name="privacy.isPrivate"
                                value={formData.privacy?.isPrivate ? "true" : "false"}
                                onChange={handleInputChange}
                                className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                            >
                                <option value="false">Public (Everyone can see your profile)</option>
                                <option value="true">Private (Only followers can see your profile)</option>
                            </select>
                        </div>
                    </section>

                    {/* BOTTOM ACTION BUTTONS */}
                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-border">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 rounded-2xl font-bold text-text-secondary hover:bg-surface-hover transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || usernameStatus === 'taken'}
                            className="bg-gold hover:bg-gold-hover text-primary px-8 py-3 rounded-2xl font-bold shadow-gold-glow transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
