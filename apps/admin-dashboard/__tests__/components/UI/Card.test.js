import { render, screen } from '@testing-library/react';
import Card from '../../../app/components/UI/Card';

describe('Card Component', () => {
  it('renders card with children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Card title="Test Title">
        <p>Content</p>
      </Card>
    );
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Title');
  });

  it('renders subtitle when provided', () => {
    render(
      <Card title="Title" subtitle="Test subtitle">
        <p>Content</p>
      </Card>
    );
    
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });

  it('renders header action when provided', () => {
    const headerAction = <button>Action</button>;
    
    render(
      <Card title="Title" headerAction={headerAction}>
        <p>Content</p>
      </Card>
    );
    
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <Card className="custom-class" data-testid="card">
        <p>Content</p>
      </Card>
    );
    
    expect(screen.getByTestId('card')).toHaveClass('custom-class');
  });

  it('does not render header when no title, subtitle, or action provided', () => {
    render(
      <Card>
        <p>Content only</p>
      </Card>
    );
    
    // Should not have any heading elements
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});