import { render, screen, fireEvent } from '@testing-library/react';
import TouchButton from '../../../app/components/UI/TouchButton';

describe('TouchButton Component', () => {
  it('renders button with text', () => {
    render(<TouchButton>Click me</TouchButton>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<TouchButton onClick={handleClick}>Click me</TouchButton>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<TouchButton loading>Loading</TouchButton>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Loading');
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<TouchButton variant="primary">Primary</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<TouchButton variant="secondary">Secondary</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<TouchButton variant="success">Success</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-success');

    rerender(<TouchButton variant="danger">Danger</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<TouchButton size="sm">Small</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-2', 'text-sm');

    rerender(<TouchButton size="md">Medium</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('px-4', 'py-3', 'text-base');

    rerender(<TouchButton size="lg">Large</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');

    rerender(<TouchButton size="xl">Extra Large</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-xl');
  });

  it('is disabled when disabled prop is true', () => {
    render(<TouchButton disabled>Disabled</TouchButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<TouchButton className="custom-class">Custom</TouchButton>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('has touch-optimized classes', () => {
    render(<TouchButton>Touch Button</TouchButton>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('touch-manipulation', 'active:scale-95');
  });
});