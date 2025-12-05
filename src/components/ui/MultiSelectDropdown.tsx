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
            <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">{label}</label>
            
            {/* Trigger Area */}
            <div 
                className={`min-h-[42px] w-full bg-black/20 border rounded-lg px-3 py-2 cursor-pointer transition-all flex items-center justify-between ${
                    isOpen ? 'border-[#7f19e6] ring-1 ring-[#7f19e6]/50' : 'border-white/10 hover:border-white/30'
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
                                        className="px-2 py-1 rounded-full bg-[#7f19e6]/20 border border-[#7f19e6]/30 text-[#7f19e6] text-xs flex items-center gap-1 animate-in zoom-in-95 duration-200"
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
                                            className="hover:text-white transition-colors"
                                        >
                                            <X size={12} />
                                        </div>
                                    </span>
                                );
                            })}
                            {extraCount > 0 && (
                                <div className="relative group">
                                    <span className="px-2 py-1 rounded-full bg-white/10 text-white/70 text-xs border border-white/10 hover:bg-white/20 transition-colors">
                                        +{extraCount} more
                                    </span>
                                    {/* Tooltip for extra items */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] bg-black/90 border border-white/10 rounded-lg p-2 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 flex flex-col gap-1">
                                         {selectedValues.slice(limit).map(val => (
                                             <span key={val} className="text-xs text-white/80 block truncate">{val}</span>
                                         ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-white/30 text-sm truncate">{placeholder}</span>
                    )}
                </div>
                <ChevronDown size={16} className={`text-white/50 transition-transform duration-300 ml-2 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[300px] bg-[#191121] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                   
                   {/* Search Input */}
                   <div className="p-2 border-b border-white/10 sticky top-0 bg-[#191121] z-10">
                       <input 
                           autoFocus
                           type="text" 
                           placeholder="Search..." 
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#7f19e6] outline-none placeholder:text-white/20"
                       />
                   </div>

                   <div className="h-[280px] overflow-y-auto custom-scrollbar p-2">
                        <div className="grid grid-cols-2 gap-2">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => toggleOption(option)}
                                            className={`
                                                relative flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all border group
                                                ${isSelected 
                                                    ? 'bg-[#7f19e6]/10 border-[#7f19e6] shadow-[0_0_10px_rgba(127,25,230,0.1)]' 
                                                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
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
                                                <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-white/70'}`}>
                                                    {option.label}
                                                </span>
                                            </div>

                                            {isSelected && (
                                                <div className="flex items-center gap-2">
                                                    <div 
                                                        role="button"
                                                        onClick={(e) => removeValue(option.value, e)}
                                                        className="bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-white/50 rounded-full p-1 transition-colors z-10"
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
                                <div className="col-span-2 py-4 text-center text-white/30 text-xs">
                                    No results found
                                </div>
                            )}
                        </div>
                   </div>
                   
                   {/* Footer/Hint - Optional */}
                   <div className="px-3 py-2 bg-white/5 border-t border-white/5 text-[10px] text-white/30 flex justify-between">
                        <span>{selectedValues.length} selected</span>
                       {/* <span>Scroll for more</span> */}
                   </div>
                </div>
            )}
        </div>
    );
}
