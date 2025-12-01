import { useState, useEffect } from 'react';
import { Camera, Mic, ChevronDown } from 'lucide-react';

interface DeviceSelectorProps {
    selectedVideoDevice: string;
    selectedAudioDevice: string;
    onVideoDeviceChange: (deviceId: string) => void;
    onAudioDeviceChange: (deviceId: string) => void;
}

export default function DeviceSelector({
    selectedVideoDevice,
    selectedAudioDevice,
    onVideoDeviceChange,
    onAudioDeviceChange
}: DeviceSelectorProps) {
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission first to get labels
                await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                
                const devices = await navigator.mediaDevices.enumerateDevices();
                setVideoDevices(devices.filter(device => device.kind === 'videoinput'));
                setAudioDevices(devices.filter(device => device.kind === 'audioinput'));
            } catch (error) {
                console.error('Error enumerating devices:', error);
            }
        };

        getDevices();
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    return (
        <div className="flex flex-col gap-4 w-full">
            {/* Video Device Selector */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Camera size={18} />
                </div>
                <select
                    value={selectedVideoDevice}
                    onChange={(e) => onVideoDeviceChange(e.target.value)}
                    className="w-full bg-glass-bg border border-glass-border rounded-xl pl-10 pr-10 py-3 text-white appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                    {videoDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                        </option>
                    ))}
                    {videoDevices.length === 0 && <option value="">No camera found</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <ChevronDown size={18} />
                </div>
            </div>

            {/* Audio Device Selector */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mic size={18} />
                </div>
                <select
                    value={selectedAudioDevice}
                    onChange={(e) => onAudioDeviceChange(e.target.value)}
                    className="w-full bg-glass-bg border border-glass-border rounded-xl pl-10 pr-10 py-3 text-white appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                    {audioDevices.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                        </option>
                    ))}
                    {audioDevices.length === 0 && <option value="">No microphone found</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <ChevronDown size={18} />
                </div>
            </div>
        </div>
    );
}
