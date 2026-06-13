import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';

interface CustomSelectProps {
  label: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  name?: string;
  onActionClick?: () => void;
  actionLabel?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  options,
  value,
  onChange,
  name = '',
  onActionClick,
  actionLabel,
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.id === value);

  const handleSelect = (optionId: string) => {
    onChange({ target: { name, value: optionId } });
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button 
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 h-10 px-3 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${!selectedOption && !value ? 'text-gray-500' : ''}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.name : label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Hidden native input for required validation if needed, though mostly handled by form state */}
      {required && (
        <input 
          type="text"
          name={name}
          value={value}
          onChange={() => {}}
          required={required}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          tabIndex={-1}
        />
      )}

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full min-w-[160px] bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-lg overflow-hidden py-1">
          {/* We might want a default "All" or "None" option. For most forms, we just use the options list. If label is not meant to be selected, we don't map it. */}
          
          <div className="max-h-[200px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[var(--text-sm)] text-[var(--color-text-primary)] hover:bg-gray-50 transition-colors border-b border-[var(--color-border)] last:border-b-0"
                onClick={() => handleSelect(opt.id)}
              >
                {opt.name}
                {value === opt.id && <Check className="w-4 h-4 text-[var(--color-accent)] shrink-0 ml-2" />}
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">No options available</div>
            )}
          </div>

          {onActionClick && actionLabel && (
            <div className="border-t border-[var(--color-border)] mt-1 pt-1 bg-white sticky bottom-0">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-[var(--text-sm)] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  onActionClick();
                }}
              >
                <Plus className="w-4 h-4" />
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
