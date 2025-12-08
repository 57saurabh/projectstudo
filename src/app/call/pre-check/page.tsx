'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LocalVideo from '@/components/video/LocalVideo';
import { ScanFace, CheckCircle, XCircle, ArrowRight, User as UserIcon, Briefcase, Globe, X, Camera } from 'lucide-react';
import { useCallStore } from '@/lib/store/useCallStore';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import WebcamCapture from '@/components/profile/WebcamCapture';
import { COUNTRIES, INTERESTS_LIST, UNIVERSITIES_LIST, COUNTRY_LANGUAGES_MAPPING, LANGUAGE_FLAGS } from '@/lib/constants';
import { faceDetectionService } from '@/lib/ai/FaceDetectionService';
import Image from 'next/image';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import Input from '@/components/ui/Input';

export default function PreCheckPage() {
    const router = useRouter();
    // Initialize WebRTC (requests permissions and starts stream)
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Initialize WebRTC (requests permissions and starts stream)
    useWebRTC(videoRef);

    const { localStream } = useCallStore();
    // Get token from Redux
    const { token } = useSelector((state: RootState) => state.auth);

    const [faceDetected, setFaceDetected] = useState(false);
    const [checkStatus, setCheckStatus] = useState<'success' | 'failed' | null>(null);
    const [statusMessage, setStatusMessage] = useState('');

    // Profile State
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        country: '',
        region: [] as string[],
        profession: { type: 'Student' } as any,
        interests: [] as string[],
        languages: [] as string[],
        languageCountries: [] as string[]
    });

    // Custom Input State
    const [customInterest, setCustomInterest] = useState('');
    const [universitySearch, setUniversitySearch] = useState('');
    const [showUniSuggestions, setShowUniSuggestions] = useState(false);
    const [showAllLanguages, setShowAllLanguages] = useState(false);

    // Fetch User Data
    useEffect(() => {
        const fetchUser = async () => {
            if (!token) return;
            try {
                const res = await axios.get('/api/user/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUser(res.data);
                setFormData({
                    displayName: res.data.displayName || '',
                    bio: res.data.bio || '',
                    country: res.data.country || '',
                    region: res.data.preferences?.region || [],
                    profession: res.data.profession || { type: 'Student' },
                    interests: res.data.interests || [],
                    languages: res.data.preferences?.languages || [],
                    languageCountries: res.data.preferences?.languageCountries || []
                });
                setUniversitySearch(res.data.profession?.university || '');
            } catch (error) {
                console.error('Failed to fetch user:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [token]);

    // Sync localStream to hidden video element for capture
    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        const loadModel = async () => {
            try {
                await faceDetectionService.load();
                console.log('Face Detection Model loaded');
            } catch (err) {
                console.error('Failed to load Face Detection Model:', err);
            }
        };
        loadModel();
    }, []);

    useEffect(() => {
        let mounted = true;
        let timeoutId: NodeJS.Timeout;

        const scanFace = async () => {
            if (!localStream || !mounted || !videoRef.current) return;

            const videoEl = videoRef.current;

            if (videoEl.readyState >= 2) {
                // Use Client-Side Face Detection (face-api.js)
                const result = await faceDetectionService.detect(videoEl);

                // Note: face-api.js returns a detection object if found, or undefined/null if not.
                if (result) {
                    setFaceDetected(true);
                    setCheckStatus('success');
                    setStatusMessage('Face detected! You are ready.');
                } else {
                    setFaceDetected(false);
                    setCheckStatus('failed');
                    setStatusMessage('No face detected. Stay in frame.');
                }
            } else {
                if (videoEl.paused) {
                    videoEl.play().catch(e => console.error('Auto-play failed:', e));
                }
            }

            // Poll every 1 second
            timeoutId = setTimeout(scanFace, 1000);
        };

        if (localStream) {
            scanFace();
        }

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
        };
    }, [localStream]);

    const toggleRegion = (r: string) => {
        const currentRegions = Array.isArray(formData.region) ? formData.region : [];
        if (currentRegions.includes(r)) {
            setFormData(prev => ({ ...prev, region: currentRegions.filter(reg => reg !== r) }));
        } else {
            setFormData(prev => ({ ...prev, region: [...currentRegions, r] }));
        }
    };

    const handleStartMatching = () => {
        if (faceDetected) {
            sessionStorage.setItem('preCheckPassed', 'true');
            router.push('/call/random');
        }
    };

    const handleSaveProfile = async () => {
        if (!token) return;
        try {
            // Build Profession Payload
            const prof = formData.profession || {};
            const type = prof.type;
            let cleanProfession: any = { type };

            if (["Student", "Medical Student"].includes(type)) {
                // Allow custom universities, but ensure it's not empty if required
                if (universitySearch.trim()) {
                    cleanProfession.university = universitySearch.trim();
                }
            } else if (["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"].includes(type)) {
                cleanProfession.hospital = prof.hospital || "";
            } else if (!["Unemployed", "Looking for Opportunities", "Homemaker"].includes(type)) {
                cleanProfession.company = prof.company || "";
                cleanProfession.occupationPlace = prof.occupationPlace || "";
            }

            const payload = {
                ...formData,
                profession: cleanProfession,
                preferences: {
                    ...(user?.preferences || {}), // Preserve existing preferences (matchGender, etc.)
                    region: formData.region,
                    languages: formData.languages,
                    languageCountries: formData.languageCountries
                }
            };

            const res = await axios.put('/api/user/me', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            setIsEditing(false);
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            // Show more specific error if available
            const errorMsg = error.response?.data?.message || 'Failed to update profile';
            alert(errorMsg);
        }
    };

    const handleAvatarCapture = async (imageSrc: string) => {
        if (!token) return;
        try {
            const res = await axios.put('/api/user/me', { avatarUrl: imageSrc }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            setIsCapturing(false);
        } catch (error) {
            console.error('Failed to update avatar:', error);
            alert('Failed to update avatar');
        }
    };

    // --- Helpers ---
    const addInterest = (interest: string) => {
        if (!interest.trim()) return;
        if (!formData.interests.includes(interest.trim())) {
            setFormData(prev => ({ ...prev, interests: [...prev.interests, interest.trim()] }));
        }
        setCustomInterest('');
    };

    const removeInterest = (interest: string) => {
        setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }));
    };

    const selectUniversity = (uni: string) => {
        setUniversitySearch(uni);
        setFormData(prev => ({ ...prev, profession: { ...prev.profession, university: uni } }));
        setShowUniSuggestions(false);
    };

    const handleUniversityBlur = () => {
        setTimeout(() => {
            setShowUniSuggestions(false);
            if (!UNIVERSITIES_LIST.includes(universitySearch)) {
                setUniversitySearch(formData.profession?.university || '');
            }
        }, 200);
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-background text-primary">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin" />
                <p className="text-xl font-bold text-gold animate-pulse">Loading Profile...</p>
            </div>
        </div>
    );

    const filteredUniversities = UNIVERSITIES_LIST.filter(u => u.toLowerCase().includes(universitySearch.toLowerCase()));

    return (
        <div className="flex h-full w-full flex-col lg:flex-row items-center justify-center bg-background p-4 lg:p-6 gap-6 lg:gap-8 transition-colors duration-300 overflow-hidden">
            {/* Background Glow */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_100%_200px,rgba(216,154,26,0.05),transparent)] pointer-events-none" />

            {/* Hidden Video and Canvas for Capture */}
            <video ref={videoRef} autoPlay muted playsInline className="hidden" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Left Side: Camera Check */}
            <div className="w-full max-w-xl flex flex-col gap-6 z-10">
                <div className="text-center lg:text-left">
                    <h1 className="text-4xl font-black text-primary mb-2 tracking-tighter">Camera Check</h1>
                    <p className="text-text-muted font-medium">Wait for verifying your face...</p>
                </div>

                <div className={`relative aspect-[4/3] w-full bg-surface rounded-3xl overflow-hidden border-4 transition-colors duration-500 shadow-2xl ${faceDetected ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'border-gold shadow-gold-glow'
                    }`}>
                    <LocalVideo />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        {!faceDetected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/20" />
                                <div className="absolute top-0 left-0 w-full h-1 bg-gold/50 animate-[scan_2s_ease-in-out_infinite]" />
                                <div className="flex flex-col items-center gap-4 z-10">
                                    <div className="relative">
                                        <ScanFace size={80} className="text-gold animate-pulse" />
                                        <div className="absolute inset-0 blur-xl bg-gold/30 rounded-full animate-pulse" />
                                    </div>
                                    <p className="text-gold font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm border border-gold/20">
                                        Detecting Face...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl backdrop-blur-xl border flex items-center gap-3 transition-all duration-300 shadow-lg ${faceDetected
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-black/60 border-white/10 text-white/70'
                        }`}>
                        {faceDetected ? (
                            <>
                                <CheckCircle size={20} className="text-green-400" />
                                <span className="font-bold">You look great! Ready to go.</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={20} className="text-danger" />
                                <span className="font-bold">Position your face in frame</span>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleStartMatching}
                    disabled={!faceDetected}
                    className={`w-full py-5 rounded-2xl font-black text-xl transition-all shadow-lg flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] ${faceDetected
                        ? 'bg-gradient-to-r from-gold to-orange text-white cursor-pointer shadow-gold-glow hover:shadow-[0_0_40px_rgba(216,154,26,0.5)]'
                        : 'bg-surface border border-border text-text-muted cursor-not-allowed opacity-50'
                        }`}
                >
                    Start Matching <ArrowRight size={24} />
                </button>
            </div>

            {/* Right Side: Profile Details */}
            <div className="w-full max-w-sm bg-surface/80 backdrop-blur-xl border border-border rounded-3xl p-6 flex flex-col gap-5 max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl z-10 ring-1 ring-gold/5">
                <div className="flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-xl z-20 py-4 -mx-4 px-4 border-b border-border/50">
                    <div>
                        <h2 className="text-xl font-black text-primary italic tracking-tighter">
                            {isEditing ? "QUICK PREFERENCES" : "YOUR PROFILE"}
                        </h2>
                        {isEditing && <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Update your matching preferences</p>}
                    </div>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-gold hover:text-primary font-bold transition-colors bg-gold/10 hover:bg-gold px-4 py-2 rounded-xl text-sm"
                        >
                            Update Preferences
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-text-muted hover:text-primary text-xs font-bold bg-surface-hover px-3 py-2 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                className="text-white bg-green-500 hover:bg-green-600 text-xs font-bold px-3 py-2 rounded-xl transition-colors shadow-lg shadow-green-500/20"
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-6 pt-2">
                    {/* Avatar - Editable in Edit Mode */}
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[2rem] border-4 border-gold overflow-hidden bg-surface shadow-gold-glow rotate-3 group-hover:rotate-0 transition-all duration-300">
                            <img
                                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {isEditing && (
                            <div
                                className="absolute inset-0 bg-black/40 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rotate-3 group-hover:rotate-0 backdrop-blur-sm cursor-pointer"
                                onClick={() => setIsCapturing(true)}
                            >
                                <Camera className="text-gold drop-shadow-lg" size={32} />
                            </div>
                        )}
                    </div>

                    <div className="w-full flex flex-col gap-6">
                        <div className="space-y-4">
                            {/* Display Name - Show only in View Mode */}
                            {!isEditing && (
                                <div className="text-center">
                                    <h3 className="text-xl font-black text-primary">{user?.displayName || user?.username}</h3>
                                </div>
                            )}

                            {isEditing ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">About (Bio)</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        className="w-full bg-surface-hover/50 border border-border rounded-2xl p-4 text-text-primary text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none resize-none h-28 font-medium transition-all shadow-inner"
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>
                            ) : (
                                <p className="text-text-secondary text-sm text-center font-medium bg-surface-hover/30 p-4 rounded-2xl italic">
                                    "{user?.bio || "No bio yet."}"
                                </p>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-6 border-t border-border pt-6">

                            {/* Edit Full Profile Link */}
                            {isEditing && (
                                <div className="bg-surface-hover/20 border border-border/50 rounded-xl p-4 flex flex-col gap-2 text-center">
                                    <p className="text-xs text-text-muted">Want to change your Name or other settings?</p>
                                    <button
                                        onClick={() => router.push(`/profile/${user?.username}`)}
                                        className="text-gold hover:text-gold-hover text-sm font-bold hover:underline flex items-center justify-center gap-1"
                                    >
                                        Go to Full Profile <ArrowRight size={14} />
                                    </button>
                                </div>
                            )}

                            {/* Country & Region */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Globe size={14} className="text-gold" /> Country & Region
                                </label>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        {/* Country - Editable */}
                                        <select
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                            className="w-full bg-surface-hover/50 border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none font-bold transition-all"
                                        >
                                            <option value="" className="bg-surface">Select Country</option>
                                            {COUNTRIES.map(c => (
                                                <option key={c} value={c} className="bg-surface">{c}</option>
                                            ))}
                                        </select>

                                        <div className="pt-2">
                                            <label className="text-[10px] text-text-muted uppercase font-bold mb-2 block">Region Preference</label>
                                            <MultiSelectDropdown
                                                label=""
                                                placeholder="Select regions..."
                                                options={COUNTRIES.filter(c => c !== 'Pakistan').map(c => ({
                                                    value: c,
                                                    label: c
                                                }))}
                                                selectedValues={formData.region || []}
                                                onChange={(newRegions) => {
                                                    setFormData(prev => ({ ...prev, region: newRegions }));
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-surface-hover/30 border border-border rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-text-muted text-xs font-bold uppercase">Country</span>
                                            <span className="text-primary font-bold text-sm">{user?.country || "Not set"}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-text-muted text-xs font-bold uppercase mt-1">Regions</span>
                                            <div className="flex flex-wrap justify-end gap-1 max-w-[70%]">
                                                {(user?.preferences?.region && Array.isArray(user.preferences.region) && user.preferences.region.length > 0) ? (
                                                    user.preferences.region.map((r: string) => (
                                                        <span key={r} className="px-2 py-1 rounded-md bg-gold/10 text-gold border border-gold/20 text-[10px] font-bold">{r}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-text-muted text-sm">Global</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Profession / Occupation */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase size={14} className="text-orange" /> Occupation
                                </label>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <select
                                            value={formData.profession?.type || ''}
                                            onChange={(e) => setFormData({ ...formData, profession: { ...formData.profession, type: e.target.value } })}
                                            className="w-full bg-surface-hover/50 border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none font-bold transition-all"
                                        >
                                            <option value="">Select Profession</option>
                                            {['Student', 'Software Engineer', 'Doctor', 'Other'].map(p => (
                                                <option key={p} value={p} className="bg-surface">{p}</option>
                                            ))}
                                        </select>

                                        {/* Conditional Inputs based on Type */}
                                        {/* Conditional Inputs based on Type */}
                                        {["Student", "Medical Student"].includes(formData.profession?.type) && (
                                            <div className="relative">
                                                <Input
                                                    value={universitySearch}
                                                    onChange={(e) => {
                                                        setUniversitySearch(e.target.value);
                                                        setShowUniSuggestions(true);
                                                    }}
                                                    onFocus={() => setShowUniSuggestions(true)}
                                                    onBlur={handleUniversityBlur}
                                                    placeholder="Search University..."
                                                    containerClassName="m-0"
                                                />
                                                {showUniSuggestions && universitySearch && (
                                                    <div className="absolute z-50 w-full bg-surface border border-border rounded-xl mt-1 max-h-40 overflow-y-auto shadow-2xl custom-scrollbar ring-1 ring-gold/10">
                                                        {filteredUniversities.length > 0 ? (
                                                            filteredUniversities.map(uni => (
                                                                <div
                                                                    key={uni}
                                                                    className="px-4 py-3 hover:bg-surface-hover cursor-pointer text-sm font-medium border-b border-border/50 last:border-0 text-text-primary"
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
                                        )}

                                        {["Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician"].includes(formData.profession?.type) && (
                                            <Input
                                                value={formData.profession?.hospital || ''}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    profession: { ...formData.profession, hospital: e.target.value }
                                                })}
                                                placeholder="Hospital / Clinic Name"
                                                containerClassName="m-0"
                                            />
                                        )}

                                        {!["Student", "Medical Student", "Doctor", "Nurse", "Therapist", "Pharmacist", "Lab Technician", "Unemployed", "Looking for Opportunities", "Homemaker"].includes(formData.profession?.type) && (
                                            <>
                                                <Input
                                                    value={formData.profession?.company || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        profession: { ...formData.profession, company: e.target.value }
                                                    })}
                                                    placeholder="Company / Organization"
                                                    containerClassName="m-0"
                                                />
                                                <Input
                                                    value={formData.profession?.occupationPlace || ''}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        profession: { ...formData.profession, occupationPlace: e.target.value }
                                                    })}
                                                    placeholder="City / Location"
                                                    containerClassName="m-0"
                                                />
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-surface-hover/30 border border-border rounded-2xl p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center text-orange">
                                            <Briefcase size={16} />
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-text-primary font-bold text-sm">{user?.profession?.type || "Not set"}</p>
                                            {user?.profession?.university && <p className="text-text-muted text-xs">{user.profession.university}</p>}
                                            {user?.profession?.company && <p className="text-text-muted text-xs">{user.profession.company}</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Interests */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Interests</label>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-surface-hover/30 rounded-xl border border-border">
                                            {(formData.interests || []).map(interest => (
                                                <span key={interest} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-gold/10 to-orange/10 text-gold border border-gold/20 text-xs font-bold flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                                    {interest}
                                                    <button onClick={() => removeInterest(interest)} className="hover:text-danger hover:bg-danger/10 rounded-full p-0.5 transition-colors"><X size={12} /></button>
                                                </span>
                                            ))}
                                            {(formData.interests || []).length === 0 && <span className="text-text-muted text-xs p-1">No interests added</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={customInterest}
                                                onChange={(e) => setCustomInterest(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        addInterest(customInterest);
                                                    }
                                                }}
                                                className="flex-1 bg-surface-hover/50 border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none font-medium transition-all"
                                                placeholder="Add interest..."
                                            />
                                            <button onClick={() => addInterest(customInterest)} className="px-4 py-2 bg-gradient-to-r from-gold to-orange rounded-xl font-bold text-sm text-white shadow-gold-glow hover:shadow-lg transition-all">Add</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {INTERESTS_LIST.slice(0, 5).map(interest => (
                                                <button
                                                    key={interest}
                                                    onClick={() => addInterest(interest)}
                                                    className="px-3 py-1.5 rounded-full bg-surface border border-border text-[10px] lowercase font-bold text-text-secondary hover:border-gold hover:text-gold transition-colors"
                                                >
                                                    + {interest}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(user?.interests && user.interests.length > 0) ? (
                                            user.interests.map((i: string) => (
                                                <span key={i} className="px-3 py-1.5 rounded-full bg-surface-hover border border-border text-text-secondary text-xs font-bold hover:border-gold hover:text-gold transition-colors cursor-default">{i}</span>
                                            ))
                                        ) : (
                                            <p className="text-text-muted text-sm italic">No interests added.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Languages */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Languages</label>
                                {isEditing ? (
                                    <div className="space-y-3">
                                        <MultiSelectDropdown
                                            label=""
                                            placeholder="Select regions to see languages..."
                                            options={LANGUAGE_FLAGS.map(lf => ({
                                                value: lf.country,
                                                label: lf.country,
                                                flag: lf.flag,
                                                languages: lf.languages
                                            }))}
                                            selectedValues={formData.languageCountries || []}
                                            onChange={(newCountries) => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    languageCountries: newCountries
                                                    // Do not auto-select languages
                                                }));
                                            }}
                                        />

                                        {/* Available Languages Selection */}
                                        {(formData.languageCountries || []).length > 0 && (
                                            <div className="bg-surface-hover/30 border border-border rounded-xl p-3">
                                                <p className="text-[10px] text-text-muted uppercase font-bold mb-2">Select Languages</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {(() => {
                                                        const availableLanguages = new Set<string>();
                                                        (formData.languageCountries || []).forEach(c => {
                                                            const mapping = COUNTRY_LANGUAGES_MAPPING[c];
                                                            if (mapping) {
                                                                mapping.languages.forEach(l => availableLanguages.add(l));
                                                            }
                                                        });

                                                        if (availableLanguages.size === 0) return <p className="text-xs text-text-muted italic">No languages found for selected regions.</p>;

                                                        const toggleLanguage = (langToToggle: string) => {
                                                            setFormData(prev => {
                                                                const currentLangs = prev.languages || [];
                                                                let newLangs;
                                                                let newCountries = prev.languageCountries || [];

                                                                const isSelected = currentLangs.includes(langToToggle);

                                                                if (isSelected) {
                                                                    // Remove language
                                                                    newLangs = currentLangs.filter(l => l !== langToToggle);
                                                                } else {
                                                                    // Add language
                                                                    newLangs = [...currentLangs, langToToggle];
                                                                }

                                                                // Re-evaluate languageCountries based on newLangs
                                                                // A country should remain if it has at least one language in newLangs
                                                                newCountries = (prev.languageCountries || []).filter(c => {
                                                                    const cLangs = COUNTRY_LANGUAGES_MAPPING[c]?.languages || [];
                                                                    return cLangs.length === 0 || cLangs.some(l => newLangs.includes(l));
                                                                });

                                                                return {
                                                                    ...prev,
                                                                    languages: newLangs,
                                                                    languageCountries: newCountries
                                                                };
                                                            });
                                                        };

                                                        return Array.from(availableLanguages).map(lang => {
                                                            const isSelected = (formData.languages || []).includes(lang);
                                                            return (
                                                                <button
                                                                    key={lang}
                                                                    onClick={() => toggleLanguage(lang)}
                                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${isSelected
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

                                        {/* Selected Languages Summary */}
                                        {(formData.languages || []).length > 0 && (
                                            <div className="pt-4">
                                                <p className="text-[10px] text-text-muted uppercase font-bold mb-2">LANGUAGES INCLUDED</p>
                                                <div className="flex flex-wrap gap-2 p-3 bg-surface-hover/20 border border-border rounded-2xl">
                                                    {(formData.languages || []).map(lang => (
                                                        <span key={lang} className="px-3 py-1.5 rounded-full bg-[#2A2418] text-gold border border-gold/30 text-xs font-bold flex items-center gap-2 shadow-sm">
                                                            {lang}
                                                            <button
                                                                onClick={() => {
                                                                    setFormData(prev => {
                                                                        const newLangs = prev.languages.filter(l => l !== lang);
                                                                        // Check if we should remove any country
                                                                        const newCountries = (prev.languageCountries || []).filter(c => {
                                                                            const cLangs = COUNTRY_LANGUAGES_MAPPING[c]?.languages || [];
                                                                            return cLangs.length === 0 || cLangs.some(l => newLangs.includes(l));
                                                                        });
                                                                        return { ...prev, languages: newLangs, languageCountries: newCountries };
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
                                    </div>
                                ) : (
                                    <div className="bg-surface-hover/30 border border-border rounded-2xl p-4">
                                        <div className="text-text-primary font-bold text-sm">
                                            {(() => {
                                                const langs = user?.preferences?.languages || [];
                                                const countries = user?.preferences?.languageCountries || [];

                                                if (langs.length > 0) {
                                                    const displayLangs = showAllLanguages ? langs : langs.slice(0, 3);
                                                    return (
                                                        <span>
                                                            Speaks {displayLangs.join(', ')}
                                                            {!showAllLanguages && langs.length > 3 && '...'}
                                                            {langs.length > 3 && (
                                                                <button
                                                                    onClick={() => setShowAllLanguages(!showAllLanguages)}
                                                                    className="ml-2 text-gold hover:underline text-sm font-bold"
                                                                >
                                                                    {showAllLanguages ? 'Show Less' : 'Show More'}
                                                                </button>
                                                            )}
                                                        </span>
                                                    );
                                                }
                                                if (countries.length > 0) {
                                                    const displayCountries = showAllLanguages ? countries : countries.slice(0, 3);
                                                    return (
                                                        <span>
                                                            Speaks languages from {displayCountries.join(', ')}
                                                            {!showAllLanguages && countries.length > 3 && '...'}
                                                            {countries.length > 3 && (
                                                                <button
                                                                    onClick={() => setShowAllLanguages(!showAllLanguages)}
                                                                    className="ml-2 text-gold hover:underline text-sm font-bold"
                                                                >
                                                                    {showAllLanguages ? 'Show Less' : 'Show More'}
                                                                </button>
                                                            )}
                                                        </span>
                                                    );
                                                }
                                                return 'Languages not specified';
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            {/* Webcam Capture Modal */}
            {isCapturing && (
                <WebcamCapture
                    onCapture={handleAvatarCapture}
                    onCancel={() => setIsCapturing(false)}
                />
            )}
        </div>
    );
}
