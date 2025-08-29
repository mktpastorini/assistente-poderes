"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Mic, StopCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/contexts/SessionContext";
import { useSystem } from "@/contexts/SystemContext"; // Importar o novo hook

interface VoiceAssistantProps {
  welcomeMessage?: string;
  openAiApiKey: string;
  systemPrompt?: string;
  assistantPrompt?: string;
  model?: string;
  conversationMemoryLength: number;
  voiceModel: "browser" | "openai-tts" | "gemini-tts";
  openaiTtsVoice?: string;
  activationPhrase: string;
}

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

interface Power {
  id: string;
  name: string;
  description: string | null;
  method: string;
  url: string | null;
  headers: Record<string, string> | null;
  body: Record<string, any> | null;
  api_key_id: string | null;
  parameters_schema: Record<string, any> | null;
}

const OPENAI_TTS_API_URL = "https://api.openai.com/v1/audio/speech";
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  welcomeMessage = "Bem-vindo ao site! Diga 'ativar' para começar a conversar.",
  openAiApiKey,
  systemPrompt = "Você é Intra, a IA da Intratégica. Empresa de automações, desenvolvimento de IAs e sistemas.",
  assistantPrompt = "Você é um assistente amigável e profissional que ajuda agências de tecnologia a automatizar processos e criar soluções de IA personalizadas.",
  model = "gpt-4o-mini",
  conversationMemoryLength,
  voiceModel,
  openaiTtsVoice = "alloy",
  activationPhrase,
}) => {
  const { workspace } = useSession();
  const { systemVariables, loadingSystemContext } = useSystem(); // Usar o SystemContext

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [activated, setActivated] = useState(false);
  const [initialGreetingSpoken, setInitialGreetingSpoken] = useState(false);
  const [powers, setPowers] = useState<Power[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isRecognitionActive = useRef(false);
  const isSpeakingRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega os "Poderes" do workspace
  useEffect(() => {
    if (workspace?.id) {
      const fetchPowers = async () => {
        const { data, error } = await supabase
          .from('powers')
          .select('*')
          .eq('workspace_id', workspace.id);
        if (error) {
          showError("Erro ao carregar os poderes da IA.");
          console.error(error);
        } else {
          setPowers(data || []);
          console.log("[VoiceAssistant] Poderes carregados:", data);
        }
      };
      fetchPowers();
    }
  }, [workspace]);

  const checkMicrophonePermission = async (): Promise<boolean> => {
    if (!navigator.permissions) return true;
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return status.state === "granted";
    } catch {
      return true;
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isRecognitionActive.current && !isSpeakingRef.current) {
      try {
        recognitionRef.current.start();
        setTranscript("");
        setAiResponse("");
        console.log("[VoiceAssistant] Iniciando escuta");
      } catch (error) {
        if (error instanceof DOMException && error.name === "InvalidStateError") {
          console.warn("[VoiceAssistant] Reconhecimento já está ativo, ignorando erro.");
          isRecognitionActive.current = true;
          setIsListening(true);
        } else {
          console.error("[VoiceAssistant] Erro ao iniciar reconhecimento de voz:", error);
          showError("Erro ao iniciar reconhecimento de voz.");
        }
      }
    } else {
      console.log("[VoiceAssistant] Não foi possível iniciar escuta. isRecognitionActive:", isRecognitionActive.current, "isSpeaking:", isSpeakingRef.current);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isRecognitionActive.current) {
      recognitionRef.current.stop();
      console.log("[VoiceAssistant] Escuta parada");
    } else {
      console.log("[VoiceAssistant] Não foi possível parar escuta. isRecognitionActive:", isRecognitionActive.current);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.cancel();
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    console.log("[VoiceAssistant] Fala parada");
  };

  const speak = async (text: string, onEndCallback?: () => void) => {
    if (!text) {
      onEndCallback?.();
      return;
    }

    stopSpeaking();

    setIsSpeaking(true);
    isSpeakingRef.current = true;
    console.log("[VoiceAssistant] Iniciando fala:", text);

    const onSpeechEnd = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      console.log("[VoiceAssistant] Fala finalizada");
      onEndCallback?.();
    };

    const onSpeechError = (error: any) => {
      console.error("[VoiceAssistant] Erro de síntese de fala:", error);
      showError(`Erro de fala: ${error}`);
      onSpeechEnd();
    };

    if (voiceModel === "browser" && synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.onend = onSpeechEnd;
      utterance.onerror = (event) => onSpeechError(event.error);
      try {
        synthRef.current.speak(utterance);
      } catch (error) {
        onSpeechError(error);
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
            voice: openaiTtsVoice || "alloy",
            input: text,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          onSpeechError(`OpenAI TTS: ${errorData.error?.message || response.statusText}`);
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
          onSpeechEnd();
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.onerror = () => {
          onSpeechError("Erro ao reproduzir áudio da IA.");
          URL.revokeObjectURL(audioUrl);
        };
        audioRef.current.play();
      } catch (error) {
        onSpeechError(error);
      }
    } else if (voiceModel === "gemini-tts") {
      showError("Gemini TTS ainda não está implementado.");
      onSpeechEnd();
    } else {
      showError("Modelo de voz não suportado ou chave API ausente.");
      onSpeechEnd();
    }
  };

  // Função para substituir placeholders na string
  const replacePlaceholders = (text: string, variables: Record<string, any>): string => {
    let result = text;
    for (const key in variables) {
      if (Object.prototype.hasOwnProperty.call(variables, key)) {
        const placeholder = `{${key}}`;
        const value = variables[key];
        // Substitui apenas se o valor não for nulo/indefinido e for uma string ou número
        if (value !== null && value !== undefined && (typeof value === 'string' || typeof value === 'number')) {
          result = result.replace(new RegExp(placeholder, 'g'), String(value));
        }
      }
    }
    return result;
  };

  // Orquestrador principal da conversa com a IA
  const runConversation = async (userInput: string) => {
    if (!openAiApiKey) {
      showError("Chave API OpenAI não configurada.");
      setAiResponse("Por favor, configure sua chave API OpenAI nas configurações.");
      startListening();
      return;
    }

    console.log("[Orchestrator] Iniciando conversa com input:", userInput);
    setAiResponse("Processando...");

    // Adiciona a mensagem do usuário ao histórico
    const newHistory = [...messageHistory, { role: "user" as const, content: userInput }];
    setMessageHistory(newHistory);

    // Formata os "Poderes" para a API da OpenAI
    const tools = powers.map(power => ({
      type: 'function' as const,
      function: {
        name: power.name,
        description: power.description,
        parameters: power.parameters_schema,
      },
    }));

    try {
      // Primeira chamada para a OpenAI
      const messagesForApi = [
        { role: "system" as const, content: systemPrompt },
        { role: "assistant" as const, content: assistantPrompt },
        ...newHistory.slice(-conversationMemoryLength),
      ];

      const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messagesForApi,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro OpenAI: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseMessage = data.choices?.[0]?.message;

      // Se a IA decidir usar uma ferramenta (Poder)
      if (responseMessage.tool_calls) {
        setAiResponse("Executando poder...");
        console.log("[Orchestrator] IA solicitou o uso de poderes:", responseMessage.tool_calls);
        
        const historyWithToolCall = [...newHistory, responseMessage];
        setMessageHistory(historyWithToolCall);

        const toolOutputs = [];
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const powerToExecute = powers.find(p => p.name === functionName);

          if (powerToExecute) {
            console.log(`[Orchestrator] Executando poder: ${functionName} com args:`, functionArgs);
            
            let url = powerToExecute.url || '';
            // Substituir placeholders na URL com systemVariables
            url = replacePlaceholders(url, systemVariables);

            Object.keys(functionArgs).forEach(key => {
              const placeholder = `{${key}}`;
              url = url.replace(new RegExp(placeholder, 'g'), encodeURIComponent(functionArgs[key]));
            });

            // Substituir placeholders no corpo com systemVariables
            let body = powerToExecute.body;
            if (body) {
              body = JSON.parse(replacePlaceholders(JSON.stringify(body), systemVariables));
            }

            const { data: toolResult, error: invokeError } = await supabase.functions.invoke('proxy-api', {
              body: {
                url: url,
                method: powerToExecute.method,
                headers: powerToExecute.headers,
                body: body,
              },
            });

            const content = invokeError ? JSON.stringify({ error: invokeError.message }) : JSON.stringify(toolResult);
            toolOutputs.push({
              tool_call_id: toolCall.id,
              role: 'tool' as const,
              name: functionName,
              content: content,
            });
          }
        }

        // Segunda chamada para a OpenAI com os resultados da ferramenta
        console.log("[Orchestrator] Enviando resultados dos poderes para a IA.");
        const historyWithToolResults = [...historyWithToolCall, ...toolOutputs];
        setMessageHistory(historyWithToolResults);

        const secondResponse = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: historyWithToolResults,
          }),
        });

        if (!secondResponse.ok) {
          const errorData = await secondResponse.json();
          throw new Error(`Erro OpenAI (2ª chamada): ${errorData.error?.message || secondResponse.statusText}`);
        }

        const secondData = await secondResponse.json();
        const finalMessage = secondData.choices?.[0]?.message?.content;
        
        console.log("[Orchestrator] Resposta final da IA:", finalMessage);
        setAiResponse(finalMessage);
        setMessageHistory(prev => [...prev, { role: 'assistant', content: finalMessage }]);
        await speak(finalMessage, () => {
          if (activated) startListening();
        });

      } else {
        // Resposta direta sem usar ferramentas
        const assistantMessage = responseMessage.content;
        console.log("[Orchestrator] Resposta direta da IA:", assistantMessage);
        setAiResponse(assistantMessage);
        setMessageHistory(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
        await speak(assistantMessage, () => {
          if (activated) startListening();
        });
      }
    } catch (error: any) {
      showError(error.message);
      setAiResponse("");
      console.error("[Orchestrator] Erro no fluxo da conversa:", error);
      startListening();
    }
  };

  useEffect(() => {
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      showError("Seu navegador não suporta reconhecimento de fala.");
      return;
    }

    recognitionRef.current = new SpeechRecognitionConstructor();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "pt-BR";

    recognitionRef.current.onstart = () => {
      isRecognitionActive.current = true;
      setIsListening(true);
      showSuccess("Estou ouvindo...");
      console.log("[VoiceAssistant] Reconhecimento iniciado");
    };

    recognitionRef.current.onresult = (event) => {
      const currentTranscript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
      setTranscript(currentTranscript);
      console.log("[VoiceAssistant] Reconhecido:", currentTranscript);

      if (currentTranscript.includes("parar de falar")) {
        stopListening();
        stopSpeaking();
        setActivated(false);
        return;
      }

      if (!activated) {
        if (currentTranscript.includes(activationPhrase.toLowerCase())) {
          setActivated(true);
          speak("Assistente ativado. Pode falar.", () => {
            startListening();
          });
        } else {
          console.log("[VoiceAssistant] Não ativado. Aguardando frase de ativação.");
        }
      } else {
        stopListening();
        runConversation(currentTranscript);
      }
    };

    recognitionRef.current.onend = () => {
      isRecognitionActive.current = false;
      setIsListening(false);
      console.log("[VoiceAssistant] Reconhecimento finalizado");
      if (activated && !isSpeakingRef.current) {
        console.log("[VoiceAssistant] Reiniciando escuta via onend fallback.");
        startListening();
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error("[VoiceAssistant] Erro de reconhecimento de fala:", event.error);
      showError(`Erro de voz: ${event.error}`);
      isRecognitionActive.current = false;
      setIsListening(false);
      if (activated && !isSpeakingRef.current) {
        console.log("[VoiceAssistant] Reiniciando escuta após erro.");
        startListening();
      }
    };

    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    } else {
      showError("Seu navegador não suporta síntese de fala.");
    }

    return () => {
      stopListening();
      stopSpeaking();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, [activated, activationPhrase, openAiApiKey, systemPrompt, assistantPrompt, model, conversationMemoryLength, voiceModel, openaiTtsVoice, powers, systemVariables]); // Adicionado systemVariables como dependência

  useEffect(() => {
    const initializeAssistant = async () => {
      if (!workspace?.id || loadingSystemContext) { // Esperar o SystemContext carregar
        console.log("[VoiceAssistant] Workspace ou SystemContext não disponível, aguardando...");
        return;
      }

      if (!conversationId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({ workspace_id: workspace.id, channel: 'web', status: 'active' })
          .select('id')
          .single();

        if (error) {
          console.error("[VoiceAssistant] Erro ao criar conversa:", error);
          showError("Erro ao iniciar nova conversa.");
          setConversationId(null);
          return;
        }
        setConversationId(data.id);
        setMessageHistory([]);
      }

      const micPermission = await checkMicrophonePermission();
      if (micPermission) {
        if (!initialGreetingSpoken) {
          speak(welcomeMessage, () => {
            setInitialGreetingSpoken(true);
            startListening();
          });
        } else {
          startListening();
        }
      } else {
        speak("Por favor, habilite seu microfone para conversar comigo.", () => {
          startListening();
        });
      }
    };

    initializeAssistant();
  }, [workspace, conversationId, initialGreetingSpoken, welcomeMessage, loadingSystemContext]); // Adicionado loadingSystemContext

  if (loadingSystemContext) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando automações do sistema...
      </div>
    );
  }

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

      <div className="w-full bg-black/30 rounded-lg p-4 max-h-48 overflow-y-auto space-y-3">
        {transcript && (
          <p className="text-pink-300 text-lg">
            <span className="font-semibold">Você disse:</span> {transcript}
          </p>
        )}
        {aiResponse && (
          <p className="text-indigo-300 text-lg whitespace-pre-wrap">
            <span className="font-semibold">IA responde:</span> {aiResponse}
          </p>
        )}
      </div>
    </div>
  );
};

export default VoiceAssistant;