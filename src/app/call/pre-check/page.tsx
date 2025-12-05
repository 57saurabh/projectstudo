'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LocalVideo from '@/components/video/LocalVideo';
import { ScanFace, CheckCircle, XCircle, ArrowRight, User as UserIcon, Briefcase, Globe, X } from 'lucide-react';
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
    useWebRTC();

    const { localStream } = useCallStore();
    // Get token from Redux
    const { token } = useSelector((state: RootState) => state.auth);

    const [faceDetected, setFaceDetected] = useState(false);
    const [checkStatus, setCheckStatus] = useState<'success' | 'failed' | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

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
        university: '',
        interests: [] as string[],
        languages: [] as string[],
        languageCountries: [] as string[]
    });

    // Custom Input State
    const [customInterest, setCustomInterest] = useState('');
    const [universitySearch, setUniversitySearch] = useState('');
    const [showUniSuggestions, setShowUniSuggestions] = useState(false);

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
                    region: res.data.region || [],
                    university: res.data.university || '',
                    interests: res.data.interests || [],
                    languages: res.data.languages || [],
                    languageCountries: res.data.languageCountries || []
                });
                setUniversitySearch(res.data.university || '');
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
            const payload = {
                ...formData,
                university: UNIVERSITIES_LIST.includes(universitySearch) ? universitySearch : ''
            };
            const res = await axios.put('/api/user/me', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert('Failed to update profile');
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
        setFormData(prev => ({ ...prev, university: uni }));
        setShowUniSuggestions(false);
    };

    const handleUniversityBlur = () => {
        setTimeout(() => {
            setShowUniSuggestions(false);
            if (!UNIVERSITIES_LIST.includes(universitySearch)) {
                setUniversitySearch(formData.university || '');
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
        <div className="flex min-h-screen w-full flex-col lg:flex-row items-center justify-center bg-background p-4 lg:p-6 gap-6 lg:gap-8 transition-colors duration-300">
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
            <div className="w-full max-w-md bg-surface/80 backdrop-blur-xl border border-border rounded-3xl p-8 flex flex-col gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl z-10 ring-1 ring-gold/5">
                <div className="flex items-center justify-between sticky top-0 bg-surface/95 backdrop-blur-xl z-20 py-4 -mx-4 px-4 border-b border-border/50">
                    <h2 className="text-2xl font-black text-primary italic tracking-tighter">YOUR PROFILE</h2>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-gold hover:text-primary font-bold transition-colors bg-gold/10 hover:bg-gold px-4 py-2 rounded-xl"
                        >
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-text-muted hover:text-primary text-sm font-bold bg-surface-hover px-4 py-2 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                className="text-white bg-green-500 hover:bg-green-600 text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-green-500/20"
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-6 pt-2">
                    <div className="relative group cursor-pointer" onClick={() => setIsCapturing(true)}>
                        <div className="w-32 h-32 rounded-[2rem] border-4 border-gold overflow-hidden bg-surface shadow-gold-glow rotate-3 group-hover:rotate-0 transition-all duration-300">
                            <img
                                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 rotate-3 group-hover:rotate-0 backdrop-blur-sm">
                            <span className="text-white font-bold uppercase tracking-widest text-xs bg-gold/90 px-4 py-2 rounded-xl shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">Change Photo</span>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Display Name"
                                icon={UserIcon}
                                value={isEditing ? formData.displayName : (user?.displayName || user?.username)}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                disabled={!isEditing}
                                className={!isEditing ? "border-transparent bg-transparent pl-0 text-xl text-center font-black text-primary pointer-events-none shadow-none" : ""}
                                containerClassName={!isEditing ? "items-center text-center" : ""}
                                placeholder="Your Name"
                            />

                            {isEditing ? (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">About</label>
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
                            {/* Country & Region */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Globe size={14} className="text-gold" /> Country & Region
                                </label>
                                {isEditing ? (
                                    <div className="space-y-3">
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

                                        <div className="bg-surface-hover/30 border border-border rounded-xl p-3 max-h-40 overflow-y-auto custom-scrollbar">
                                            <p className="text-[10px] text-text-muted uppercase font-bold mb-2">Region Preference</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {COUNTRIES.filter(c => c !== 'Pakistan').map(c => {
                                                    const isSelected = (Array.isArray(formData.region) ? formData.region : []).includes(c);
                                                    return (
                                                        <div
                                                            key={c}
                                                            onClick={() => toggleRegion(c)}
                                                            className={`cursor-pointer px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${isSelected
                                                                ? 'bg-gold/10 border-gold/50 text-gold shadow-sm'
                                                                : 'bg-surface border-transparent hover:bg-surface-hover text-text-secondary'
                                                                }`}
                                                        >
                                                            <span className="truncate">{c}</span>
                                                            {isSelected && <CheckCircle size={12} />}
                                                        </div>
                                                    );
                                                })}
                                            </div>
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
                                                {(user?.region && Array.isArray(user.region) && user.region.length > 0) ? (
                                                    user.region.map((r: string) => (
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

                            {/* University */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Briefcase size={14} className="text-orange" /> University
                                </label>
                                {isEditing ? (
                                    <div className="relative">
                                        <Input
                                            value={universitySearch}
                                            onChange={(e) => {
                                                setUniversitySearch(e.target.value);
                                                setShowUniSuggestions(true);
                                                if (formData.university && e.target.value !== formData.university) {
                                                    setFormData({ ...formData, university: '' });
                                                }
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
                                ) : (
                                    <div className="bg-surface-hover/30 border border-border rounded-2xl p-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange/10 flex items-center justify-center text-orange">
                                            <Briefcase size={16} />
                                        </div>
                                        <p className="text-text-primary font-bold text-sm">{user?.university || "Not set"}</p>
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
                                    <MultiSelectDropdown
                                        label=""
                                        placeholder="Select countries..."
                                        options={LANGUAGE_FLAGS.map(lf => ({
                                            value: lf.country,
                                            label: lf.country,
                                            flag: lf.flag,
                                            languages: lf.languages
                                        }))}
                                        selectedValues={formData.languageCountries || []}
                                        onChange={(newCountries) => {
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
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2 min-h-[42px] items-center bg-surface-hover/30 border border-border rounded-2xl p-3">
                                        {(user?.languageCountries && user.languageCountries.length > 0) ? (
                                            user.languageCountries.map((c: string) => {
                                                const mapping = COUNTRY_LANGUAGES_MAPPING[c];
                                                return mapping ? (
                                                    <div key={c} className="w-8 h-6 relative shrink-0 shadow-sm border border-border/50 rounded-sm hover:scale-110 transition-transform cursor-help" title={c}>
                                                        <Image
                                                            src={mapping.flag}
                                                            alt={c}
                                                            fill
                                                            className="object-cover rounded-[1px]"
                                                        />
                                                    </div>
                                                ) : null;
                                            })
                                        ) : (
                                            <p className="text-text-muted text-sm italic">No languages set.</p>
                                        )}
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
