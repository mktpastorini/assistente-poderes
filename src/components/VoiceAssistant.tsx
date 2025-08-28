"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Mic, StopCircle, Play } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";

interface VoiceAssistantProps {
  welcomeMessage?: string;
  openAiApiKey: string;
  systemPrompt?: string;
  assistantPrompt?: string;
  model?: string;
  conversationMemoryLength: number;
  voiceModel: "browser" | "openai-tts" | "gemini-tts";
  activationPhrase: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const OPENAI_CHAT_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TTS_API_URL = "https://api.openai.com/v1/audio/speech";

const useSpeechRecognition = (
  onResult: (transcript: string) => void,
  onError: (error: string) => void,
  onStart: () => void,
  onEnd: () => void,
  lang = "pt-BR"
) => {
  const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);
  const isRecognitionActive = useRef(false);
  const isStartingRecognition = useRef(false);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isRecognitionActive.current && !isStartingRecognition.current) {
      isStartingRecognition.current = true;
      try {
        recognitionRef.current.start();
        isRecognitionActive.current = true;
        onStart();
      } catch (error) {
        if (error instanceof DOMException && error.name === "InvalidStateError") {
          // Already started, ignore
          console.warn("Recognition already started, ignoring.");
        } else {
          onError(String(error));
        }
      } finally {
        isStartingRecognition.current = false;
      }
    }
  }, [onError, onStart]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isRecognitionActive.current) {
      recognitionRef.current.stop();
      isRecognitionActive.current = false;
    }
  }, []);

  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      onError("Seu navegador não suporta reconhecimento de fala.");
      return;
    }

    recognitionRef.current = new SpeechRecognitionConstructor();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = lang;

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      onResult(transcript);
    };

    recognitionRef.current.onstart = () => {
      isRecognitionActive.current = true;
      onStart();
    };

    recognitionRef.current.onend = () => {
      isRecognitionActive.current = false;
      onEnd();
    };

    recognitionRef.current.onerror = (event) => {
      isRecognitionActive.current = false;
      onError(event.error);
      // Try to restart if needed
      if (event.error !== "aborted") {
        setTimeout(() => {
          startListening();
        }, 500);
      }
    };

    return () => {
      stopListening();
    };
  }, [lang, onEnd, onError, onResult, onStart, startListening, stopListening]);

  return { startListening, stopListening, isRecognitionActive: isRecognitionActive.current };
};

