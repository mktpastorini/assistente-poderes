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
import { PlusCircle, Trash2, Edit, Play } from 'lucide-react';
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
  parameters_schema: Record<string, any> | null;
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
  parameters_schema: z.string().optional().nullable(), // JSON string
});

type PowerFormData = z.infer<typeof powerSchema>;

const PowersPage: React.FC = () => {
  const { workspace, loading: sessionLoading } = useSession();
  const [powers, setPowers] = useState<Power[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingPowers, setLoadingPowers] = useState(true);
  const [editingPowerId, setEditingPowerId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testingPower, setTestingPower] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<PowerFormData>({
    resolver: zodResolver(powerSchema),
    defaultValues: {
      name: "",
      description: "",
      method: "GET",
      url: "",
      headers: '{"Content-Type": "application/json"}', 
      body: "{}",
      api_key_id: null,
      parameters_schema: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
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
      const parsedParametersSchema = formData.parameters_schema ? JSON.parse(formData.parameters_schema) : {};

      const powerData = {
        workspace_id: workspace.id,
        name: formData.name,
        description: formData.description,
        method: formData.method,
        url: formData.url,
        headers: parsedHeaders,
        body: parsedBody,
        api_key_id: formData.api_key_id || null,
        parameters_schema: parsedParametersSchema,
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
        setTestResult(null); // Clear test result on save
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
    setValue("parameters_schema", JSON.stringify(power.parameters_schema || {}, null, 2));
    setTestResult(null);
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
      if (editingPowerId === id) {
        reset();
        setEditingPowerId(null);
        setTestResult(null);
      }
    }
  };

  const handleTestPower = async () => {
    setTestingPower(true);
    setTestResult(null);
    const formData = getValues();

    if (!formData.url) {
      showError("URL do Endpoint é obrigatória para testar.");
      setTestingPower(false);
      return;
    }

    try {
      const parsedHeaders = formData.headers ? JSON.parse(formData.headers) : {};
      const parsedBody = (formData.body && (currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH"))
        ? JSON.parse(formData.body)
        : undefined;

      const payload = {
        url: formData.url,
        method: formData.method,
        headers: parsedHeaders,
        body: parsedBody,
      };

      // Pass the payload object directly. The Supabase client will handle stringifying it.
      const { data, error: invokeError } = await supabase.functions.invoke('proxy-api', {
        body: payload,
      });

      if (invokeError) {
        let detailedError = invokeError.message;
        let errorStack = (invokeError as any).stack;

        if ((invokeError as any).context && typeof (invokeError as any).context.json === 'function') {
          try {
            const errorBody = await (invokeError as any).context.json();
            detailedError = errorBody.error || detailedError;
            errorStack = errorBody.stack || errorStack;
          } catch (e) {
            console.error("Could not parse JSON from Edge Function error response:", e);
          }
        }

        showError(`Erro da Edge Function: ${detailedError}`);
        setTestResult({
          error: `Erro da Edge Function: ${detailedError}`,
          details: errorStack,
        });
        console.error("Erro ao invocar Edge Function:", invokeError);
        return;
      }

      setTestResult(data);
      showSuccess("Teste de poder concluído via Edge Function!");

    } catch (e: any) {
      showError(`Erro ao testar poder: ${e.message}`);
      setTestResult({
        error: `Erro ao testar poder: ${e.message}`,
        details: e.stack,
      });
      console.error("Erro ao testar poder:", e);
    } finally {
      setTestingPower(false);
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
              <Label htmlFor="power-parameters-schema">Esquema de Parâmetros (JSON Schema)</Label>
              <Textarea 
                id="power-parameters-schema" 
                placeholder='{"type": "object", "properties": {"cidade": {"type": "string", "description": "A cidade para obter o clima."}}, "required": ["cidade"]}' 
                rows={5} 
                {...register("parameters_schema")} 
              />
              {errors.parameters_schema && <p className="text-destructive text-sm mt-1">{errors.parameters_schema.message as string}</p>}
              <p className="text-sm text-muted-foreground mt-1">
                Defina os parâmetros que a IA pode enviar para este poder, usando o formato JSON Schema.
              </p>
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
              <Textarea id="power-headers" placeholder='{"Content-Type": "application/json"}' rows={3} {...register("headers")} />
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
              <Select
                onValueChange={(value) => setValue("api_key_id", value === "none" ? null : value)}
                value={watch("api_key_id") || "none"}
              >
                <SelectTrigger id="power-api-key">
                  <SelectValue placeholder="Nenhuma chave de API" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.label} ({key.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.api_key_id && <p className="text-destructive text-sm mt-1">{errors.api_key_id.message}</p>}
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> {editingPowerId ? "Salvar Alterações" : "Adicionar Poder"}
              </Button>
              <Button type="button" onClick={handleTestPower} disabled={testingPower || isSubmitting} variant="secondary">
                <Play className="mr-2 h-4 w-4" /> {testingPower ? "Testando..." : "Testar Poder"}
              </Button>
              {editingPowerId && (
                <Button type="button" variant="outline" onClick={() => { reset(); setEditingPowerId(null); setTestResult(null); }} className="ml-2">
                  Cancelar Edição
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do Teste</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {testResult.error ? (
              <div className="text-destructive">
                <p className="font-semibold">Erro:</p>
                <pre className="bg-red-100 dark:bg-red-900 p-2 rounded-md text-sm overflow-auto">
                  {testResult.error}
                </pre>
                {testResult.details && (
                  <>
                    <p className="font-semibold mt-2">Detalhes:</p>
                    <pre className="bg-red-100 dark:bg-red-900 p-2 rounded-md text-sm overflow-auto">
                      {testResult.details}
                    </pre>
                  </>
                )}
              </div>
            ) : (
              <div>
                <p className={testResult.ok ? "text-green-600" : "text-orange-600"}>
                  Status: {testResult.status} {testResult.statusText} ({testResult.ok ? "OK" : "Erro"})
                </p>
                <p className="font-semibold mt-2">Headers da Resposta:</p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm overflow-auto">
                  {JSON.stringify(testResult.headers, null, 2)}
                </pre>
                <p className="font-semibold mt-2">Dados da Resposta:</p>
                <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm overflow-auto">
                  {typeof testResult.data === 'object' ? JSON.stringify(testResult.data, null, 2) : testResult.data}
                </pre>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              Nota: Este teste utiliza uma Edge Function do Supabase para contornar problemas de CORS. Chaves de API criptografadas não são descriptografadas automaticamente por esta Edge Function proxy.
            </p>
          </CardContent>
        </Card>
      )}

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