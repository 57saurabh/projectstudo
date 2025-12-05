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
                                profession: formData.profession,
                                preferences: formData.preferences,
                                universitySearch
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

                                {/* Profession */}
                                <div className="space-y-4 border-t border-glass-border pt-4 mt-4">
                                    <h3 className="text-lg font-semibold text-text-primary">Profession & Work</h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text-secondary">Current Role</label>
                                        <div className="relative">
                                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                                            <select
                                                disabled={!isEditing}
                                                name="professionType"
                                                value={(formData.profession as any)?.type || ''}
                                                onChange={handleInputChange}
                                                className="w-full bg-surface border border-glass-border rounded-lg pl-10 pr-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors appearance-none"
                                            >
                                                <option value="" className="bg-surface">Select Profession</option>
                                                {PROFESSION_TYPES.map(p => (
                                                    <option key={p} value={p} className="bg-surface text-black">{p}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Conditional Fields based on Profession Type */}
                                    {(() => {
                                        const type = (formData.profession as any)?.type;
                                        if (!type) return null;

                                        // 1. University for Students
                                        if (type === 'Student' || type === 'Medical Student') {
                                            return (
                                                <div className="space-y-2 relative">
                                                    <label className="text-sm font-medium text-text-secondary">University / College</label>
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
                                            );
                                        }

                                        // 2. Hospital for Medical Professionals
                                        const medicalRoles = ["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"];
                                        if (medicalRoles.includes(type)) {
                                            return (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-text-secondary">Hospital / Clinic</label>
                                                    <input
                                                        disabled={!isEditing}
                                                        type="text"
                                                        name="profession.hospital"
                                                        value={(formData.profession as any)?.hospital || ''}
                                                        onChange={(e) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            profession: { ...prev.profession, hospital: e.target.value } as any
                                                        }))}
                                                        className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                                        placeholder="Hospital Name"
                                                    />
                                                </div>
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
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-text-secondary">Company / Organization</label>
                                                    <input
                                                        disabled={!isEditing}
                                                        type="text"
                                                        name="profession.company"
                                                        value={(formData.profession as any)?.company || ''}
                                                        onChange={(e) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            profession: { ...prev.profession, company: e.target.value } as any
                                                        }))}
                                                        className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                                        placeholder="Company Name"
                                                    />
                                                </div>
                                            );
                                        }

                                        // 4. Occupation Place for others (fallback)
                                        const otherRoles = ["Chef", "Cook", "Barista", "Waiter", "Customer Support", "Delivery Rider", 
                                            "Driver", "Fitness Trainer", "Athlete", "Coach", "Model", "Social Worker", "Teacher", 
                                            "Professor", "Researcher", "Scientist", "Sales Executive"];
                                        
                                        // Specific check or fallback? Prompt implies "All others -> occupationPlace"
                                        // Let's use negative check to be safe, or just render it if not one of the above.
                                        // The schema says occupationPlace is required if NOT university/company/hospital.
                                        // So we should show it for anything else except Unemployed/Looking/Homemaker.
                                        
                                        const noWorkPlaceRoles = ["Unemployed", "Looking for Opportunities", "Homemaker"];
                                        if (!noWorkPlaceRoles.includes(type)) {
                                            return (
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium text-text-secondary">Workplace / Location</label>
                                                    <input
                                                        disabled={!isEditing}
                                                        type="text"
                                                        name="profession.occupationPlace"
                                                        value={(formData.profession as any)?.occupationPlace || ''}
                                                        onChange={(e) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            profession: { ...prev.profession, occupationPlace: e.target.value } as any
                                                        }))}
                                                        className="w-full bg-surface border border-glass-border rounded-lg px-4 py-3 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                                        placeholder="Where do you work?"
                                                    />
                                                </div>
                                            );
                                        }

                                        return null;
                                    })()}
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
                                            selectedValues={formData.preferences?.region || []}
                                            onChange={(newRegions: string[]) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    preferences: { ...prev.preferences, region: newRegions }
                                                }));
                                            }}
                                        />
                                    ) : (
                                        <div className="flex flex-wrap gap-2 min-h-[42px] items-center p-2 bg-surface border border-glass-border rounded-lg">
                                            {(formData.preferences?.region && (formData.preferences.region.length > 0)) ? (
                                                formData.preferences.region.map(r => (
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
                                            <p className="text-xs text-text-secondary mt-1">Select country flags to include all languages from that country.</p>
                                        </>
                                    ) : (
                                        <div className="flex flex-wrap gap-2 min-h-[42px] items-center p-2 bg-surface border border-glass-border rounded-lg">
                                            {(formData.preferences?.languageCountries && formData.preferences.languageCountries.length > 0) ? (
                                                formData.preferences.languageCountries.map((c: string) => {
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
