import { useCallback, useEffect, useRef, useState } from 'react';
import { parseCommand } from '../utils/nlp';
import { NLPResult } from '../types';

export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'success'
  | 'error';

export type VoiceLanguage =
  | 'auto'
  | 'english'
  | 'hindi';

const browserLanguages: Record<VoiceLanguage, string> = {
  auto: 'en-IN',
  english: 'en-IN',
  hindi: 'hi-IN',
};

const apiBase = (
  import.meta.env.VITE_API_URL || ''
).replace(/\/$/, '');

function pickMimeType() {
  if (!window.MediaRecorder) return '';

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  return (
    types.find((type) =>
      MediaRecorder.isTypeSupported(type)
    ) || ''
  );
}

export function useVoiceRecognition() {
  const [voiceState, setVoiceState] =
    useState<VoiceState>('idle');

  const [transcript, setTranscript] =
    useState('');

  const [interimTranscript, setInterimTranscript] =
    useState('');

  const [error, setError] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<NLPResult | null>(null);

  const [supported, setSupported] =
    useState(true);

  const recorderRef =
    useRef<MediaRecorder | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const chunksRef =
    useRef<BlobPart[]>([]);

  const browserRecognitionRef =
    useRef<SpeechRecognition | null>(null);

  const finalRef =
    useRef('');

  const startingRef =
    useRef(false);

  const startTokenRef =
    useRef(0);

  useEffect(() => {
    const hasRecorder =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder !== 'undefined';

    const hasBrowserSpeech = Boolean(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

    setSupported(
      hasRecorder || hasBrowserSpeech
    );

    return () => {
      startTokenRef.current += 1;

      try {
        recorderRef.current?.stop();
      } catch {}

      try {
        browserRecognitionRef.current?.abort();
      } catch {}

      streamRef.current
        ?.getTracks()
        .forEach((track) => track.stop());
    };
  }, []);

  const processText = useCallback(
    (text: string) => {
      const clean = text.trim();

      if (!clean) {
        setVoiceState('idle');
        return;
      }

      setTranscript(clean);
      setInterimTranscript('');
      setVoiceState('processing');

      setResult(
        parseCommand(clean)
      );
    },
    []
  );

  const transcribeWithBackend =
    useCallback(
      async (
        blob: Blob,
        language: VoiceLanguage
      ) => {
        const form = new FormData();

        const extension =
          blob.type.includes('mp4')
            ? 'm4a'
            : blob.type.includes('ogg')
              ? 'ogg'
              : 'webm';

        form.append(
          'audio',
          blob,
          `voice-order.${extension}`
        );

        form.append(
          'language_mode',
          language
        );

        const response = await fetch(
          `${apiBase}/api/transcribe`,
          {
            method: 'POST',
            body: form,
          }
        );

        if (!response.ok) {
          let message =
            'Multilingual transcription is unavailable.';

          try {
            const data =
              await response.json();

            message =
              data.detail || message;
          } catch {}

          throw new Error(message);
        }

        const data:
          { text?: string } =
          await response.json();

        return (
          data.text || ''
        ).trim();
      },
      []
    );

  const startBrowserFallback =
    useCallback(
      (language: VoiceLanguage) => {
        const SR =
          window.SpeechRecognition ||
          window.webkitSpeechRecognition;

        if (!SR) {
          setSupported(false);

          setVoiceState('error');

          setError(
            'Voice input is not supported in this browser.'
          );

          return;
        }

        finalRef.current = '';

        const recognition =
          new SR();

        recognition.continuous = true;

        recognition.interimResults = true;

        recognition.lang =
          browserLanguages[language];

        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
          startingRef.current = false;

          setVoiceState('listening');
        };

        recognition.onresult = (
          event: SpeechRecognitionEvent
        ) => {
          let interim = '';
          let finals = '';

          for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
          ) {
            const text =
              event.results[i][0].transcript;

            if (
              event.results[i].isFinal
            ) {
              finals += `${text} `;
            } else {
              interim += text;
            }
          }

          if (finals) {
            finalRef.current =
              `${finalRef.current} ${finals}`.trim();

            setTranscript(
              finalRef.current
            );
          }

          setInterimTranscript(
            interim
          );
        };

        recognition.onerror = (
          event: SpeechRecognitionErrorEvent
        ) => {
          if (
            event.error === 'aborted'
          ) {
            return;
          }

          const messages:
            Record<string, string> = {
              'not-allowed':
                'Microphone access was blocked. Enable it in browser settings.',

              'no-speech':
                'No speech was detected. Please try again.',

              'audio-capture':
                'No microphone was found.',

              network:
                'The browser speech service had a network error.',

              'language-not-supported':
                'The selected language is not supported by this browser.',
            };

          setError(
            messages[event.error] ||
              'Voice recognition failed. Please try again.'
          );

          setVoiceState('error');

          browserRecognitionRef.current =
            null;
        };

        recognition.onend = () => {
          startingRef.current = false;

          browserRecognitionRef.current =
            null;

          setInterimTranscript('');

          if (
            finalRef.current.trim()
          ) {
            processText(
              finalRef.current
            );
          } else {
            setVoiceState(
              (state) =>
                state === 'listening'
                  ? 'idle'
                  : state
            );
          }
        };

        browserRecognitionRef.current =
          recognition;

        try {
          recognition.start();
        } catch {
          startingRef.current = false;

          setVoiceState('error');

          setError(
            'Could not start voice recognition.'
          );
        }
      },
      [processText]
    );

  const startListening =
    useCallback(
      async (
        language: VoiceLanguage = 'auto'
      ) => {
        if (
          startingRef.current ||
          recorderRef.current?.state ===
            'recording' ||
          browserRecognitionRef.current
        ) {
          return;
        }

        startingRef.current = true;

        const token =
          ++startTokenRef.current;

        setError(null);

        setTranscript('');

        setInterimTranscript(
          'Listening…'
        );

        setResult(null);

        finalRef.current = '';

        setVoiceState(
          'listening'
        );

        if (
          !navigator.mediaDevices?.getUserMedia ||
          !window.MediaRecorder
        ) {
          startingRef.current = false;

          startBrowserFallback(
            language
          );

          return;
        }

        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                },
              }
            );

          if (
            token !==
            startTokenRef.current
          ) {
            stream
              .getTracks()
              .forEach(
                (track) => track.stop()
              );

            startingRef.current = false;

            return;
          }

          const mimeType =
            pickMimeType();

          const recorderOptions:
            MediaRecorderOptions = {
              audioBitsPerSecond: 32000,
            };

          if (mimeType) {
            recorderOptions.mimeType =
              mimeType;
          }

          const recorder =
            new MediaRecorder(
              stream,
              recorderOptions
            );

          streamRef.current =
            stream;

          recorderRef.current =
            recorder;

          chunksRef.current = [];

          recorder.ondataavailable = (
            event
          ) => {
            if (
              event.data.size > 0
            ) {
              chunksRef.current.push(
                event.data
              );
            }
          };

          recorder.onerror = () => {
            startingRef.current =
              false;

            setError(
              'Recording failed. Please try again.'
            );

            setVoiceState('error');
          };

          recorder.onstop =
            async () => {
              recorderRef.current =
                null;

              startingRef.current =
                false;

              stream
                .getTracks()
                .forEach(
                  (track) => track.stop()
                );

              streamRef.current =
                null;

              const blob =
                new Blob(
                  chunksRef.current,
                  {
                    type:
                      recorder.mimeType ||
                      'audio/webm',
                  }
                );

              if (
                !blob.size
              ) {
                setVoiceState(
                  'idle'
                );

                setError(
                  'No audio was recorded. Please try again.'
                );

                return;
              }

              setVoiceState(
                'processing'
              );

              setInterimTranscript(
                'Transcribing your complete order…'
              );

              try {
                const text =
                  await transcribeWithBackend(
                    blob,
                    language
                  );

                setInterimTranscript('');

                if (!text) {
                  setVoiceState(
                    'error'
                  );

                  setError(
                    'I could not understand the audio. Please try again.'
                  );

                  return;
                }

                processText(
                  text
                );
              } catch (
                backendError
              ) {
                setInterimTranscript('');

                const message =
                  backendError instanceof Error
                    ? backendError.message
                    : 'Multilingual transcription failed.';

                if (
                  window.SpeechRecognition ||
                  window.webkitSpeechRecognition
                ) {
                  setError(
                    `${message} Using browser voice recognition as a fallback.`
                  );

                  startBrowserFallback(
                    language
                  );
                } else {
                  setVoiceState(
                    'error'
                  );

                  setError(
                    message
                  );
                }
              }
            };

          recorder.start(1000);

          startingRef.current =
            false;

          setInterimTranscript(
            'Listening… Speak your complete order, then tap Stop.'
          );

          setVoiceState(
            'listening'
          );
        } catch (
          recordingError
        ) {
          startingRef.current =
            false;

          const message =
            recordingError instanceof
              DOMException &&
            recordingError.name ===
              'NotAllowedError'
              ? 'Microphone access was blocked. Enable it in browser settings.'
              : 'Could not access the microphone.';

          setError(message);

          setVoiceState('error');
        }
      },
      [
        processText,
        startBrowserFallback,
        transcribeWithBackend,
      ]
    );

  const stopListening =
    useCallback(() => {
      startTokenRef.current += 1;

      startingRef.current = false;

      if (
        recorderRef.current &&
        recorderRef.current.state !==
          'inactive'
      ) {
        recorderRef.current.stop();

        return;
      }

      try {
        browserRecognitionRef.current?.stop();
      } catch {}
    }, []);

  useEffect(() => {
    if (result) {
      setVoiceState(
        result.intent === 'UNKNOWN'
          ? 'error'
          : 'success'
      );
    }
  }, [result]);

  return {
    voiceState,

    isListening:
      voiceState === 'listening',

    transcript,

    interimTranscript,

    error,

    result,

    supported,

    startListening,

    stopListening,

    processText,

    reset: () => {
      setVoiceState('idle');

      setTranscript('');

      setInterimTranscript('');

      setError(null);

      setResult(null);
    },

    clearResult: () =>
      setResult(null),
  };
}