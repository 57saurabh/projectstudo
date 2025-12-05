import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    glow = false,
    className = '',
    ...props
}) => {
    // Gen-Z rounded (rounded-full or rounded-2xl), bold text
    const baseStyles = "px-6 py-3 rounded-2xl font-bold tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        // Gold Primary
        primary: "bg-gold text-white hover:bg-gold-hover",
        // Orange Secondary
        secondary: "bg-orange text-white hover:bg-orange-hover",
        // Ghost / Outline
        ghost: "bg-surface border border-border text-text-secondary hover:bg-surface-hover hover:text-white hover:border-gold/50",
        // Danger
        danger: "bg-danger text-white hover:bg-danger-hover"
    };

    // Conditional Glows
    const getGlow = () => {
        if (!glow) return "";
        switch (variant) {
            case 'primary': return "shadow-gold-glow";
            case 'secondary': return "shadow-orange-glow";
            case 'danger': return "shadow-danger-glow";
            default: return "";
        }
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${getGlow()} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
