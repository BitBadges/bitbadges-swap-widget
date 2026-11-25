import React, { useState, useCallback } from 'react';
import {
  MIN_SLIPPAGE_PERCENT,
  MAX_SLIPPAGE_PERCENT,
  HIGH_SLIPPAGE_WARNING_PERCENT,
} from '../hooks/useSwapExecute';

interface SlippageSettingsProps {
  value: string;
  onChange: (value: string) => void;
}

const PRESETS = ['0.5', '1', '3'];

export function SlippageSettings({ value, onChange }: SlippageSettingsProps) {
  const [isCustom, setIsCustom] = useState(!PRESETS.includes(value));
  const [customInput, setCustomInput] = useState(
    !PRESETS.includes(value) ? value : ''
  );
  const [showSettings, setShowSettings] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingHighSlippage, setPendingHighSlippage] = useState<string | null>(
    null
  );

  const handlePreset = useCallback(
    (preset: string) => {
      setIsCustom(false);
      setCustomInput('');
      setValidationError(null);
      setPendingHighSlippage(null);
      onChange(preset);
    },
    [onChange]
  );

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) {
        return;
      }

      setIsCustom(true);
      setCustomInput(raw);

      if (raw === '' || raw === '.') {
        setValidationError(null);
        setPendingHighSlippage(null);
        return;
      }

      const parsed = Number(raw);
      if (
        !Number.isFinite(parsed) ||
        parsed < MIN_SLIPPAGE_PERCENT ||
        parsed > MAX_SLIPPAGE_PERCENT
      ) {
        setPendingHighSlippage(null);
        setValidationError(
          `Slippage must be between ${MIN_SLIPPAGE_PERCENT}% and ${MAX_SLIPPAGE_PERCENT}%`
        );
        return;
      }

      setValidationError(null);

      if (parsed > HIGH_SLIPPAGE_WARNING_PERCENT) {
        setPendingHighSlippage(raw);
        return;
      }

      setPendingHighSlippage(null);
      onChange(raw);
    },
    [onChange]
  );

  const handleConfirmHighSlippage = useCallback(() => {
    if (!pendingHighSlippage) return;
    const parsed = Number(pendingHighSlippage);
    if (
      Number.isFinite(parsed) &&
      parsed >= MIN_SLIPPAGE_PERCENT &&
      parsed <= MAX_SLIPPAGE_PERCENT
    ) {
      onChange(pendingHighSlippage);
      setPendingHighSlippage(null);
    }
  }, [pendingHighSlippage, onChange]);

  const activeNumeric = Number(value);
  const showActiveHighWarning =
    !pendingHighSlippage &&
    !validationError &&
    Number.isFinite(activeNumeric) &&
    activeNumeric > HIGH_SLIPPAGE_WARNING_PERCENT;

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
              value={isCustom ? customInput : ''}
              onChange={handleCustomChange}
              aria-label="Custom slippage percentage"
              aria-invalid={Boolean(validationError)}
            />
            <span className="bb-slippage__percent">%</span>
          </div>

          {validationError && (
            <div className="bb-slippage__error" role="alert">
              {validationError}
            </div>
          )}

          {pendingHighSlippage && (
            <div className="bb-slippage__warning" role="alert">
              <span>
                High slippage ({pendingHighSlippage}%) may result in unfavorable
                trades.
              </span>
              <button
                type="button"
                className="bb-slippage__confirm"
                onClick={handleConfirmHighSlippage}
              >
                Confirm {pendingHighSlippage}% slippage
              </button>
            </div>
          )}

          {showActiveHighWarning && (
            <div className="bb-slippage__warning">
              High slippage may result in unfavorable trades
            </div>
          )}
        </div>
      )}
    </div>
  );
}
