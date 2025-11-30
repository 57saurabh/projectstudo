import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger';
    glow?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    glow = false,
    className = '',
    ...props
}) => {
    const baseStyles = "px-6 py-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2";

    const variants = {
        primary: "bg-neon-gradient text-black hover:scale-105",
        ghost: "bg-transparent border border-glass-border text-white hover:bg-white/5",
        danger: "bg-alert text-white hover:bg-red-600"
    };

    const glowStyle = glow ? "shadow-neon" : "";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${glowStyle} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};
