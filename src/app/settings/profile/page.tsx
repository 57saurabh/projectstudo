'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { IUser as User } from '@/models/User';
import WebcamCapture from '@/components/profile/WebcamCapture';
import { Camera, Save, Loader2, User as UserIcon, Globe, Briefcase, Hash, ArrowLeft, XCircle } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { setUser } from '@/lib/store/authSlice';
import { COUNTRIES, LANGUAGES, INTERESTS_LIST, UNIVERSITIES_LIST, COUNTRY_LANGUAGES_MAPPING, LANGUAGE_FLAGS } from '@/lib/constants';
import Image from 'next/image';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';

export default function ProfilePage() {
    const { user, token } = useSelector((state: RootState) => state.auth);
    const dispatch = useDispatch();

    const [formData, setFormData] = useState<Partial<User>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // New State for custom inputs
    const [customInterest, setCustomInterest] = useState('');
    const [universitySearch, setUniversitySearch] = useState('');
    const [showUniSuggestions, setShowUniSuggestions] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName,
                username: user.username,
                bio: user.bio,
                website: user.website,
                profession: user.profession,
                gender: user.gender,
                age: user.age,
                country: user.country, // Residence
                region: user.region || [], // Matching Preference (Array)
                university: user.university,
                interests: user.interests || [],
                languages: user.languages || [],
                languageCountries: user.languageCountries || [], // Selected flags
                avatarUrl: user.avatarUrl
            });
            setUniversitySearch(user.university || '');
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev: Partial<User>) => ({ ...prev, [name]: value }));
    };

    const handleAvatarCapture = (imageSrc: string) => {
        setFormData((prev: Partial<User>) => ({ ...prev, avatarUrl: imageSrc }));
        setIsCapturing(false);
    };

    // --- Interests Logic ---
    const addInterest = (interest: string) => {
        if (!interest.trim()) return;
        const currentInterests = formData.interests || [];
        if (!currentInterests.includes(interest.trim())) {
            setFormData(prev => ({ ...prev, interests: [...(prev.interests || []), interest.trim()] }));
        }
        setCustomInterest('');
    };

    const removeInterest = (interest: string) => {
        setFormData(prev => ({ ...prev, interests: (prev.interests || []).filter(i => i !== interest) }));
    };

    // --- University Logic ---
    const handleUniversityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setUniversitySearch(value);
        setShowUniSuggestions(true);
        // Strict mode: If user types, clear the selected university until they pick a valid one
        if (formData.university && value !== formData.university) {
            setFormData(prev => ({ ...prev, university: '' }));
        }
    };

    const selectUniversity = (uni: string) => {
        setUniversitySearch(uni);
        setFormData(prev => ({ ...prev, university: uni }));
        setShowUniSuggestions(false);
    };

    const handleUniversityBlur = () => {
        setTimeout(() => {
            setShowUniSuggestions(false);
            // Strict mode: if search doesn't match selected, revert or clear
            if (!UNIVERSITIES_LIST.includes(universitySearch)) {
                setUniversitySearch(formData.university || '');
            }
        }, 200);
    };

    // --- Language Logic ---
    const toggleLanguageCountry = (countryName: string) => {
        const currentCountries = formData.languageCountries || [];
        let newCountries;
        
        if (currentCountries.includes(countryName)) {
            newCountries = currentCountries.filter(c => c !== countryName);
        } else {
            newCountries = [...currentCountries, countryName];
        }

        // Re-calculate languages based on selected countries
        const allLanguages = new Set<string>();
        newCountries.forEach(c => {
            const mapping = COUNTRY_LANGUAGES_MAPPING[c];
            if (mapping) {
                mapping.languages.forEach(l => allLanguages.add(l));
            }
        });

        setFormData(prev => ({
            ...prev,
            languageCountries: newCountries,
            languages: Array.from(allLanguages)
        }));
    };

    // --- Region Logic ---
    const toggleRegion = (r: string) => {
        const currentRegions = Array.isArray(formData.region) ? formData.region : [];
        if (currentRegions.includes(r)) {
            setFormData(prev => ({ ...prev, region: currentRegions.filter(reg => reg !== r) }));
        } else {
            setFormData(prev => ({ ...prev, region: [...currentRegions, r] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-user-id': user?._id || user?.id };
            
            // Ensure region is synced with country if needed, or just send both
            const payload = {
                ...formData,
                university: UNIVERSITIES_LIST.includes(universitySearch) ? universitySearch : '' // Strict check
            };

            const response = await axios.put(`/api/user/me`, payload, {
                headers
            });

            dispatch(setUser(response.data));
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false); // Exit edit mode on success
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) {
        return <div className="p-8 text-text-primary">Please log in to view this page.</div>;
    }

    const isIndia = formData.country === 'India';
    const filteredUniversities = UNIVERSITIES_LIST.filter(u => u.toLowerCase().includes(universitySearch.toLowerCase()));

    return (
        <div className="relative min-h-screen bg-background text-text-primary p-4 md:p-8 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                <Link href="/settings" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary transition-colors mb-6">
                    <ArrowLeft size={20} />
                    <span>Back to Settings</span>
                </Link>
                <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-primary bg-black/50 group">
                            {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                                    <UserIcon size={64} />
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setIsCapturing(true)}>
                                <Camera className="text-white" size={32} />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCapturing(true)}
                            className="text-primary font-medium hover:text-primary/80 transition-colors"
                        >
                            Change Profile Photo
                        </button>

                        {isCapturing && (
                            <WebcamCapture
                                onCapture={handleAvatarCapture}
                                onCancel={() => setIsCapturing(false)}
                            />
                        )}
                    </div>

                    {/* Right Column: Form */}
                    <div className="md:col-span-2">
                        {/* DEBUG: Temporary display of form data */}
                        <div className="bg-black/50 p-2 text-xs font-mono text-green-400 mb-4 overflow-auto max-h-40 rounded">
                            DEBUG STATE:
                            {JSON.stringify({ 
                                region: formData.region,
                                languageCountries: formData.languageCountries,
                                languages: formData.languages,
                                university: formData.university
                            }, null, 2)}
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {message && (
                                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Display Name</label>
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                        <input
                                           disabled={!isEditing} 
                                            type="text"
                                            name="displayName"
                                            value={formData.displayName || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface border border-glass-border rounded-lg pl-10 pr-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="Your Name"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Username</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                        <input
                                             disabled={!isEditing}
                                            type="text"
                                            name="username"
                                            value={formData.username || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface border border-glass-border rounded-lg pl-10 pr-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-text-secondary">Bio</label>
                                    <textarea
                                            disabled={!isEditing}
                                        name="bio"
                                        value={formData.bio || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors resize-none"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                {/* Country of Residence */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Country of Residence</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                        <select
                                            disabled={!isEditing}
                                            name="country"
                                            value={formData.country || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface border border-glass-border rounded-lg pl-10 pr-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors appearance-none"
                                        >
                                            <option value="" className="bg-surface">Select Country</option>
                                            {COUNTRIES.map(c => (
                                                <option key={c} value={c} className="bg-surface text-white">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Region Preference */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Region Preference (For Matching)</label>
                                    {isEditing ? (
                                        <MultiSelectDropdown
                                            label=""
                                            placeholder="Select regions..."
                                            options={COUNTRIES.filter(c => c !== 'Pakistan').map(c => ({
                                                value: c,
                                                label: c
                                            }))}
                                            selectedValues={Array.isArray(formData.region) ? formData.region : []}
                                            onChange={(newRegions: string[]) => {
                                                setFormData(prev => ({ ...prev, region: newRegions }));
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2 min-h-[42px] items-center p-2 bg-surface border border-glass-border rounded-lg">
                                            {(Array.isArray(formData.region) && formData.region.length > 0) ? (
                                                formData.region.map(r => (
                                                    <span key={r} className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs border border-primary/30">
                                                        {r}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-text-secondary text-sm">No region preference.</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* University */}
                                <div className="space-y-2 relative">
                                    <label className="text-sm font-medium text-text-secondary">University</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                        <input
                                            disabled={!isEditing}
                                            type="text"
                                            value={universitySearch}
                                            onChange={handleUniversityChange}
                                            onFocus={() => setShowUniSuggestions(true)}
                                            onBlur={handleUniversityBlur}
                                            className="w-full bg-surface border border-glass-border rounded-lg pl-10 pr-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                            placeholder="Search University..."
                                        />
                                    </div>
                                    {showUniSuggestions && universitySearch && (
                                        <div className="absolute z-10 w-full bg-surface border border-glass-border rounded-lg mt-1 max-h-60 overflow-y-auto shadow-xl custom-scrollbar">
                                            {filteredUniversities.length > 0 ? (
                                                filteredUniversities.map(uni => (
                                                    <div
                                                        key={uni}
                                                        className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm"
                                                        onClick={() => selectUniversity(uni)}
                                                    >
                                                        {uni}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-text-secondary text-sm">No matches found</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Interests */}
                              {/* Interests */}
<div className="space-y-2 md:col-span-2">
    <label className="text-sm font-medium text-text-secondary">Interests</label>

    {/* Show selected interests */}
    <div className="flex flex-wrap gap-2 mb-2">
        {(formData.interests || []).map(interest => (
            <span
                key={interest}
                className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm flex items-center gap-1"
            >
                {interest}

                {isEditing && (
                    <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="hover:text-white"
                    >
                        <XCircle size={14} />
                    </button>
                )}
            </span>
        ))}
    </div>

    {/* Input + Add button (enabled only in edit mode) */}
    <fieldset disabled={!isEditing} className={!isEditing ? "opacity-50 pointer-events-none" : ""}>
        <div className="flex gap-2">
            <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest(customInterest);
                    }
                }}
                className="flex-1 bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                placeholder="Add an interest..."
            />

            <button
                type="button"
                onClick={() => addInterest(customInterest)}
                className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
                Add
            </button>
        </div>
    </fieldset>

    {/* Suggestions - only clickable when editing */}
    <fieldset disabled={!isEditing} className={!isEditing ? "opacity-40 pointer-events-none" : ""}>
        <div className="mt-2">
            <p className="text-xs text-text-secondary mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.slice(0, 10).map((interest) => (
                    <button
                        key={interest}
                        type="button"
                        onClick={() => addInterest(interest)}
                        className="px-3 py-1 rounded-full bg-surface border border-glass-border text-xs hover:border-primary transition-colors"
                    >
                        {interest}
                    </button>
                ))}
            </div>
        </div>
    </fieldset>
</div>


                                {/* Languages */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-medium text-text-secondary">Languages (Select Flags)</label>
                                    {isEditing ? (
                                        <>
                                            <MultiSelectDropdown
                                                label=""
                                                placeholder="Select countries to include..."
                                                options={LANGUAGE_FLAGS.map(lf => ({
                                                    value: lf.country,
                                                    label: lf.country,
                                                    flag: lf.flag,
                                                    languages: lf.languages
                                                }))}
                                                selectedValues={formData.languageCountries || []}
                                                onChange={(newCountries: string[]) => {
                                                    const allLanguages = new Set<string>();
                                                    newCountries.forEach((c: string) => {
                                                        const mapping = COUNTRY_LANGUAGES_MAPPING[c];
                                                        if (mapping) {
                                                            mapping.languages.forEach(l => allLanguages.add(l));
                                                        }
                                                    });
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        languageCountries: newCountries,
                                                        languages: Array.from(allLanguages)
                                                    }));
                                                }}
                                            />
                                            <p className="text-xs text-text-secondary mt-1">Select country flags to include all languages from that country.</p>
                                        </>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 min-h-[42px] items-center p-2 bg-surface border border-glass-border rounded-lg">
                                            {(formData.languageCountries && formData.languageCountries.length > 0) ? (
                                                formData.languageCountries.map((c: string) => {
                                                    const mapping = COUNTRY_LANGUAGES_MAPPING[c];
                                                    return mapping ? (
                                                        <div key={c} className="w-8 h-6 relative shrink-0 shadow-sm border border-glass-border rounded-sm" title={c}>
                                                            <Image 
                                                                src={mapping.flag} 
                                                                alt={c} 
                                                                fill 
                                                                className="object-cover rounded-[1px]" 
                                                            />
                                                        </div>
                                                    ) : <span key={c} className="text-xs text-text-secondary">{c}</span>;
                                                })
                                            ) : (
                                                <span className="text-text-secondary text-sm">No languages selected.</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Other Fields */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender || ''}
                                        onChange={handleInputChange}
                                        className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors appearance-none"
                                    >
                                        <option value="" className="bg-surface">Select Gender</option>
                                        <option value="male" className="bg-surface text-black">Male</option>
                                        <option value="female" className="bg-surface text-black">Female</option>
                                        <option value="other" className="bg-surface text-black">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-text-secondary">Age</label>
                                    <input
                                        type="number"
                                        name="age"
                                        value={formData.age || ''}
                                        onChange={handleInputChange}
                                        className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                        placeholder="25"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                {isEditing ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditing(false);
                                                if (user) setFormData({
                                                    displayName: user.displayName,
                                                    username: user.username,
                                                    bio: user.bio,
                                                    website: user.website,
                                                    profession: user.profession,
                                                    gender: user.gender,
                                                    age: user.age,
                                                    country: user.country,
                                                    region: user.region || [],
                                                    university: user.university,
                                                    interests: user.interests || [],
                                                    languages: user.languages || [],
                                                    languageCountries: user.languageCountries || [],
                                                    avatarUrl: user.avatarUrl
                                                });
                                            }}
                                            className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-lg font-medium transition-all"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(127,25,230,0.3)] hover:shadow-[0_0_30px_rgba(127,25,230,0.5)] flex items-center gap-2"
                                        >
                                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                            Save Changes
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(127,25,230,0.3)] hover:shadow-[0_0_30px_rgba(127,25,230,0.5)] flex items-center gap-2"
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
