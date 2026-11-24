import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SlippageSettings } from '../../src/components/SlippageSettings';

describe('SlippageSettings', () => {
  it('selects preset slippage values directly', () => {
    const onChange = vi.fn();
    render(<SlippageSettings value="1" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Slippage: 1%/i }));
    fireEvent.click(screen.getByRole('button', { name: '3%' }));

    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('applies valid custom slippage <= 5% immediately', () => {
    const onChange = vi.fn();
    render(<SlippageSettings value="1" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Slippage: 1%/i }));
    const input = screen.getByLabelText('Custom slippage percentage');
    fireEvent.change(input, { target: { value: '2.5' } });

    expect(onChange).toHaveBeenCalledWith('2.5');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects out-of-range custom slippage (> 50% or <= 0%) without calling onChange', () => {
    const onChange = vi.fn();
    render(<SlippageSettings value="1" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Slippage: 1%/i }));
    const input = screen.getByLabelText('Custom slippage percentage');

    fireEvent.change(input, { target: { value: '99' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /between 0\.01% and 50%/i
    );

    fireEvent.change(input, { target: { value: '0' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /between 0\.01% and 50%/i
    );
  });

  it('requires explicit confirmation for high slippage between 5% and 50%', () => {
    const onChange = vi.fn();
    render(<SlippageSettings value="1" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /Slippage: 1%/i }));
    const input = screen.getByLabelText('Custom slippage percentage');

    fireEvent.change(input, { target: { value: '10' } });
    expect(onChange).not.toHaveBeenCalled();

    const confirmBtn = screen.getByRole('button', {
      name: /Confirm 10% slippage/i,
    });
    fireEvent.click(confirmBtn);
    expect(onChange).toHaveBeenCalledWith('10');
  });
});
