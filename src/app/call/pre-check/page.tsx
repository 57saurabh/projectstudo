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
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { remoteFaceDetectionService } from '@/lib/ai/RemoteFaceDetectionService';

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
    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        country: '',
        language: ''
    });

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
                    language: res.data.language || ''
                });
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

    // ... (inside component)

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
                // Use Remote Face Detection Service
                const result = await remoteFaceDetectionService.detect(videoEl);

                if (result && result.faceDetected) {
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

    const handleStartMatching = () => {
        if (faceDetected) {
            router.push('/call/random');
        }
    };

    const handleSaveProfile = async () => {
        if (!token) return;
        try {
            const res = await axios.put('/api/user/me', formData, {
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

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#191121] text-white">Loading...</div>;

    return (
        <div className="flex min-h-screen w-full flex-col lg:flex-row items-center justify-center bg-[#191121] p-6 gap-8">
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
            <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Country</label>
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
                                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Language</label>
                                {isEditing ? (
                                    <select
                                        value={formData.language}
                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-[#7f19e6] outline-none mt-1 appearance-none"
                                    >
                                        <option value="" className="bg-[#191121]">Select Language</option>
                                        {LANGUAGES.map(l => (
                                            <option key={l} value={l} className="bg-[#191121]">{l}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-white text-sm">{user?.language || "Not set"}</p>
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
