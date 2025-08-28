"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

// Tipos para o Supabase
interface Power {
  id: string;
  name: string;
  description: string | null;
  method: string;
  url: string | null;
  headers: Record<string, string> | null;
  body: Record<string, any> | null;
  api_key_id: string | null;
}

interface ApiKey {
  id: string;
  label: string;
  provider: string;
}

// Esquema de validação para o formulário de Poderes
const powerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome do Poder é obrigatório"),
  description: z.string().optional().nullable(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  url: z.string().url("URL inválida").optional().nullable(),
  headers: z.string().optional().nullable(), // JSON string
  body: z.string().optional().nullable(), // JSON string
  api_key_id: z.string().optional().nullable(),
});

type PowerFormData = z.infer<typeof powerSchema>;

const PowersPage: React.FC = () => {
  const { workspace, loading: sessionLoading } = useSession();
  const [powers, setPowers] = useState<Power[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingPowers, setLoadingPowers] = useState(true);
  const [editingPowerId, setEditingPowerId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PowerFormData>({
    resolver: zodResolver(powerSchema),
    defaultValues: {
      name: "",
      description: "",
      method: "GET",
      url: "",
      headers: "{}",
      body: "{}",
      api_key_id: null,
    },
  });

  const currentMethod = watch("method");

  // Carregar poderes e chaves de API
  useEffect(() => {
    const fetchPowersAndApiKeys = async () => {
      if (!workspace?.id) return;

      setLoadingPowers(true);
      const { data: powersData, error: powersError } = await supabase
        .from('powers')
        .select('*')
        .eq('workspace_id', workspace.id);

      if (powersError) {
        showError("Erro ao carregar poderes.");
        console.error(powersError);
      } else {
        setPowers(powersData || []);
      }

      const { data: apiKeysData, error: apiKeysError } = await supabase
        .from('api_keys')
        .select('id, label, provider')
        .eq('workspace_id', workspace.id);

      if (apiKeysError) {
        showError("Erro ao carregar chaves de API.");
        console.error(apiKeysError);
      } else {
        setApiKeys(apiKeysData || []);
      }
      setLoadingPowers(false);
    };

    if (!sessionLoading && workspace) {
      fetchPowersAndApiKeys();
    }
  }, [workspace, sessionLoading]);

  const onSubmit = async (formData: PowerFormData) => {
    if (!workspace) {
      showError("Workspace não encontrado.");
      return;
    }

    try {
      const parsedHeaders = formData.headers ? JSON.parse(formData.headers) : {};
      const parsedBody = (formData.body && (currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH"))
        ? JSON.parse(formData.body)
        : {};

      const powerData = {
        workspace_id: workspace.id,
        name: formData.name,
        description: formData.description,
        method: formData.method,
        url: formData.url,
        headers: parsedHeaders,
        body: parsedBody,
        api_key_id: formData.api_key_id || null,
      };

      let error;
      if (editingPowerId) {
        const { error: updateError } = await supabase
          .from('powers')
          .update(powerData)
          .eq('id', editingPowerId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('powers')
          .insert(powerData);
        error = insertError;
      }

      if (error) {
        showError(`Erro ao ${editingPowerId ? 'atualizar' : 'adicionar'} poder.`);
        console.error(error);
      } else {
        showSuccess(`Poder ${editingPowerId ? 'atualizado' : 'adicionado'} com sucesso!`);
        reset();
        setEditingPowerId(null);
        // Recarregar poderes
        const { data: updatedPowers, error: fetchError } = await supabase
          .from('powers')
          .select('*')
          .eq('workspace_id', workspace.id);
        if (!fetchError) {
          setPowers(updatedPowers || []);
        }
      }
    } catch (e: any) {
      showError(`Erro ao processar JSON: ${e.message}`);
      console.error(e);
    }
  };

  const onEdit = (power: Power) => {
    setEditingPowerId(power.id);
    setValue("id", power.id);
    setValue("name", power.name);
    setValue("description", power.description);
    setValue("method", power.method as "GET" | "POST" | "PUT" | "DELETE" | "PATCH");
    setValue("url", power.url);
    setValue("headers", JSON.stringify(power.headers || {}, null, 2));
    setValue("body", JSON.stringify(power.body || {}, null, 2));
    setValue("api_key_id", power.api_key_id);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este poder?")) return;

    const { error } = await supabase
      .from('powers')
      .delete()
      .eq('id', id);

    if (error) {
      showError("Erro ao excluir poder.");
      console.error(error);
    } else {
      showSuccess("Poder excluído com sucesso!");
      setPowers(powers.filter(p => p.id !== id));
    }
  };

  if (sessionLoading || loadingPowers) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Poderes da IA (APIs/Webhooks)</h1>

      <Card>
        <CardHeader>
          <CardTitle>{editingPowerId ? "Editar Poder" : "Adicionar Novo Poder"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="power-name">Nome do Poder</Label>
              <Input id="power-name" placeholder="Ex: data_hora, clima_cidade" {...register("name")} />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="power-description">Descrição (para o prompt da IA)</Label>
              <Textarea id="power-description" placeholder="Descreva o que este poder faz e como a IA deve usá-lo. Ex: 'Quando o usuário perguntar a hora, execute o poder data_hora.'" rows={3} {...register("description")} />
              {errors.description && <p className="text-destructive text-sm mt-1">{errors.description.message}</p>}
            </div>
            <div>
              <Label htmlFor="power-method">Método HTTP</Label>
              <Select onValueChange={(value) => setValue("method", value as "GET" | "POST" | "PUT" | "DELETE" | "PATCH")} value={currentMethod}>
                <SelectTrigger id="power-method">
                  <SelectValue placeholder="Selecione o método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
              {errors.method && <p className="text-destructive text-sm mt-1">{errors.method.message}</p>}
            </div>
            <div>
              <Label htmlFor="power-url">URL do Endpoint</Label>
              <Input id="power-url" placeholder="https://api.exemplo.com/recurso" {...register("url")} />
              {errors.url && <p className="text-destructive text-sm mt-1">{errors.url.message}</p>}
            </div>
            <div>
              <Label htmlFor="power-headers">Cabeçalhos (JSON)</Label>
              <Textarea id="power-headers" placeholder='{"Content-Type": "application/json", "Authorization": "Bearer {{API_KEY}}"}' rows={3} {...register("headers")} />
              {errors.headers && <p className="text-destructive text-sm mt-1">{errors.headers.message}</p>}
            </div>
            {(currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH") && (
              <div>
                <Label htmlFor="power-body">Corpo da Requisição (JSON)</Label>
                <Textarea id="power-body" placeholder='{"chave": "valor"}' rows={5} {...register("body")} />
                {errors.body && <p className="text-destructive text-sm mt-1">{errors.body.message}</p>}
              </div>
            )}
            <div>
              <Label htmlFor="power-api-key">Chave de API para Autenticação (Opcional)</Label>
              <Select onValueChange={(value) => setValue("api_key_id", value)} value={watch("api_key_id") || ""}>
                <SelectTrigger id="power-api-key">
                  <SelectValue placeholder="Nenhuma chave de API" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.label} ({key.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.api_key_id && <p className="text-destructive text-sm mt-1">{errors.api_key_id.message}</p>}
            </div>
            <Button type="submit" disabled={isSubmitting}>
              <PlusCircle className="mr-2 h-4 w-4" /> {editingPowerId ? "Salvar Alterações" : "Adicionar Poder"}
            </Button>
            {editingPowerId && (
              <Button type="button" variant="outline" onClick={() => { reset(); setEditingPowerId(null); }} className="ml-2">
                Cancelar Edição
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poderes Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          {powers.length === 0 ? (
            <p className="text-muted-foreground">Nenhum poder adicionado ainda. Adicione um acima para que a IA possa utilizá-lo.</p>
          ) : (
            <div className="space-y-4">
              {powers.map((power) => (
                <div key={power.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <h3 className="font-semibold">{power.name}</h3>
                    <p className="text-sm text-muted-foreground">{power.description}</p>
                    <p className="text-xs text-muted-foreground">{power.method} {power.url}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(power)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(power.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PowersPage;