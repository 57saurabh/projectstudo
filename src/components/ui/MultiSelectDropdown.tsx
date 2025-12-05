'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import Image from 'next/image';

interface Option {
    value: string;
    label: string;
    flag?: any; // Can be string URL or imported SVG object
    languages?: string[];
}

interface MultiSelectDropdownProps {
    label: string;
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    onSelect?: (item: Option) => void;
    placeholder?: string;
}

export default function MultiSelectDropdown({
    label,
    options,
    selectedValues,
    onChange,
    onSelect,
    placeholder = 'Select options...'
}: MultiSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleOption = (option: Option) => {
        let newValues: string[];
        if (selectedValues.includes(option.value)) {
            newValues = selectedValues.filter(v => v !== option.value);
        } else {
            newValues = [...selectedValues, option.value];
        }
        
        onChange(newValues);
        if (onSelect) {
            onSelect(option);
        }
    };

    const removeValue = (valueToRemove: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newValues = selectedValues.filter(v => v !== valueToRemove);
        onChange(newValues);
        
        // Find option to trigger onSelect if needed (for deselection logic if required)
        // Usually onSelect is more for "adding" logic, but if we need symmetric logic we might need to handle it.
        // For now, simple removal is enough as the parent usually re-calculates based on selectedValues.
        const option = options.find(o => o.value === valueToRemove);
        if (option && onSelect) {
             onSelect(option);
        }
    };
    
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);

    useEffect(() => {
        setFilteredOptions(
            options.filter(option => 
                option.label.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    }, [searchQuery, options]);

    // Reset search when closed
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    // Helper to get option details for selected values
    const getSelectedOption = (value: string) => options.find(o => o.value === value);

    const limit = 2;
    const extraCount = selectedValues.length - limit;

    return (
        <div className="w-full relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">{label}</label>
            
            {/* Trigger Area */}
            <div 
                className={`min-h-[42px] w-full bg-surface-hover/50 border rounded-2xl px-4 py-3 cursor-pointer transition-all flex items-center justify-between shadow-sm ${
                    isOpen ? 'border-gold ring-1 ring-gold/50' : 'border-border hover:border-gold/50'
                }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex flex-wrap gap-2 flex-1 min-w-0">
                    {selectedValues.length > 0 ? (
                        <>
                            {selectedValues.slice(0, limit).map(value => {
                                const option = getSelectedOption(value);
                                return (
                                    <span 
                                        key={value} 
                                        className="px-2.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold text-xs font-bold flex items-center gap-1.5 animate-in zoom-in-95 duration-200"
                                    >
                                        {option?.flag && (
                                            <div className="w-4 h-3 relative shrink-0">
                                                <Image 
                                                    src={option.flag} 
                                                    alt={option.label} 
                                                    fill 
                                                    className="object-cover rounded-[1px]" 
                                                />
                                            </div>
                                        )}
                                        <span className="truncate max-w-[100px]">{value}</span>
                                        <div 
                                            role="button"
                                            onMouseDown={(e) => removeValue(value, e)} 
                                            className="hover:text-text-primary transition-colors"
                                        >
                                            <X size={12} />
                                        </div>
                                    </span>
                                );
                            })}
                            {extraCount > 0 && (
                                <div className="relative group">
                                    <span className="px-2.5 py-1 rounded-full bg-surface-hover text-text-muted text-xs font-bold border border-border hover:bg-surface-hover/80 transition-colors">
                                        +{extraCount} more
                                    </span>
                                    {/* Tooltip for extra items */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-background border border-border rounded-xl p-3 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 flex flex-col gap-1">
                                         {selectedValues.slice(limit).map(val => (
                                             <span key={val} className="text-xs text-text-secondary block truncate font-medium">{val}</span>
                                         ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-text-muted text-sm truncate font-medium">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-text-muted transition-transform duration-300 ml-2 shrink-0 ${isOpen ? 'rotate-180 text-gold' : ''}`} />
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[300px] bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                   
                   {/* Search Input */}
                   <div className="p-3 border-b border-border sticky top-0 bg-surface z-10">
                       <input 
                           autoFocus
                           type="text" 
                           placeholder="Search..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full bg-surface-hover border border-border rounded-xl px-4 py-2 text-sm text-text-primary focus:border-gold outline-none placeholder:text-text-muted font-medium transition-colors"
                       />
                   </div>

                   <div className="h-[280px] overflow-y-auto scrollbar-hide p-3">
                        <div className="grid grid-cols-2 gap-2">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => toggleOption(option)}
                                            className={`
                                                relative flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border group
                                                ${isSelected 
                                                    ? 'bg-gold/10 border-gold/50 shadow-sm' 
                                                    : 'bg-surface-hover/30 border-transparent hover:bg-surface-hover hover:border-border'
                                                }
                                            `}
                                        >
                                            <div className="w-8 h-6 relative shrink-0 shadow-sm">
                                                {option.flag && (
                                                    <Image 
                                                        src={option.flag} 
                                                        alt={option.label} 
                                                        fill 
                                                        className="object-cover rounded-sm"
                                                    />
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-gold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                                    {option.label}
                                                </span>
                                            </div>

                                            {isSelected && (
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        role="button"
                                                        onClick={(e) => removeValue(option.value, e)}
                                                        className="bg-surface hover:bg-danger/20 hover:text-danger text-text-muted rounded-full p-1 transition-colors z-10"
                                                        title="Remove"
                                                    >
                                                        <X size={12} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-8 text-center text-text-muted text-sm font-medium">
                                    No results found
                                </div>
                            )}
                        </div>
                   </div>
                   
                   {/* Footer/Hint - Optional */}
                   <div className="px-4 py-3 bg-surface-hover/50 border-t border-border text-[10px] text-text-muted flex justify-between font-bold uppercase tracking-wider">
                        <span>{selectedValues.length} selected</span>
                       {/* <span>Scroll for more</span> */}
                   </div>
                </div>
            )}
        </div>
    );
}
