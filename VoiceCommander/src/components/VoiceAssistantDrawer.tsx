import {
  Mic,
  Square,
  X,
} from 'lucide-react';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useVoiceRecognition,
  VoiceLanguage,
} from '../hooks/useVoiceRecognition';

import {
  useCommandExecutor,
} from '../hooks/useCommandExecutor';

import {
  NLPResult,
} from '../types';

const chips = [
  'Add 1 litre milk',
  'Add two milk and one bread',
  'Mujhe do milk aur ek bread chahiye',
  'Show deals under ₹50',
];

export default function VoiceAssistantDrawer({
  onClose,
}: {
  onClose: () => void;
}) {
  const voice =
    useVoiceRecognition();

  const {
    execute,
  } = useCommandExecutor();

  const [
    language,
    setLanguage,
  ] = useState<VoiceLanguage>(
    'auto'
  );

  const processedResultRef =
    useRef<NLPResult | null>(null);

  useEffect(() => {
    if (!voice.result) {
      processedResultRef.current =
        null;

      return;
    }

    if (
      processedResultRef.current ===
      voice.result
    ) {
      return;
    }

    processedResultRef.current =
      voice.result;

    voice.clearResult();

    execute(
      voice.result
    );
  }, [
    voice.result,
    execute,
    voice.clearResult,
  ]);

  const text =
    voice.interimTranscript ||
    voice.transcript;

  const handleMicClick = () => {
    if (
      voice.voiceState ===
      'processing'
    ) {
      return;
    }

    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening(
        language
      );
    }
  };

  return (
    <aside
      className="voice-drawer-overlay"
      onMouseDown={onClose}
    >
      <div
        className="voice-drawer"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="drawer-head">
          <div>
            <b>
              🎙 Voice Assistant
            </b>

            <span>
              Speak your complete order naturally
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="voice-language-row">
          <button
            type="button"
            className={
              language === 'auto'
                ? 'active'
                : ''
            }
            onClick={() =>
              setLanguage('auto')
            }
          >
            Auto / Hinglish
          </button>

          <button
            type="button"
            className={
              language === 'english'
                ? 'active'
                : ''
            }
            onClick={() =>
              setLanguage('english')
            }
          >
            English
          </button>

          <button
            type="button"
            className={
              language === 'hindi'
                ? 'active'
                : ''
            }
            onClick={() =>
              setLanguage('hindi')
            }
          >
            हिंदी
          </button>
        </div>

        <button
          type="button"
          className={
            `drawer-orb ${
              voice.isListening
                ? 'listening'
                : ''
            }`
          }
          onClick={handleMicClick}
          disabled={
            !voice.supported ||
            voice.voiceState ===
              'processing'
          }
        >
          {voice.isListening ? (
            <Square size={40} />
          ) : (
            <Mic size={48} />
          )}
        </button>

        <div className="voice-status">
          <b>
            {
              voice.isListening
                ? 'Listening — speak your full order'
                : voice.voiceState ===
                    'processing'
                  ? 'Processing your order…'
                  : 'Tap the microphone and speak naturally'
            }
          </b>

          <p>
            {
              text ||
              'Example: “Add two milk, one bread and three bananas to my cart.”'
            }
          </p>

          {voice.error && (
            <small className="voice-error">
              {voice.error}
            </small>
          )}
        </div>

        <div className="drawer-chips">
          {chips.map((chip) => (
            <button
              type="button"
              key={chip}
              onClick={() =>
                voice.processText(chip)
              }
            >
              {chip}
            </button>
          ))}
        </div>

        <small className="voice-tip">
          One microphone session can contain your complete order.
        </small>

        <small className="drawer-powered">
          Powered by VoiceCart AI
        </small>
      </div>
    </aside>
  );
}