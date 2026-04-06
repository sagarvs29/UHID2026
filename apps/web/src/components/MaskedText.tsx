import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface MaskedTextProps {
  /** The full unmasked value */
  value: string;
  /** The masked version to display by default */
  maskedValue: string;
  /** Optional className for the container */
  className?: string;
  /** If true, starts revealed */
  defaultRevealed?: boolean;
}

/**
 * Click-to-reveal component for sensitive data.
 * Shows masked text by default with an eye icon toggle.
 */
export default function MaskedText({
  value,
  maskedValue,
  className = '',
  defaultRevealed = false,
}: MaskedTextProps) {
  const [revealed, setRevealed] = useState(defaultRevealed);

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono text-sm">
        {revealed ? value : maskedValue}
      </span>
      <button
        type="button"
        onClick={() => setRevealed(!revealed)}
        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
        title={revealed ? 'Hide' : 'Reveal'}
      >
        {revealed ? (
          <EyeOff className="w-3.5 h-3.5" />
        ) : (
          <Eye className="w-3.5 h-3.5" />
        )}
      </button>
    </span>
  );
}
