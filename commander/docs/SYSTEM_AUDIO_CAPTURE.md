# System Audio Capture Feature

This document describes the system audio capture feature that allows users to capture audio from their system (e.g., from video calls) and convert it to text for use in chat prompts.

## Overview

The system audio capture feature uses the Web Audio API and Web Speech API to provide low-latency audio-to-text conversion directly in the browser. This allows users to:

- Capture audio from video calls or other system audio sources
- Convert speech to text in real-time
- Append transcribed text to chat prompts

## How to Use

1. **Start Recording**: Click the microphone button (🎤) in the chat input area
2. **Speak or play audio**: The system will capture audio from your selected source
3. **View real-time transcription**: As you speak, interim transcripts will appear in the tooltip
4. **Stop Recording**: Click the stop button (⏹️) to end recording
5. **Transcribed text appears**: The final transcription will be automatically added to your chat input

## Technical Details

### Architecture

```
System Audio → getUserMedia → Web Speech API → Text → Chat Input
```

### Components

1. **`use-system-audio.ts`**: Custom React hook that manages:
   - Media stream acquisition via `getUserMedia`
   - Speech recognition using Web Speech API
   - State management for recording/processing
   - Real-time interim and final transcripts

2. **`ChatInput.tsx`**: UI component with:
   - Microphone button with visual states
   - Tooltip showing recording status and interim transcripts
   - Error display for audio capture failures

### Browser Compatibility

- **Chrome/Edge**: Full support for Web Speech API
- **Safari**: Limited support (requires webkit prefix)
- **Firefox**: No native support for Web Speech API

### Platform-Specific Notes

#### System Audio Capture

The implementation attempts to capture system audio using the `chromeMediaSource: 'desktop'` constraint, which is supported in Chromium-based browsers when running in Electron/Tauri environments.

**Fallback Behavior**: If system audio capture fails, the hook automatically falls back to capturing from the default microphone.

#### macOS

- May require Screen Recording permission
- Users will be prompted to grant permission on first use

#### Windows

- WASAPI loopback support via browser
- Should work without additional configuration

#### Linux

- PulseAudio/PipeWire support via browser
- May require additional system permissions

## Configuration

### Tauri Permissions

The `tauri.conf.json` includes the necessary security capabilities:

```json
{
  "security": {
    "capabilities": [
      {
        "identifier": "main-capability",
        "windows": ["main"],
        "permissions": ["core:default", "core:window:allow-start-dragging"]
      }
    ]
  }
}
```

## Limitations

1. **Browser-dependent**: Requires Web Speech API support
2. **English-only**: Currently configured for English language (`en-US`)
3. **Network required**: Web Speech API may use cloud services for recognition
4. **Privacy**: Audio is processed by browser speech recognition services

## Future Enhancements

Potential improvements:

1. **Offline Support**: Integrate local speech-to-text models (e.g., Whisper.cpp)
2. **Multi-language**: Add language selection UI
3. **Custom Audio Source**: Allow users to select specific audio input devices
4. **Audio Quality Settings**: Add controls for sample rate, bitrate, etc.
5. **Recording History**: Save and replay audio recordings

## Troubleshooting

### "Speech recognition is not supported in this browser"

**Solution**: Use a Chromium-based browser (Chrome, Edge, or Brave)

### "System audio capture failed, falling back to microphone"

**Solution**:
- On macOS: Grant Screen Recording permission in System Preferences → Security & Privacy
- On Windows: Ensure the application has microphone access
- On Linux: Check PulseAudio/PipeWire configuration

### Transcription is inaccurate

**Solution**:
- Speak clearly and at a moderate pace
- Reduce background noise
- Ensure good audio quality from your system
- Consider using push-to-talk pattern (start/stop recording for each sentence)

## Code Examples

### Using the Hook

```typescript
import { useSystemAudio } from '@/hooks/use-system-audio'

function MyComponent() {
  const {
    isRecording,
    startRecording,
    stopRecording,
    interimTranscript,
    error,
  } = useSystemAudio({
    onTranscript: (text) => {
      console.log('Final transcript:', text)
    },
    onError: (error) => {
      console.error('Audio error:', error)
    },
  })

  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? 'Stop' : 'Start'} Recording
    </button>
  )
}
```

## References

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
