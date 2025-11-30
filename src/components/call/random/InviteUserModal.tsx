import { useState } from 'react';

interface InviteUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInvite: (targetId: string) => void;
}

export default function InviteUserModal({ isOpen, onClose, onInvite }: InviteUserModalProps) {
    const [inviteTargetId, setInviteTargetId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inviteTargetId.trim()) {
            onInvite(inviteTargetId.trim());
            setInviteTargetId('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#191121] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Invite User</h3>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-sm font-medium text-white/60 mb-1">User ID</label>
                        <input
                            type="text"
                            value={inviteTargetId}
                            onChange={(e) => setInviteTargetId(e.target.value)}
                            placeholder="Enter User ID..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7f19e6] focus:ring-1 focus:ring-[#7f19e6] outline-none transition-colors"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!inviteTargetId.trim()}
                            className="flex-1 py-2.5 rounded-lg bg-[#7f19e6] text-white font-bold hover:bg-[#6d14c4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send Invite
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
