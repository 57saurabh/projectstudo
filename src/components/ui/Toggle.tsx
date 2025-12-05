import React from 'react';
import { motion } from 'framer-motion';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    activeColor?: 'gold' | 'green' | 'danger';
}

const Toggle: React.FC<ToggleProps> = ({ 
    checked, 
    onChange, 
    size = 'md', 
    disabled = false,
    activeColor = 'gold'
}) => {
    const sizeClasses = {
        sm: 'w-10 h-6',
        md: 'w-14 h-8',
        lg: 'w-16 h-9'
    };

    const handleClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-7 h-7'
    };
    
    // Map activeColor prop to actual Tailwind color classes
    const colorMap = {
        gold: 'bg-gold shadow-gold-glow',
        green: 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]',
        danger: 'bg-danger shadow-danger-glow'
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
                relative rounded-full transition-all duration-300 ease-in-out border
                ${sizeClasses[size]}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${checked 
                    ? `${colorMap[activeColor]} border-transparent` 
                    : 'bg-surface-hover border-border hover:border-text-muted/50'}
            `}
        >
            <motion.div
                layout
                transition={{
                    type: "spring",
                    stiffness: 700,
                    damping: 30
                }}
                className={`
                    absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm bg-white
                    ${handleClasses[size]}
                `}
                animate={{
                     left: checked 
                        ? (size === 'sm' ? 'calc(100% - 1.15rem)' : size === 'md' ? 'calc(100% - 1.75rem)' : 'calc(100% - 2rem)') 
                        : '0.25rem'
                }}
            />
        </button>
    );
};

export default Toggle;
