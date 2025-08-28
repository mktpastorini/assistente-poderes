// src/types/global.d.ts
interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  SpeechSynthesisUtterance: typeof SpeechSynthesisUtterance;
  SpeechSynthesis: typeof SpeechSynthesis;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare var SpeechSynthesisUtterance: {
  prototype: SpeechSynthesisUtterance;
  new (text?: string): SpeechSynthesisUtterance;
};

declare var SpeechSynthesis: {
  prototype: SpeechSynthesis;
  new (): SpeechSynthesis;
};