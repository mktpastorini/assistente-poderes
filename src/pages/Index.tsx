"use client";

import { Rodape } from "@/components/rodape";
import VoiceAssistant from "@/components/VoiceAssistant";
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
  welcome_message: string | null;
}

const Index = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchPublicSettings = async () => {
      // Fetch the first available settings record, assuming it's the public one.
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") { // PGRST116 means no rows found, which is not a critical error here
        showError("Erro ao carregar configurações do assistente.");
        console.error("Error fetching settings:", error);
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
          welcome_message: data.welcome_message || "Bem-vindo ao site! Diga 'ativar' para começar a conversar.",
        });
      } else {
        // If no settings are found in the database, use hardcoded default values.
        setSettings({
          system_prompt: "Você é Intra, a IA da Intratégica. Empresa de automações, desenvolvimento de IAs e sistemas.",
          assistant_prompt: "Você é um assistente amigável e profissional que ajuda agências de tecnologia a automatizar processos e criar soluções de IA personalizadas.",
          ai_model: "gpt-4o-mini",
          voice_model: "browser",
          openai_api_key: "",
          openai_tts_voice: "alloy",
          conversation_memory_length: 5,
          activation_phrase: "ativar",
          welcome_message: "Bem-vindo ao site! Diga 'ativar' para começar a conversar.",
        });
      }
      setLoadingSettings(false);
    };

    fetchPublicSettings();
  }, []); // Empty dependency array ensures this runs only once on mount.

  if (loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando configurações do assistente...
      </div>
    );
  }

  if (!settings) {
    // This fallback is unlikely to be hit due to the default values, but it's good practice.
    return (
      <div className="min-h-screen flex items-center justify-center">
        Não foi possível carregar as configurações do assistente.
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <div className="flex-grow flex items-center justify-center">
        <VoiceAssistant
          welcomeMessage={settings.welcome_message || "Bem-vindo ao site! Diga 'ativar' para começar a conversar."}
          openAiApiKey={settings.openai_api_key || ""}
          systemPrompt={settings.system_prompt}
          assistantPrompt={settings.assistant_prompt}
          model={settings.ai_model}
          conversationMemoryLength={settings.conversation_memory_length}
          voiceModel={settings.voice_model}
          openaiTtsVoice={settings.openai_tts_voice || "alloy"}
          activationPhrase={settings.activation_phrase}
        />
      </div>
      <Rodape />
    </div>
  );
};

export default Index;