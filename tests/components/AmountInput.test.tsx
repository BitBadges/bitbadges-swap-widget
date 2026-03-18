import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { AmountInput } from '../../src/components/AmountInput';

describe('AmountInput', () => {
  it('should render with placeholder', () => {
    render(<AmountInput value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('should display current value', () => {
    render(<AmountInput value="123.45" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('123.45')).toBeInTheDocument();
  });

  it('should call onChange with valid numeric input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AmountInput value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('0.00');
    await user.type(input, '100');

    // Should have been called for each character
    expect(onChange).toHaveBeenCalled();
  });

  it('should show MAX button when maxAmount is provided', () => {
    render(
      <AmountInput value="" onChange={vi.fn()} maxAmount="1000" />
    );
    expect(screen.getByText('MAX')).toBeInTheDocument();
  });

  it('should call onChange with maxAmount when MAX is clicked', () => {
    const onChange = vi.fn();
    render(
      <AmountInput value="" onChange={onChange} maxAmount="999" />
    );

    fireEvent.click(screen.getByText('MAX'));
    expect(onChange).toHaveBeenCalledWith('999');
  });

  it('should show denom symbol', () => {
    render(
      <AmountInput value="100" onChange={vi.fn()} denomSymbol="BADGE" />
    );
    expect(screen.getByText('BADGE')).toBeInTheDocument();
  });

  it('should show estimated output in output mode', () => {
    render(
      <AmountInput
        value=""
        onChange={vi.fn()}
        estimatedOutput="12345"
        isOutput
      />
    );
    expect(screen.getByDisplayValue('12345')).toBeInTheDocument();
  });

  it('should be read-only in output mode', () => {
    render(
      <AmountInput
        value=""
        onChange={vi.fn()}
        estimatedOutput="12345"
        isOutput
      />
    );
    const input = screen.getByDisplayValue('12345');
    expect(input).toHaveAttribute('readonly');
  });

  it('should show label', () => {
    render(
      <AmountInput value="" onChange={vi.fn()} label="Amount" />
    );
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });
});
