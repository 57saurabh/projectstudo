import { Smartphone, Monitor, Square } from 'lucide-react';

interface RatioSelectorProps {
    selectedRatio: '16:9' | '9:16' | '1:1';
    onChange: (ratio: '16:9' | '9:16' | '1:1') => void;
}

export default function RatioSelector({ selectedRatio, onChange }: RatioSelectorProps) {
    const ratios = [
        { id: '16:9', label: 'Landscape', icon: Monitor },
        { id: '9:16', label: 'Portrait', icon: Smartphone },
        { id: '1:1', label: 'Square', icon: Square },
    ] as const;

    return (
        <div className="flex gap-2 w-full">
            {ratios.map((ratio) => (
                <button
                    key={ratio.id}
                    onClick={() => onChange(ratio.id)}
                    className={`flex-1 flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                        selectedRatio === ratio.id
                            ? 'bg-primary/20 border-primary text-white'
                            : 'bg-glass-bg border-glass-border text-gray-400 hover:bg-glass-border'
                    }`}
                >
                    <ratio.icon size={20} />
                    <span className="text-xs font-medium">{ratio.label}</span>
                </button>
            ))}
        </div>
    );
}
