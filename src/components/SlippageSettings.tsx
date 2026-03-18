import React, { useState, useCallback } from 'react';

interface SlippageSettingsProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = ['0.5', '1', '3'];

export function SlippageSettings({ value, onChange }: SlippageSettingsProps) {
  const [isCustom, setIsCustom] = useState(!PRESETS.includes(value));
  const [showSettings, setShowSettings] = useState(false);

  const handlePreset = useCallback(
    (preset: string) => {
      setIsCustom(false);
      onChange(preset);
    },
    [onChange]
  );

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
        setIsCustom(true);
        onChange(raw || '1');
      }
    },
    [onChange]
  );

  return (
    <div className="bb-slippage">
      <button
        type="button"
        className="bb-slippage__toggle"
        onClick={() => setShowSettings(!showSettings)}
        aria-expanded={showSettings}
      >
        <span className="bb-slippage__icon">{'\u2699'}</span>
        <span>Slippage: {value}%</span>
      </button>

      {showSettings && (
        <div className="bb-slippage__panel">
          <div className="bb-slippage__presets">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`bb-slippage__preset ${
                  !isCustom && value === preset ? 'bb-slippage__preset--active' : ''
                }`}
                onClick={() => handlePreset(preset)}
              >
                {preset}%
              </button>
            ))}
          </div>

          <div className="bb-slippage__custom">
            <input
              className="bb-slippage__custom-input"
              type="text"
              inputMode="decimal"
              placeholder="Custom"
              value={isCustom ? value : ''}
              onChange={handleCustomChange}
              aria-label="Custom slippage percentage"
            />
            <span className="bb-slippage__percent">%</span>
          </div>

          {parseFloat(value) > 5 && (
            <div className="bb-slippage__warning">
              High slippage may result in unfavorable trades
            </div>
          )}
        </div>
      )}
    </div>
  );
}
