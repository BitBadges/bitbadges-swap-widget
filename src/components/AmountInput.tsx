import React, { useCallback } from 'react';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Estimated output amount (display-only) */
  estimatedOutput?: string;
  /** Label for the input */
  label?: string;
  /** Denom symbol shown next to the amount */
  denomSymbol?: string;
  /** Max available balance */
  maxAmount?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether this is the output side (read-only) */
  isOutput?: boolean;
}

export function AmountInput({
  value,
  onChange,
  estimatedOutput,
  label,
  denomSymbol,
  maxAmount,
  disabled = false,
  isOutput = false,
}: AmountInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Allow empty, digits, and one decimal point
      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
        onChange(raw);
      }
    },
    [onChange]
  );

  const handleMax = useCallback(() => {
    if (maxAmount) {
      onChange(maxAmount);
    }
  }, [maxAmount, onChange]);

  const displayValue = isOutput ? estimatedOutput || '' : value;

  return (
    <div className="bb-amount-input">
      {label && <label className="bb-amount-input__label">{label}</label>}

      <div className="bb-amount-input__wrapper">
        <input
          className="bb-amount-input__field"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={displayValue}
          onChange={handleChange}
          disabled={disabled || isOutput}
          readOnly={isOutput}
          aria-label={label || 'Amount'}
        />

        <div className="bb-amount-input__suffix">
          {denomSymbol && (
            <span className="bb-amount-input__denom">{denomSymbol}</span>
          )}
          {maxAmount && !isOutput && (
            <button
              type="button"
              className="bb-amount-input__max"
              onClick={handleMax}
              disabled={disabled}
            >
              MAX
            </button>
          )}
        </div>
      </div>

      {isOutput && estimatedOutput && (
        <span className="bb-amount-input__estimate-label">Estimated output</span>
      )}
    </div>
  );
}
