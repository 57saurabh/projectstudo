import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: LucideIcon;
    rightElement?: React.ReactNode;
    error?: string;
    containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
    label, 
    icon: Icon, 
    rightElement,
    error, 
    className = '', 
    containerClassName = '',
    disabled,
    ...props 
}, ref) => {
    return (
        <div className={`space-y-2 ${containerClassName}`}>
            {label && (
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-text-muted transition-colors duration-300 ${disabled ? '' : 'group-focus-within:text-gold'}`}>
                        <Icon size={20} />
                    </div>
                )}
                <input
                    ref={ref}
                    disabled={disabled}
                    className={`
                        w-full bg-surface-hover/50 border rounded-2xl py-3.5 
                        ${Icon ? 'pl-12' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'}
                        text-text-primary font-medium
                        outline-none transition-all duration-300
                        placeholder:text-text-muted
                        disabled:opacity-60 disabled:cursor-not-allowed
                        focus:bg-surface-hover
                        ${error 
                            ? 'border-danger/50 focus:border-danger focus:ring-1 focus:ring-danger' 
                            : 'border-border focus:border-gold focus:ring-1 focus:ring-gold hover:border-gold/30'}
                        ${className}
                    `}
                    {...props}
                />
                {rightElement && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        {rightElement}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs font-bold text-danger ml-1 animate-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
