import { PendingInvite } from '@/lib/store/useCallStore';

interface IncomingInviteProps {
    pendingInvite: PendingInvite | null;
    onAccept: (senderId: string) => void;
    onReject: () => void;
}

export default function IncomingInvite({ pendingInvite, onAccept, onReject }: IncomingInviteProps) {
    if (!pendingInvite) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Incoming Invite</h3>
            <div className="w-24 h-24 rounded-full border-4 border-[#7f19e6] overflow-hidden bg-gray-800 mb-4">
                <img
                    src={pendingInvite.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${pendingInvite.senderId}`}
                    alt="Sender Avatar"
                    className="w-full h-full object-cover"
                />
            </div>
            <p className="text-white/80 mb-8 text-lg">
                <span className="font-bold text-white">{pendingInvite.senderName}</span> wants you to join their call.
            </p>
            <div className="flex gap-4 w-full max-w-xs">
                <button
                    onClick={onReject}
                    className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                >
                    Decline
                </button>
                <button
                    onClick={() => onAccept(pendingInvite.senderId)}
                    className="flex-1 py-3 rounded-xl bg-[#7f19e6] text-white font-bold hover:bg-[#6d14c4] transition-colors shadow-lg shadow-[#7f19e6]/20"
                >
                    Accept
                </button>
            </div>
        </div>
    );
}
