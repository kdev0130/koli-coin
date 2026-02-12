import React from 'react';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { cn } from '@/lib/utils';
import { IconPhone, IconAlertCircle } from '@tabler/icons-react';
import 'react-phone-number-input/style.css';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = "Enter phone number",
  className,
  required = false
}) => {
  const isValid = value ? isValidPhoneNumber(value) : true;
  const hasError = error || (!isValid && value);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
          <IconPhone size={20} />
        </div>
        
        <PhoneInput
          international
          countryCallingCodeEditable={false}
          defaultCountry="US"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "phone-input-custom",
            hasError && "phone-input-error"
          )}
        />
        
        {hasError && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
            <IconAlertCircle size={20} />
          </div>
        )}
      </div>
      
      {hasError && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <IconAlertCircle size={16} />
          {error || "Invalid phone number format"}
        </p>
      )}
      
      {!hasError && value && isValid && (
        <p className="mt-1 text-sm text-green-600 flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white"></div>
          </div>
          Valid phone number format
        </p>
      )}
      
      <style>{`
        .phone-input-custom .PhoneInputInput {
          border: 2px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.75rem 3rem 0.75rem 3.5rem;
          font-size: 1rem;
          transition: all 0.2s;
          background: white;
          width: 100%;
        }
        
        .phone-input-custom .PhoneInputInput:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .phone-input-custom .PhoneInputInput:disabled {
          background-color: #f9fafb;
          cursor: not-allowed;
          opacity: 0.6;
        }
        
        .phone-input-error .PhoneInputInput {
          border-color: #ef4444;
          background-color: #fef2f2;
        }
        
        .phone-input-error .PhoneInputInput:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }
        
        .phone-input-custom .PhoneInputCountrySelect {
          position: absolute;
          left: 3.5rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        
        .phone-input-custom .PhoneInputCountrySelectArrow {
          display: none;
        }
        
        .phone-input-custom .PhoneInputCountryIcon {
          width: 1.25rem;
          height: 1.25rem;
        }
      `}</style>
    </div>
  );
};