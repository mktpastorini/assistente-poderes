"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import VoiceAssistant from "@/components/VoiceAssistant";
import { useSession } from "@/contexts/SessionContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

interface Settings {
  system_prompt: string;
  assistant_prompt: string;
  ai_model: string;
  voice_model: "browser" | "openai-tts" | "gemini-tts";
  openai_api_key: string | null;
  openai_tts_voice: string | null;
  conversation_memory_length: number;
  activation_phrase: string;
}

const Index = () => {
  const { workspace, loading } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    if (!loading && workspace && workspace.id) {
      setLoadingSettings(true);
      supabase
        .from("settings")
        .select("*")
        .eq("workspace_id", workspace.id)
        .single()
        .then(({ data, error }) => {
          if (error && error.code !== "PGRST116") {
            showError("Erro ao carregar configurações.");
            console.error(error);
            setLoadingSettings(false);
            return;
          }
          if (data) {
            setSettings({
              system_prompt: data.system_prompt || "Você é Intra, a IA da Intratégica. Empresa de automações, desenvolvimento de IAs e sistemas.",
              assistant_prompt: data.assistant_prompt || "Você é um assistente amigável e profissional que ajuda agências de tecnologia a automatizar processos e criar soluções de IA personalizadas.",
              ai_model: data.ai_model || "gpt-4o-mini",
              voice_model: data.voice_model || "browser",
              openai_api_key: data.openai_api_key || "",
              openai_tts_voice: data.openai_tts_voice || "alloy",
              conversation_memory_length: data.conversation_memory_length ?? 5,
              activation_phrase: data.activation_phrase || "ativar",
            });
          } else {
            setSettings(null);
          }
          setLoadingSettings(false);
        });
    }
  }, [workspace, loading]);

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando configurações do assistente...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Nenhuma configuração encontrada para este workspace.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <div className="flex-grow flex items-center justify-center">
        <VoiceAssistant
          openAiApiKey={settings.openai_api_key || ""}
          systemPrompt={settings.system_prompt}
          assistantPrompt={settings.assistant_prompt}
          model={settings.ai_model}
          conversationMemoryLength={settings.conversation_memory_length}
          voiceModel={settings.voice_model}
          openaiTtsVoice={settings.openai_tts_voice || "alloy"} // Passando voz selecionada
          activationPhrase={settings.activation_phrase}
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;