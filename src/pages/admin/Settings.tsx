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
  conversation_memory_length: z.number().min(0).max(10), // Novo campo
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
  conversation_memory_length: 5, // Valor padrão
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
            setValue("conversation_memory_length", data.conversation_memory_length ?? defaultValues.conversation_memory_length); // Novo campo
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
        conversation_memory_length: formData.conversation_memory_length, // Novo campo
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

      <Card>
        <CardHeader>
          <CardTitle>Prompts da IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="system-prompt">Prompt do Sistema</Label>
            <Textarea
              id="system-prompt"
              placeholder="Defina o comportamento geral do assistente..."
              rows={5}
              {...register("system_prompt")}
            />
            {errors.system_prompt && (
              <p className="text-destructive text-sm mt-1">{errors.system_prompt.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="assistant-prompt">Prompt do Assistente</Label>
            <Textarea
              id="assistant-prompt"
              placeholder="Defina a personalidade e estilo de resposta do assistente..."
              rows={5}
              {...register("assistant_prompt")}
            />
            {errors.assistant_prompt && (
              <p className="text-destructive text-sm mt-1">{errors.assistant_prompt.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modelo de IA</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            onValueChange={(value) => setValue("ai_model", value as SettingsFormData["ai_model"])}
            value={watch("ai_model")}
          >
            <SelectTrigger id="ai-model">
              <SelectValue placeholder="Selecione um modelo de IA" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai-gpt4">OpenAI GPT-4</SelectItem>
              <SelectItem value="openai-gpt3.5">OpenAI GPT-3.5</SelectItem>
              <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Voz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="voice-model">Modelo de Voz</Label>
            <Select
              onValueChange={(value) => setValue("voice_model", value as SettingsFormData["voice_model"])}
              value={watch("voice_model")}
            >
              <SelectTrigger id="voice-model">
                <SelectValue placeholder="Selecione um modelo de voz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">Navegador (Padrão)</SelectItem>
                <SelectItem value="openai-tts">OpenAI TTS</SelectItem>
                <SelectItem value="gemini-tts">Gemini TTS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="voice-sensitivity">Sensibilidade de Voz ({watch("voice_sensitivity")}%)</Label>
            <Slider
              id="voice-sensitivity"
              min={0}
              max={100}
              step={1}
              value={[watch("voice_sensitivity")]}
              onValueChange={(value) => setValue("voice_sensitivity", value[0])}
              className="w-[60%]"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memória da Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="conversation-memory-length">Número de Mensagens para Lembrar</Label>
          <Select
            onValueChange={(value) => setValue("conversation_memory_length", parseInt(value))}
            value={watch("conversation_memory_length").toString()}
          >
            <SelectTrigger id="conversation-memory-length">
              <SelectValue placeholder="Selecione a profundidade da memória" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Nenhuma</SelectItem>
              <SelectItem value="1">1 Mensagem</SelectItem>
              <SelectItem value="3">3 Mensagens</SelectItem>
              <SelectItem value="5">5 Mensagens</SelectItem>
              <SelectItem value="10">10 Mensagens</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Chaves de API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="openai-api-key">Chave API OpenAI</Label>
            <Input
              id="openai-api-key"
              type="password"
              placeholder="sk-..."
              {...register("openai_api_key")}
            />
            {errors.openai_api_key && (
              <p className="text-destructive text-sm mt-1">{errors.openai_api_key.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="gemini-api-key">Chave API Gemini</Label>
            <Input
              id="gemini-api-key"
              type="password"
              placeholder="AIza..."
              {...register("gemini_api_key")}
            />
            {errors.gemini_api_key && (
              <p className="text-destructive text-sm mt-1">{errors.gemini_api_key.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isSubmitting}>
        Salvar Configurações
      </Button>
    </form>
  );
};

export default SettingsPage;