import { Mic, Square } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import { useAudioAnalyser } from '../hooks/useAudioAnalyser';

type VoiceButtonProps = {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
};

export default function VoiceButton({
  listening,
  onStart,
  onStop,
}: VoiceButtonProps) {
  const levels = useAudioAnalyser(listening);

  const handleClick = () => {
    if (listening) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <div className="relative isolate flex h-44 w-44 items-center justify-center">
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
        <AudioVisualizer
          levels={levels}
          isActive={listening}
        />
      </div>

      <button
        type="button"
        onClick={handleClick}
        className={`relative z-20 flex h-28 w-28 cursor-pointer items-center justify-center rounded-full shadow-card transition-transform duration-200 ${
          listening
            ? 'scale-105 bg-brand-600 text-white'
            : 'bg-brand-500 text-white hover:scale-105 active:scale-95'
        }`}
        aria-label={
          listening
            ? 'Stop voice recording'
            : 'Start voice recording'
        }
      >
        {listening ? (
          <Square size={30} />
        ) : (
          <Mic size={38} />
        )}
      </button>
    </div>
  );
}