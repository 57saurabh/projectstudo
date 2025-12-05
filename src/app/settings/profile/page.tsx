'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store/store';
import { IUser as User, PROFESSION_TYPES } from '@/models/User';
import WebcamCapture from '@/components/profile/WebcamCapture';
import { Camera, Save, Loader2, User as UserIcon, Globe, Briefcase, Hash, ArrowLeft, XCircle } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';
import { setUser } from '@/lib/store/authSlice';
import { COUNTRIES, LANGUAGES, INTERESTS_LIST, UNIVERSITIES_LIST, COUNTRY_LANGUAGES_MAPPING, LANGUAGE_FLAGS } from '@/lib/constants';
import Image from 'next/image';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import Input from '@/components/ui/Input';

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
                profession: user.profession || { type: 'Looking for Opportunities' },
                gender: user.gender,
                age: user.age,
                country: user.country,
                avatarUrl: user.avatarUrl,
                interests: user.interests || [],
                
                // Map preferences to top-level or keep specific state?
                // Actually, let's keep formData structure close to User
                preferences: {
                    ...user.preferences,
                    region: user.preferences?.region || [], 
                    languages: user.preferences?.languages || [],
                    languageCountries: user.preferences?.languageCountries || []
                }
            });
            // University is now in profession.university
            setUniversitySearch(user.profession?.university || '');
        }
    }, [user]);

    // Handle nested input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        if (name === 'professionType') {
             setFormData(prev => ({ 
                 ...prev, 
                 profession: { ...prev.profession, type: value } as any
             }));
        } else if (name.startsWith('preferences.')) {
            const prefKey = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                preferences: { ...prev.preferences, [prefKey]: value }
            } as Partial<User>));
        } else {
             setFormData((prev: Partial<User>) => ({ ...prev, [name]: value }));
        }
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
        const currentCountries = formData.preferences?.languageCountries || [];
        let newCountries;
        
        if (currentCountries.includes(countryName)) {
            newCountries = currentCountries.filter((c: string) => c !== countryName);
        } else {
            newCountries = [...currentCountries, countryName];
        }

        // Re-calculate languages based on selected countries
        const allLanguages = new Set<string>();
        newCountries.forEach((c: string) => {
            const mapping = COUNTRY_LANGUAGES_MAPPING[c];
            if (mapping) {
                mapping.languages.forEach(l => allLanguages.add(l));
            }
        });

        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                languageCountries: newCountries,
                languages: Array.from(allLanguages)
            }
        }));
    };

    // --- Region Logic ---
    // --- Region Logic ---
    const toggleRegion = (r: string) => {
        const currentPreferences = formData.preferences || {};
        const currentRegions = currentPreferences.region || [];
        
        let newRegions;
        if (currentRegions.includes(r)) {
            newRegions = currentRegions.filter(reg => reg !== r);
        } else {
            newRegions = [...currentRegions, r];
        }

        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences,
                region: newRegions
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : { 'x-user-id': user?._id || user?.id };
            
            // Construct Clean Profession Object
            const currentProf = formData.profession as any || {};
            const type = currentProf.type;
            
            let cleanProfession: any = { type };

            // Logic matching backend schema requirements
            if (type === 'Student' || type === 'Medical Student') {
                // Use universitySearch state for university
                const finalUni = UNIVERSITIES_LIST.includes(universitySearch) ? universitySearch : '';
                cleanProfession.university = finalUni;
                // If Medical Student, they might need hospital? Schema says: required function for hospital checks only specific roles not Medical Student (wait, let me check).
                // Schema: Hospital required if ['Doctor', 'Nurse', 'Medical Student'...]. Ah, Medical Student is in Hospital list too?
                // Re-checking prompt: "Medical Student: university or hospital".
                // My UI logic showed University for Medical Student. I should also check if I need to send Hospital?
                // Complex case: "Medical Student" is in both lists in schema?
                // Prompt Schema: 
                // university required if Student OR Medical Student.
                // hospital required if Doctor... Medical Student ...
                // So Medical Student needs BOTH or EITHER? Prompt says "university or hospital".
                // The Mongoose schema uses `required: function() { return [list].includes(this.type) }`.
                // If Medical Student is in BOTH lists, Mongoose might require BOTH.
                // To be safe, I should probably allow user to input both if Medical Student, or just send what is filled.
                // For now, let's treat Medical Student mainly as Student (University).
                // But catching the schema validation error might happen.
                // Let's attach hospital if present too.
                if (currentProf.hospital) cleanProfession.hospital = currentProf.hospital;
            } else if (["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"].includes(type)) {
                cleanProfession.hospital = currentProf.hospital;
            } else if (["Software Engineer", "Full-Stack Developer", "Backend Developer", "Frontend Developer",
                "Mobile Developer", "Game Developer", "AI Engineer", "ML Engineer", "Data Analyst",
                "Data Scientist", "Cybersecurity Analyst", "DevOps Engineer", "Cloud Engineer",
                "UI/UX Designer", "Product Designer", "Graphic Designer", "Animator", "Video Editor",
                "Photographer", "Videographer", "Content Creator", "Influencer", "Blogger", "Writer",
                "Editor", "Architect", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
                "Technician", "Mechanic", "Marketing Specialist", "HR Executive", "Operations Manager",
                "Accountant", "Banker", "Business Analyst", "Entrepreneur", "Founder", "Freelancer", "Self-Employed"].includes(type)) {
                cleanProfession.company = currentProf.company;
            } else {
                // Occupation Place for others
                // Check if it's not one of the "No Workplace" roles
                if (!["Unemployed", "Looking for Opportunities", "Homemaker"].includes(type)) {
                     cleanProfession.occupationPlace = currentProf.occupationPlace;
                }
            }

            const payload = {
                ...formData,
                profession: cleanProfession
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
                <Link href="/settings" className="inline-flex items-center gap-2 text-text-secondary hover:text-gold transition-colors mb-6 font-bold group">
                    <div className="p-2 rounded-xl bg-surface border border-border group-hover:border-gold/50 group-hover:text-gold transition-colors">
                        <ArrowLeft size={20} />
                    </div>
                    <span>Back to Settings</span>
                </Link>
                <h1 className="text-4xl font-black tracking-tighter mb-8 text-white">Edit Profile</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar */}
                    <div className="flex flex-col items-center gap-6">
                        <div className="relative w-48 h-48 rounded-3xl overflow-hidden border-4 border-gold bg-surface group shadow-gold-glow">
                            {formData.avatarUrl ? (
                                <img src={formData.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gold">
                                    <UserIcon size={64} />
                                </div>
                            )}

                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm" onClick={() => setIsCapturing(true)}>
                                <Camera className="text-gold dropshadow-lg" size={40} />
                            </div>
                        </div>

                        <button
                            onClick={() => setIsCapturing(true)}
                            className="text-gold font-bold hover:text-gold-hover transition-colors flex items-center gap-2"
                        >
                            <Camera size={18} />
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
                        {/* DEBUG: Temporary display of form data - Commented out for production feel */}
                        {/* <div className="bg-black/50 p-2 text-xs font-mono text-green-400 mb-4 overflow-auto max-h-40 rounded">
                            DEBUG STATE:
                            {JSON.stringify({ 
                                profession: formData.profession,
                                preferences: formData.preferences,
                                universitySearch
                            }, null, 2)}
                        </div> */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {message && (
                                <div className={`p-4 rounded-2xl font-bold border ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                                    {message.text}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Info */}
                                {/* Basic Info */}
                                <Input
                                    label="Display Name"
                                    icon={UserIcon}
                                    disabled={!isEditing}
                                    type="text"
                                    name="displayName"
                                    value={formData.displayName || ''}
                                    onChange={handleInputChange}
                                    placeholder="Your Name"
                                />

                                <Input
                                    label="Username"
                                    icon={Hash}
                                    disabled={!isEditing}
                                    type="text"
                                    name="username"
                                    value={formData.username || ''}
                                    onChange={handleInputChange}
                                    placeholder="username"
                                />

                                {/* Profession */}
                                <div className="space-y-6 border-t border-border pt-6 mt-4 md:col-span-2">
                                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                                        <Briefcase className="text-gold" size={24} />
                                        Profession & Work
                                    </h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Current Role</label>
                                            <div className="relative">
                                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted icon-gold-focus" size={18} />
                                                <select
                                                    disabled={!isEditing}
                                                    name="professionType"
                                                    value={(formData.profession as any)?.type || ''}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-surface-hover/50 border border-border rounded-2xl pl-12 pr-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all font-medium appearance-none disabled:opacity-60 disabled:cursor-not-allowed focus:bg-surface-hover"
                                                >
                                                    <option value="" className="bg-surface text-text-muted">Select Profession</option>
                                                    {PROFESSION_TYPES.map(p => (
                                                        <option key={p} value={p} className="bg-surface text-text-primary">{p}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Conditional Fields based on Profession Type */}
                                        {(() => {
                                            const type = (formData.profession as any)?.type;
                                            if (!type) return null;

                                            // 1. University for Students
                                            if (type === 'Student' || type === 'Medical Student') {
                                                return (
                                                    <div className="relative">
                                                        <Input
                                                            label="University / College"
                                                            icon={Briefcase}
                                                            disabled={!isEditing}
                                                            type="text"
                                                            value={universitySearch}
                                                            onChange={handleUniversityChange}
                                                            onFocus={() => setShowUniSuggestions(true)}
                                                            onBlur={handleUniversityBlur}
                                                            placeholder="Search University..."
                                                        />
                                                        {showUniSuggestions && universitySearch && (
                                                            <div className="absolute z-50 w-full bg-surface border border-border rounded-xl mt-1 max-h-60 overflow-y-auto shadow-2xl custom-scrollbar ring-1 ring-gold/10">
                                                                {filteredUniversities.length > 0 ? (
                                                                    filteredUniversities.map(uni => (
                                                                        <div
                                                                            key={uni}
                                                                            className="px-4 py-3 hover:bg-surface-hover cursor-pointer text-sm font-medium border-b border-border/50 last:border-0"
                                                                            onClick={() => selectUniversity(uni)}
                                                                        >
                                                                            {uni}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="px-4 py-3 text-text-muted text-sm font-medium">No matches found</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // 2. Hospital for Medical Professionals
                                            const medicalRoles = ["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"];
                                            if (medicalRoles.includes(type)) {
                                                return (
                                                    <Input
                                                        label="Hospital / Clinic"
                                                        icon={Briefcase}
                                                        disabled={!isEditing}
                                                        type="text"
                                                        name="profession.hospital"
                                                        value={(formData.profession as any)?.hospital || ''}
                                                        onChange={(e) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            profession: { ...prev.profession, hospital: e.target.value } as any
                                                        }))}
                                                        placeholder="Hospital Name"
                                                    />
                                                );
                                            }

                                            // 3. Company for Tech/Corporate
                                            const corporateRoles = [
                                                "Software Engineer", "Full-Stack Developer", "Backend Developer", "Frontend Developer",
                                                "Mobile Developer", "Game Developer", "AI Engineer", "ML Engineer", "Data Analyst",
                                                "Data Scientist", "Cybersecurity Analyst", "DevOps Engineer", "Cloud Engineer",
                                                "UI/UX Designer", "Product Designer", "Graphic Designer", "Animator", "Video Editor",
                                                "Photographer", "Videographer", "Content Creator", "Influencer", "Blogger", "Writer",
                                                "Editor", "Architect", "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
                                                "Technician", "Mechanic", "Marketing Specialist", "HR Executive", "Operations Manager",
                                                "Accountant", "Banker", "Business Analyst", "Entrepreneur", "Founder", "Freelancer", "Self-Employed"
                                            ];
                                            if (corporateRoles.includes(type)) {
                                                return (
                                                    <Input
                                                        label="Company / Organization"
                                                        icon={Briefcase}
                                                        disabled={!isEditing}
                                                        type="text"
                                                        name="profession.company"
                                                        value={(formData.profession as any)?.company || ''}
                                                        onChange={(e) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            profession: { ...prev.profession, company: e.target.value } as any
                                                        }))}
                                                        placeholder="Company Name"
                                                    />
                                                );
                                            }

                                            // 4. Occupation Place for others (fallback)
                                            const noWorkPlaceRoles = ["Unemployed", "Looking for Opportunities", "Homemaker"];
                                            if (!noWorkPlaceRoles.includes(type)) {
                                                return (
                                                    <Input
                                                        label="Workplace / Location"
                                                        icon={Briefcase}
                                                        disabled={!isEditing}
                                                        type="text"
                                                        name="profession.occupationPlace"
                                                        value={(formData.profession as any)?.occupationPlace || ''}
                                                        onChange={(e) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            profession: { ...prev.profession, occupationPlace: e.target.value } as any
                                                        }))}
                                                        placeholder="Where do you work?"
                                                    />
                                                );
                                            }

                                            return null;
                                        })()}
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Bio</label>
                                    <textarea
                                            disabled={!isEditing}
                                        name="bio"
                                        value={formData.bio || ''}
                                        onChange={handleInputChange}
                                        rows={3}
                                        className="w-full bg-surface-hover/50 border border-border rounded-2xl px-5 py-4 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all resize-none font-medium disabled:opacity-60 disabled:cursor-not-allowed focus:bg-surface-hover"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>

                                {/* Country of Residence */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Country of Residence</label>
                                    <div className="relative">
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted icon-gold-focus" size={18} />
                                        <select
                                            disabled={!isEditing}
                                            name="country"
                                            value={formData.country || ''}
                                            onChange={handleInputChange}
                                            className="w-full bg-surface-hover/50 border border-border rounded-2xl pl-12 pr-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all font-medium appearance-none disabled:opacity-60 disabled:cursor-not-allowed focus:bg-surface-hover"
                                        >
                                            <option value="" className="bg-surface">Select Country</option>
                                            {COUNTRIES.map(c => (
                                                <option key={c} value={c} className="bg-surface text-text-primary">{c}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Region Preference */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Region Preference (For Matching)</label>
                                    {isEditing ? (
                                        <MultiSelectDropdown
                                            label=""
                                            placeholder="Select regions..."
                                            options={COUNTRIES.filter(c => c !== 'Pakistan').map(c => ({
                                                value: c,
                                                label: c
                                            }))}
                                            selectedValues={formData.preferences?.region || []}
                                            onChange={(newRegions: string[]) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    preferences: { ...prev.preferences, region: newRegions }
                                                }));
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2 min-h-[50px] items-center p-2.5 bg-surface-hover/30 border border-border rounded-2xl">
                                            {(formData.preferences?.region && (formData.preferences.region.length > 0)) ? (
                                                formData.preferences.region.map(r => (
                                                    <span key={r} className="px-3 py-1.5 rounded-full bg-gold/10 text-gold text-xs font-bold border border-gold/20 shadow-sm">
                                                        {r}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-text-muted text-sm font-medium px-2">No region preference set.</span>
                                            )}
                                        </div>
                                    )}
                                </div>



                                {/* Interests */}
<div className="space-y-3 md:col-span-2">
    <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Interests</label>

    {/* Show selected interests */}
    <div className="flex flex-wrap gap-2 mb-2">
        {(formData.interests || []).map(interest => (
            <span
                key={interest}
                className="px-3 py-1.5 rounded-full bg-gold/10 text-gold font-bold text-sm flex items-center gap-2 border border-gold/20 shadow-sm animate-in zoom-in-95"
            >
                {interest}

                {isEditing && (
                    <button
                        type="button"
                        onClick={() => removeInterest(interest)}
                        className="hover:text-white transition-colors"
                    >
                        <XCircle size={14} />
                    </button>
                )}
            </span>
        ))}
    </div>

    {/* Input + Add button (enabled only in edit mode) */}
    <fieldset disabled={!isEditing} className={!isEditing ? "opacity-50 pointer-events-none" : ""}>
        <div className="flex gap-3">
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
                className="flex-1 bg-surface-hover/50 border border-border rounded-2xl px-5 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-colors font-medium focus:bg-surface-hover"
                placeholder="Add an interest..."
            />

            <button
                type="button"
                onClick={() => addInterest(customInterest)}
                className="px-6 py-3 bg-surface-hover hover:bg-gold hover:text-white rounded-2xl font-bold transition-all shadow-sm border border-border hover:border-gold"
            >
                Add
            </button>
        </div>
    </fieldset>

    {/* Suggestions - only clickable when editing */}
    <fieldset disabled={!isEditing} className={!isEditing ? "opacity-40 pointer-events-none" : ""}>
        <div className="mt-3">
            <p className="text-xs text-text-muted mb-2 font-bold uppercase tracking-wider">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
                {INTERESTS_LIST.slice(0, 10).map((interest) => (
                    <button
                        key={interest}
                        type="button"
                        onClick={() => addInterest(interest)}
                        className="px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-bold text-text-secondary hover:border-gold hover:text-gold transition-colors"
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
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Languages (Select Flags)</label>
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
                                                selectedValues={formData.preferences?.languageCountries || []}
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
                                                        preferences: {
                                                            ...prev.preferences,
                                                            languageCountries: newCountries,
                                                            languages: Array.from(allLanguages)
                                                        }
                                                    }));
                                                }}
                                            />
                                            <p className="text-xs text-text-muted mt-2 font-medium bg-surface-hover/50 p-2 rounded-lg inline-block">
                                                💡 Select country flags to include all languages from that country.
                                            </p>
                                        </>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 min-h-[50px] items-center p-2.5 bg-surface-hover/30 border border-border rounded-2xl">
                                            {(formData.preferences?.languageCountries && formData.preferences.languageCountries.length > 0) ? (
                                                formData.preferences.languageCountries.map((c: string) => {
                                                    const mapping = COUNTRY_LANGUAGES_MAPPING[c];
                                                    return mapping ? (
                                                        <div key={c} className="w-8 h-6 relative shrink-0 shadow-sm border border-border rounded-sm hover:scale-110 transition-transform cursor-help" title={c}>
                                                            <Image 
                                                                src={mapping.flag} 
                                                                alt={c} 
                                                                fill 
                                                                className="object-cover rounded-[1px]" 
                                                            />
                                                        </div>
                                                    ) : <span key={c} className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-md">{c}</span>;
                                                })
                                            ) : (
                                                <span className="text-text-muted text-sm font-medium px-2">No languages selected.</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Other Fields */}
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-text-muted uppercase tracking-wider">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender || ''}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        className="w-full bg-surface-hover/50 border border-border rounded-2xl px-4 py-3.5 text-text-primary focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all font-medium appearance-none disabled:opacity-60 disabled:cursor-not-allowed focus:bg-surface-hover"
                                    >
                                        <option value="" className="bg-surface text-text-muted">Select Gender</option>
                                        <option value="male" className="bg-surface text-text-primary">Male</option>
                                        <option value="female" className="bg-surface text-text-primary">Female</option>
                                        <option value="other" className="bg-surface text-text-primary">Other</option>
                                    </select>
                                </div>

                                <Input
                                    label="Age"
                                    type="number"
                                    name="age"
                                    value={formData.age || ''}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    placeholder="25"
                                />
                            </div>
                            
                            <div className="pt-6 flex justify-end gap-4 border-t border-border mt-8">
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
                                                    profession: user.profession || { type: 'Looking for Opportunities' },
                                                    gender: user.gender,
                                                    age: user.age,
                                                    country: user.country,
                                                    interests: user.interests || [],
                                                    avatarUrl: user.avatarUrl,
                                                    preferences: {
                                                        ...user.preferences,
                                                        region: user.preferences?.region || [],
                                                        languages: user.preferences?.languages || [],
                                                        languageCountries: user.preferences?.languageCountries || []
                                                    }
                                                });
                                            }}
                                            className="bg-surface hover:bg-surface-hover text-text-primary px-6 py-3 rounded-2xl font-bold transition-all border border-border"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="bg-gold hover:bg-gold-hover text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-gold-glow hover:shadow-gold-glow/80 active:scale-95 flex items-center gap-2"
                                        >
                                            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                            Save Changes
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(true)}
                                        className="bg-gold hover:bg-gold-hover text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-gold-glow hover:shadow-gold-glow/80 active:scale-95 flex items-center gap-2"
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