const useSpeechSynthesis = (
  voiceModel: "browser" | "openai-tts" | "gemini-tts",
  openAiApiKey: string,
  onEndCallback: () => void,
  onErrorCallback: (error: any) => void
) => {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text) return;

      // Stop any ongoing speech
      if (synthRef.current && synthRef.current.speaking) {
        synthRef.current.cancel();
      }
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (voiceModel === "browser" && synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.onend = onEndCallback;
        utterance.onerror = (event) => onErrorCallback(event.error);
        try {
          synthRef.current.speak(utterance);
        } catch (error) {
          onErrorCallback(error);
        }
      } else if (voiceModel === "openai-tts" && openAiApiKey) {
        try {
          const response = await fetch(OPENAI_TTS_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAiApiKey}`,
            },
            body: JSON.stringify({
              model: "tts-1",
              voice: "alloy",
              input: text,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            onErrorCallback(`OpenAI TTS: ${errorData.error?.message || response.statusText}`);
            return;
          }

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          if (audioRef.current) {
            audioRef.current.src = audioUrl;
          } else {
            audioRef.current = new Audio(audioUrl);
          }

          audioRef.current.onended = () => {
            onEndCallback();
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.onerror = () => {
            onErrorCallback("Erro ao reproduzir áudio da IA.");
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.play();
        } catch (error) {
          onErrorCallback(error);
        }
      } else if (voiceModel === "gemini-tts") {
        onErrorCallback("Gemini TTS ainda não está implementado.");
        onEndCallback();
      } else {
        onErrorCallback("Modelo de voz não suportado ou chave API ausente.");
        onEndCallback();
      }
    },
    [voiceModel, openAiApiKey, onEndCallback, onErrorCallback]
  );

  const stopSpeaking = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { speak, stopSpeaking };
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  welcomeMessage,
  openAiApiKey,
  systemPrompt,
  assistantPrompt,
  model,
  conversationMemoryLength,
  voiceModel,
  activationPhrase,
}) => {
  const { workspace } = useSession();

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [assistantStarted, setAssistantStarted] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [activated, setActivated] = useState(false);

  // Callbacks for speech recognition
  const onRecognitionResult = useCallback(
    (text: string) => {
      setTranscript(text);

      if (text.includes("parar de falar")) {
        stopListening();
        stopSpeaking();
        return;
      }

      if (!activated) {
        if (text.includes(activationPhrase.toLowerCase())) {
          setActivated(true);
          speak("Assistente ativado. Pode falar.");
        }
      } else {
        stopListening();
        processUserInput(text);
      }
    },
    [activated, activationPhrase]
  );

  const onRecognitionError = useCallback(
    (error: string) => {
      console.error("Erro de reconhecimento de fala:", error);
      showError(`Erro de voz: ${error}`);
      setIsListening(false);
    },
    []
  );

  const onRecognitionStart = useCallback(() => {
    setIsListening(true);
    showSuccess("Estou ouvindo...");
  }, []);

  const onRecognitionEnd = useCallback(() => {
    setIsListening(false);
  }, []);

  const { startListening, stopListening } = useSpeechRecognition(
    onRecognitionResult,
    onRecognitionError,
    onRecognitionStart,
    onRecognitionEnd
  );

  // Callbacks for speech synthesis
  const onSpeechEnd = useCallback(() => {
    setIsSpeaking(false);
    if (assistantStarted && !isListening) {
      setTimeout(() => {
        startListening();
      }, 500);
    }
  }, [assistantStarted, isListening, startListening]);

  const onSpeechError = useCallback(
    (error: any) => {
      if (error === "interrupted") {
        onSpeechEnd();
        return;
      }
      console.error("Erro de síntese de fala:", error);
      showError(`Erro de fala: ${error}`);
      onSpeechEnd();
    },
    [onSpeechEnd]
  );

  const { speak, stopSpeaking } = useSpeechSynthesis(voiceModel, openAiApiKey, onSpeechEnd, onSpeechError);

  // Create conversation on assistant start
  useEffect(() => {
    const createConversation = async () => {
      if (assistantStarted && !conversationId && workspace?.id) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({ workspace_id: workspace.id, channel: "web", status: "active" })
          .select("id")
          .single();

        if (error) {
          console.error("Erro ao criar conversa:", error);
          showError("Erro ao iniciar nova conversa.");
          setConversationId(null);
        } else {
          setConversationId(data.id);
          setMessageHistory([]);
        }
      }
    };
    createConversation();
  }, [assistantStarted, conversationId, workspace]);

  // Start listening automatically when assistant started and conversation created
  useEffect(() => {
    if (assistantStarted && conversationId) {
      (async () => {
        const micPermission = await (async () => {
          if (!navigator.permissions) return true;
          try {
            const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
            return status.state === "granted";
          } catch {
            return true;
          }
        })();

        if (micPermission) {
          startListening();
        } else {
          speak("Por favor, habilite seu microfone para conversar comigo.");
        }
      })();
    }
  }, [assistantStarted, conversationId, startListening, speak]);

  // Fetch message history helper
  const fetchMessageHistory = useCallback(
    async (currentConversationId: string, limit: number) => {
      if (limit === 0) return [];

      const { data, error } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", currentConversationId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Erro ao buscar histórico de mensagens:", error);
        showError("Erro ao carregar histórico da conversa.");
        return [];
      }

      return data
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: (msg.content as { text: string }).text,
        }))
        .reverse();
    },
    []
  );

  // Process user input and get AI response
  const processUserInput = useCallback(
    async (inputText: string) => {
      if (!conversationId || !workspace?.id) {
        showError("Conversa não iniciada ou workspace ausente.");
        return;
      }

      setAiResponse("Processando...");

      const { error: userMessageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: { text: inputText },
      });

      if (userMessageError) {
        console.error("Erro ao salvar mensagem do usuário:", userMessageError);
        showError("Erro ao salvar sua mensagem.");
        return;
      }

      const currentHistory = await fetchMessageHistory(conversationId, conversationMemoryLength);
      setMessageHistory(currentHistory);

      const response = await fetchOpenAIResponse(inputText, currentHistory);
      setAiResponse(response);
      speak(response);

      const { error: aiMessageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: { text: response },
      });

      if (aiMessageError) {
        console.error("Erro ao salvar mensagem da IA:", aiMessageError);
        showError("Erro ao salvar resposta da IA.");
      }
    },
    [conversationId, conversationMemoryLength, fetchMessageHistory, speak, workspace?.id]
  );

  // Fetch AI response from OpenAI
  const fetchOpenAIResponse = useCallback(
    async (userMessage: string, history: Message[]): Promise<string> => {
      if (!openAiApiKey) {
        showError("Chave API OpenAI não configurada.");
        return "Desculpe, a chave da API OpenAI não está configurada.";
      }

      if (model === "gemini-pro") {
        showError("Modelo Gemini IA ainda não está implementado. Use OpenAI.");
        return "Modelo Gemini IA não suportado ainda.";
      }

      const messagesForApi = [
        { role: "system", content: systemPrompt || "" },
        { role: "assistant", content: assistantPrompt || "" },
        ...history,
        { role: "user", content: userMessage },
      ];

      try {
        const response = await fetch(OPENAI_CHAT_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: messagesForApi,
            max_tokens: 150,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Erro OpenAI:", errorData);
          showError(`Erro OpenAI: ${errorData.error?.message || response.statusText}`);
          return "Desculpe, não consegui processar sua solicitação.";
        }

        const data = await response.json();
        const aiText = data.choices?.[0]?.message?.content;
        return aiText || "Desculpe, não entendi.";
      } catch (error) {
        console.error("Erro na requisição OpenAI:", error);
        showError("Erro na comunicação com a IA.");
        return "Desculpe, ocorreu um erro.";
      }
    },
    [assistantPrompt, model, openAiApiKey, systemPrompt]
  );

  const startAssistant = () => {
    setAssistantStarted(true);
    setActivated(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 bg-gradient-to-tr from-purple-900 via-indigo-900 to-blue-900 rounded-3xl shadow-2xl max-w-md w-full text-white font-sans select-none">
      <h2 className="text-3xl font-extrabold tracking-wide text-center drop-shadow-lg">
        Assistente de Voz IA - Intra
      </h2>

      <div className="relative w-56 h-56 rounded-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 shadow-lg flex items-center justify-center overflow-hidden">
        {(isListening || isSpeaking) && (
          <div
            className={`absolute inset-0 rounded-full ${
              isListening ? "animate-pulse bg-pink-400/60" : "animate-ping bg-indigo-400/60"
            }`}
          />
        )}
        <div className="relative z-10 flex items-center justify-center w-40 h-40 rounded-full bg-black/70 backdrop-blur-md shadow-inner">
          {isListening ? (
            <Mic size={64} className="text-pink-400 animate-pulse" />
          ) : (
            <Volume2 size={64} className="text-indigo-400 animate-pulse" />
          )}
        </div>
      </div>

      {!assistantStarted ? (
        <Button
          onClick={startAssistant}
          variant="outline"
          className="text-pink-400 border-pink-400 hover:bg-pink-400 hover:text-white transition"
        >
          <Play className="mr-2 h-5 w-5" /> Iniciar Assistente
        </Button>
      ) : (
        <div className="flex flex-col items-center space-y-2">
          <div className="text-center text-yellow-300 text-sm">
            {activated ? "Assistente ativado. Pode falar." : `Diga "${activationPhrase}" para ativar o assistente.`}
          </div>
          <div className="flex space-x-4">
            <Button
              onClick={startListening}
              disabled={isListening || isSpeaking}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              <Mic className="mr-2 h-5 w-5" /> Iniciar Escuta
            </Button>
            <Button
              onClick={stopListening}
              disabled={!isListening || isSpeaking}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <StopCircle className="mr-2 h-5 w-5" /> Parar Escuta
            </Button>
          </div>
        </div>
      )}

      <div className="w-full bg-black/30 rounded-lg p-4 max-h-48 overflow-y-auto space-y-3">
        {transcript && (
          <p className="text-pink-300 text-lg">
            <span className="font-semibold">Você disse:</span> {transcript}
          </p>
        )}
        {aiResponse && (
          <p className="text-indigo-300 text-lg">
            <span className="font-semibold">IA responde:</span> {aiResponse}
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;