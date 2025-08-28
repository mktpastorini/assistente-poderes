"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const settingsSchema = z.object({
  system_prompt: z.string().min(10, "Prompt do sistema é obrigatório"),
  assistant_prompt: z.string().min(10, "Prompt do assistente é obrigatório"),
  ai_model: z.enum(["openai-gpt4", "openai-gpt3.5", "gemini-pro", "gpt-4o-mini"]),
  voice_model: z.enum(["browser", "openai-tts", "gemini-tts"]),
  voice_sensitivity: z.number().min(0).max(100),
  openai_api_key: z.string().optional().nullable(),
  gemini_api_key: z.string().optional().nullable(),
  conversation_memory_length: z.number().min(0).max(10),
  activation_phrase: z.string().min(1, "Frase de ativação é obrigatória"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const defaultValues: SettingsFormData = {
  system_prompt:
    "Você é Intra, a IA da Intratégica. Empresa de automações, desenvolvimento de IAs e sistemas.",
  assistant_prompt:
    "Você é um assistente amigável e profissional que ajuda agências de tecnologia a automatizar processos e criar soluções de IA personalizadas.",
  ai_model: "gpt-4o-mini",
  voice_model: "browser",
  voice_sensitivity: 50,
  openai_api_key: "",
  gemini_api_key: "",
  conversation_memory_length: 5,
  activation_phrase: "ativar",
};

const SettingsPage: React.FC = () => {
  const { workspace, loading } = useSession();
  const [loadingSettings, setLoadingSettings] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

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
            setValue("system_prompt", data.system_prompt || defaultValues.system_prompt);
            setValue("assistant_prompt", data.assistant_prompt || defaultValues.assistant_prompt);
            setValue("ai_model", data.ai_model || defaultValues.ai_model);
            setValue("voice_model", data.voice_model || defaultValues.voice_model);
            setValue("voice_sensitivity", data.voice_sensitivity ?? defaultValues.voice_sensitivity);
            setValue("openai_api_key", data.openai_api_key || defaultValues.openai_api_key);
            setValue("gemini_api_key", data.gemini_api_key || defaultValues.gemini_api_key);
            setValue("conversation_memory_length", data.conversation_memory_length ?? defaultValues.conversation_memory_length);
            setValue("activation_phrase", data.activation_phrase || defaultValues.activation_phrase);
          }
          setLoadingSettings(false);
        });
    }
  }, [workspace, loading, setValue]);

  const onSubmit = async (formData: SettingsFormData) => {
    if (!workspace) {
      showError("Workspace não encontrado.");
      return;
    }

    const { error } = await supabase.from("settings").upsert(
      {
        workspace_id: workspace.id,
        system_prompt: formData.system_prompt,
        assistant_prompt: formData.assistant_prompt,
        ai_model: formData.ai_model,
        voice_model: formData.voice_model,
        voice_sensitivity: formData.voice_sensitivity,
        openai_api_key: formData.openai_api_key || null,
        gemini_api_key: formData.gemini_api_key || null,
        conversation_memory_length: formData.conversation_memory_length,
        activation_phrase: formData.activation_phrase,
      },
      { onConflict: "workspace_id" }
    );

    if (error) {
      showError("Erro ao salvar configurações.");
      console.error(error);
    } else {
      showSuccess("Configurações salvas com sucesso!");
    }
  };

  if (loading || loadingSettings) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações do Assistente IA</h1>

      {/* ... outros cards ... */}

      <Card>
        <CardHeader>
          <CardTitle>Palavra/Frase de Ativação</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="activation-phrase">Frase para ativar o assistente</Label>
          <Input
            id="activation-phrase"
            placeholder="Ex: ativar, olá assistente"
            {...register("activation_phrase")}
          />
          {errors.activation_phrase && (
            <p className="text-destructive text-sm mt-1">{errors.activation_phrase.message}</p>
          )}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting}>
        Salvar Configurações
      </Button>
    </form>
  );
};

export default SettingsPage;