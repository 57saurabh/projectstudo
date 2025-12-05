'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import LocalVideo from '@/components/video/LocalVideo';
import { ScanFace, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useCallStore } from '@/lib/store/useCallStore';
import { useWebRTC } from '@/lib/webrtc/useWebRTC';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store/store';
import WebcamCapture from '@/components/profile/WebcamCapture';
import { COUNTRIES, LANGUAGES, INTERESTS_LIST, UNIVERSITIES_LIST, COUNTRY_LANGUAGES_MAPPING, LANGUAGE_FLAGS } from '@/lib/constants';
import { faceDetectionService } from '@/lib/ai/FaceDetectionService';
import Image from 'next/image';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';

export default function PreCheckPage() {
    const router = useRouter();
    // Initialize WebRTC (requests permissions and starts stream)
    useWebRTC();

    const { localStream, setLocalStream, setMediaError } = useCallStore();
    // Get token from Redux
    const { token } = useSelector((state: RootState) => state.auth);

    const [isScanning, setIsScanning] = useState(true);
    const [faceDetected, setFaceDetected] = useState(false);
    const [checkStatus, setCheckStatus] = useState<'success' | 'failed' | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const scanningRef = useRef(false);
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
                // It doesn't return { faceDetected: boolean } like the remote service.
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

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#191121] text-white">Loading...</div>;

    const isIndia = formData.country === 'India';
    const filteredUniversities = UNIVERSITIES_LIST.filter(u => u.toLowerCase().includes(universitySearch.toLowerCase()));

    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row items-center justify-center bg-[#191121] p-4 lg:p-6 gap-6 lg:gap-8">
            {/* Hidden Video and Canvas for Capture */}
            <video ref={videoRef} autoPlay muted playsInline className="hidden" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Left Side: Camera Check */}
            <div className="w-full max-w-md flex flex-col gap-6">
                <div className="text-center lg:text-left">
                    <h1 className="text-3xl font-bold text-white mb-2">Camera Check</h1>
                    <p className="text-white/60">We verify your face continuously.</p>
                </div>

                <div className="relative aspect-[4/3] w-full bg-black rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
                    <LocalVideo />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className={`absolute inset-0 border-4 transition-colors duration-300 ${faceDetected ? 'border-green-500/50' : 'border-red-500/50'
                            }`} />

                        {!faceDetected && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ScanFace size={64} className="text-white/50 animate-pulse" />
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2">
                        {faceDetected ? (
                            <>
                                <CheckCircle size={16} className="text-green-500" />
                                <span className="text-white text-sm font-medium">Face Detected</span>
                            </>
                        ) : (
                            <>
                                <XCircle size={16} className="text-red-500" />
                                <span className="text-white text-sm font-medium">No Face</span>
                            </>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleStartMatching}
                    disabled={!faceDetected}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${faceDetected
                        ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                        : 'bg-gray-700 text-white/30 cursor-not-allowed'
                        }`}
                >
                    Start Matching <ArrowRight size={20} />
                </button>
            </div>

            {/* Right Side: Profile Details */}
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between sticky top-0 bg-[#191121]/90 backdrop-blur-sm z-10 py-2 -mx-2 px-2">
                    <h2 className="text-xl font-bold text-white">Your Profile</h2>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="text-[#7f19e6] hover:text-[#6d14c4] text-sm font-bold"
                        >
                            Edit
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="text-white/60 hover:text-white text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                className="text-green-400 hover:text-green-300 text-sm font-bold"
                            >
                                Save
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => setIsCapturing(true)}>
                        <div className="w-24 h-24 rounded-full border-4 border-[#7f19e6] overflow-hidden bg-gray-800">
                            <img
                                src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs font-bold">Change</span>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Username</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7f19e6] outline-none mt-1"
                                />
                            ) : (
                                <p className="text-white font-medium text-lg">{user?.displayName || user?.username}</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">About</label>
                            {isEditing ? (
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7f19e6] outline-none mt-1 resize-none h-20"
                                    placeholder="Tell us about yourself..."
                                />
                            ) : (
                                <p className="text-white/80 text-sm">{user?.bio || "No bio yet."}</p>
                            )}
                        </div>

                        {/* Country & Region */}
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Country of Residence</label>
                                {isEditing ? (
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7f19e6] outline-none mt-1 appearance-none"
                                    >
                                        <option value="" className="bg-[#191121]">Select Country</option>
                                        {COUNTRIES.map(c => (
                                            <option key={c} value={c} className="bg-[#191121]">{c}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-white text-sm">{user?.country || "Not set"}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Region Preference</label>
                                {isEditing ? (
                                    <div className="bg-black/20 border border-white/10 rounded-lg p-2 max-h-40 overflow-y-auto custom-scrollbar mt-1">
                                        <div className="grid grid-cols-2 gap-1">
                                            {COUNTRIES.filter(c => c !== 'Pakistan').map(c => {
                                                const isSelected = (Array.isArray(formData.region) ? formData.region : []).includes(c);
                                                return (
                                                    <div 
                                                        key={c}
                                                        onClick={() => toggleRegion(c)}
                                                        className={`cursor-pointer px-2 py-1.5 rounded text-xs transition-all flex items-center justify-between ${
                                                            isSelected 
                                                            ? 'bg-[#7f19e6]/20 border border-[#7f19e6] text-[#7f19e6]' 
                                                            : 'bg-white/5 border border-transparent hover:bg-white/10 text-white/70'
                                                        }`}
                                                    >
                                                        <span className="truncate">{c}</span>
                                                        {isSelected && <CheckCircle size={10} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(user?.region && Array.isArray(user.region) && user.region.length > 0) ? (
                                            user.region.map((r: string) => (
                                                <span key={r} className="px-2 py-0.5 rounded-full bg-white/10 text-white/80 text-[10px]">{r}</span>
                                            ))
                                        ) : (
                                            <p className="text-white text-sm">Global</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">University</label>
                                {isEditing ? (
                                    <div className="relative">
                                        <input
                                            type="text"
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
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7f19e6] outline-none mt-1"
                                            placeholder="Search University..."
                                        />
                                        {showUniSuggestions && universitySearch && (
                                            <div className="absolute z-20 w-full bg-[#191121] border border-white/10 rounded-lg mt-1 max-h-40 overflow-y-auto shadow-xl custom-scrollbar">
                                                {filteredUniversities.length > 0 ? (
                                                    filteredUniversities.map(uni => (
                                                        <div
                                                            key={uni}
                                                            className="px-3 py-2 hover:bg-white/10 cursor-pointer text-sm text-white"
                                                            onClick={() => selectUniversity(uni)}
                                                        >
                                                            {uni}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-3 py-2 text-white/50 text-sm">No matches found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-white text-sm">{user?.university || "Not set"}</p>
                                )}
                            </div>
                        </div>

                        {/* Interests */}
                        <div>
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Interests</label>
                            {isEditing ? (
                                <div className="mt-1 space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                        {(formData.interests || []).map(interest => (
                                            <span key={interest} className="px-2 py-1 rounded-full bg-[#7f19e6]/20 text-[#7f19e6] text-xs flex items-center gap-1">
                                                {interest}
                                                <button onClick={() => removeInterest(interest)} className="hover:text-white"><XCircle size={12} /></button>
                                            </span>
                                        ))}
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
                                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7f19e6] outline-none"
                                            placeholder="Add interest..."
                                        />
                                        <button onClick={() => addInterest(customInterest)} className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 text-xs text-white">Add</button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {INTERESTS_LIST.slice(0, 5).map(interest => (
                                            <button
                                                key={interest}
                                                onClick={() => addInterest(interest)}
                                                className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70 hover:border-[#7f19e6] transition-colors"
                                            >
                                                {interest}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {(user?.interests && user.interests.length > 0) ? (
                                        user.interests.map((i: string) => (
                                            <span key={i} className="px-2 py-1 rounded-full bg-white/10 text-white/80 text-xs">{i}</span>
                                        ))
                                    ) : (
                                        <p className="text-white/50 text-sm">No interests added.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Languages */}
                        {/* Languages */}
                        {/* Languages */}
                        <div className="relative">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1 block">Languages (Flags)</label>
                            {isEditing ? (
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
                                <div className="flex flex-wrap gap-2 mt-1 min-h-[42px] items-center">
                                    {(user?.languageCountries && user.languageCountries.length > 0) ? (
                                        user.languageCountries.map((c: string) => {
                                            const mapping = COUNTRY_LANGUAGES_MAPPING[c];
                                            return mapping ? (
                                                <div key={c} className="w-8 h-6 relative shrink-0 shadow-sm border border-white/10 rounded-sm" title={c}>
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
                                        <p className="text-white/50 text-sm">No languages set.</p>
                                    )}
                                </div>
                            )}
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
