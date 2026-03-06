import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  backTo?: string;
}

export function PageHeader({ title, backTo = '/' }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mt-4 mb-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(backTo)}
        className="h-9 w-9"
        aria-label="Back to home"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-xl font-bold flex-1 text-center">{title}</h1>
      <ThemeToggle />
    </div>
  );
}
