import React from 'react';
import type { SwapEstimateResponse } from '../types';

interface ComplianceWarningProps {
  estimate: SwapEstimateResponse | null;
  complianceMode: boolean;
}

export function ComplianceWarning({ estimate, complianceMode }: ComplianceWarningProps) {
  if (!complianceMode || !estimate) return null;

  const { complianceNotPassedWarning, complianceErrorMessage } = estimate.estimate;

  if (!complianceNotPassedWarning) return null;

  return (
    <div className="bb-compliance-warning" role="alert">
      <div className="bb-compliance-warning__icon" aria-hidden="true">
        {'\u26A0'}
      </div>
      <div className="bb-compliance-warning__content">
        <strong className="bb-compliance-warning__title">
          Transfer Restriction Detected
        </strong>
        <p className="bb-compliance-warning__message">
          {complianceErrorMessage ||
            'One or more tokens in this swap have transfer restrictions that may prevent the transaction from completing.'}
        </p>
      </div>
    </div>
  );
}
