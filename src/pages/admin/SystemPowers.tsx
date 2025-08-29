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
import { PlusCircle, Trash2, Edit, Play, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface SystemPower {
  id: string;
  name: string;
  description: string | null;
  method: string;
  url: string | null;
  headers: Record<string, string> | null;
  body: Record<string, any> | null;
  enabled: boolean;
  output_variable_name: string;
  created_at: string;
}

const systemPowerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nome do Poder é obrigatório"),
  description: z.string().optional().nullable(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  url: z.string().url("URL inválida").optional().nullable(),
  headers: z.string().optional().nullable(), // JSON string
  body: z.string().optional().nullable(), // JSON string
  enabled: z.boolean(),
  output_variable_name: z.string().min(1, "Nome da variável de saída é obrigatório").regex(/^[a-zA-Z0-9_]+$/, "Nome da variável deve conter apenas letras, números e _"),
});

type SystemPowerFormData = z.infer<typeof systemPowerSchema>;

const SystemPowersPage: React.FC = () => {
  const { workspace, loading: sessionLoading } = useSession();
  const [systemPowers, setSystemPowers] = useState<SystemPower[]>([]);
  const [loadingSystemPowers, setLoadingSystemPowers] = useState(true);
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<SystemPowerFormData>({
    resolver: zodResolver(systemPowerSchema),
    defaultValues: {
      name: "",
      description: "",
      method: "GET",
      url: "",
      headers: '{"Content-Type": "application/json"}',
      body: "{}",
      enabled: true,
      output_variable_name: "",
    },
  });

  const currentMethod = watch("method");

  const fetchSystemPowers = async () => {
    if (!workspace?.id) return;
    setLoadingSystemPowers(true);
    const { data, error } = await supabase
      .from('system_powers')
      .select('*')
      .eq('workspace_id', workspace.id);
    if (error) {
      showError("Erro ao carregar poderes do sistema.");
      console.error(error);
    } else {
      setSystemPowers(data || []);
    }
    setLoadingSystemPowers(false);
  };

  useEffect(() => {
    if (!sessionLoading && workspace) {
      fetchSystemPowers();
    }
  }, [workspace, sessionLoading]);

  const onSubmit = async (formData: SystemPowerFormData) => {
    if (!workspace) {
      showError("Workspace não encontrado.");
      return;
    }
    try {
      const parsedHeaders = formData.headers ? JSON.parse(formData.headers) : {};
      const parsedBody = (formData.body && (currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH")) ? JSON.parse(formData.body) : {};
      
      const powerData = {
        workspace_id: workspace.id,
        name: formData.name,
        description: formData.description,
        method: formData.method,
        url: formData.url,
        headers: parsedHeaders,
        body: parsedBody,
        enabled: formData.enabled,
        output_variable_name: formData.output_variable_name,
      };

      let error;
      if (editingPowerId) {
        const { error: updateError } = await supabase.from('system_powers').update(powerData).eq('id', editingPowerId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('system_powers').insert(powerData);
        error = insertError;
      }

      if (error) {
        showError(`Erro ao ${editingPowerId ? 'atualizar' : 'adicionar'} poder do sistema.`);
        console.error(error);
      } else {
        showSuccess(`Poder do sistema ${editingPowerId ? 'atualizado' : 'adicionado'} com sucesso!`);
        reset();
        setEditingPowerId(null);
        setTestResult(null);
        fetchSystemPowers(); // Recarrega a lista
      }
    } catch (e: any) {
      showError(`Erro ao processar JSON: ${e.message}`);
      console.error(e);
    }
  };

  const onEdit = (power: SystemPower) => {
    setEditingPowerId(power.id);
    const formValues = {
      ...power,
      headers: JSON.stringify(power.headers || {}, null, 2),
      body: JSON.stringify(power.body || {}, null, 2),
    };
    reset(formValues);
    setTestResult(null);
  };

  const onDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este poder do sistema?")) return;
    const { error } = await supabase.from('system_powers').delete().eq('id', id);
    if (error) {
      showError("Erro ao excluir poder do sistema.");
      console.error(error);
    } else {
      showSuccess("Poder do sistema excluído com sucesso!");
      setSystemPowers(systemPowers.filter(p => p.id !== id));
      if (editingPowerId === id) {
        reset();
        setEditingPowerId(null);
        setTestResult(null);
      }
    }
  };

  const onToggleEnabled = async (power: SystemPower) => {
    const { error } = await supabase
      .from('system_powers')
      .update({ enabled: !power.enabled })
      .eq('id', power.id);

    if (error) {
      showError("Erro ao atualizar status do poder.");
      console.error(error);
    } else {
      showSuccess("Status do poder atualizado!");
      fetchSystemPowers();
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
      const parsedBody = (formData.body && (currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH")) ? JSON.parse(formData.body) : undefined;
      const payload = { url: formData.url, method: formData.method, headers: parsedHeaders, body: parsedBody };
      
      const { data, error: invokeError } = await supabase.functions.invoke('proxy-api', { body: payload });
      
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
        setTestResult({ error: `Erro da Edge Function: ${detailedError}`, details: errorStack });
        console.error("Erro ao invocar Edge Function:", invokeError);
        return;
      }
      setTestResult(data);
      showSuccess("Teste de poder concluído via Edge Function!");
    } catch (e: any) {
      showError(`Erro ao testar poder: ${e.message}`);
      setTestResult({ error: `Erro ao testar poder: ${e.message}`, details: e.stack });
      console.error("Erro ao testar poder:", e);
    } finally {
      setTestingPower(false);
    }
  };

  if (sessionLoading || loadingSystemPowers) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Poderes do Sistema</h1>

      <Card>
        <CardHeader><CardTitle>{editingPowerId ? "Editar Poder do Sistema" : "Adicionar Novo Poder do Sistema"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="power-name">Nome do Poder</Label>
              <Input id="power-name" placeholder="Ex: get_client_ip, get_current_time" {...register("name")} />
              {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="power-output-variable">Nome da Variável de Saída</Label>
              <Input id="power-output-variable" placeholder="Ex: client_ip, current_time" {...register("output_variable_name")} />
              {errors.output_variable_name && <p className="text-destructive text-sm mt-1">{errors.output_variable_name.message}</p>}
              <p className="text-sm text-muted-foreground mt-1">O resultado deste poder será armazenado nesta variável no contexto do sistema.</p>
            </div>
            <div>
              <Label htmlFor="power-description">Descrição</Label>
              <Textarea id="power-description" placeholder="Descreva o que este poder faz." rows={2} {...register("description")} />
            </div>
            <div>
              <Label htmlFor="power-method">Método HTTP</Label>
              <Select onValueChange={(value) => setValue("method", value as any)} value={currentMethod}>
                <SelectTrigger id="power-method"><SelectValue placeholder="Selecione o método" /></SelectTrigger>
                <SelectContent><SelectItem value="GET">GET</SelectItem><SelectItem value="POST">POST</SelectItem><SelectItem value="PUT">PUT</SelectItem><SelectItem value="DELETE">DELETE</SelectItem><SelectItem value="PATCH">PATCH</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="power-url">URL do Endpoint</Label>
              <Input id="power-url" placeholder="https://mcnegecxqstyqlbcrhxp.supabase.co/functions/v1/get-client-ip" {...register("url")} />
              {errors.url && <p className="text-destructive text-sm mt-1">{errors.url.message}</p>}
            </div>
            <div>
              <Label htmlFor="power-headers">Cabeçalhos (JSON)</Label>
              <Textarea id="power-headers" placeholder='{"Content-Type": "application/json"}' rows={3} {...register("headers")} />
            </div>
            {(currentMethod === "POST" || currentMethod === "PUT" || currentMethod === "PATCH") && (
              <div><Label htmlFor="power-body">Corpo da Requisição (JSON)</Label><Textarea id="power-body" placeholder='{"chave": "valor"}' rows={5} {...register("body")} /></div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="power-enabled"
                checked={watch("enabled")}
                onCheckedChange={(checked) => setValue("enabled", checked)}
              />
              <Label htmlFor="power-enabled">Habilitado</Label>
            </div>
            <div className="flex space-x-2">
              <Button type="submit" disabled={isSubmitting}><PlusCircle className="mr-2 h-4 w-4" /> {editingPowerId ? "Salvar Alterações" : "Adicionar Poder"}</Button>
              <Button type="button" onClick={handleTestPower} disabled={testingPower || isSubmitting} variant="secondary"><Play className="mr-2 h-4 w-4" /> {testingPower ? "Testando..." : "Testar Poder"}</Button>
              {editingPowerId && (<Button type="button" variant="outline" onClick={() => { reset(); setEditingPowerId(null); setTestResult(null); }} className="ml-2">Cancelar Edição</Button>)}
            </div>
          </form>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader><CardTitle>Resultado do Teste</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {testResult.error ? (
              <div className="text-destructive">
                <p className="font-semibold">Erro:</p><pre className="bg-red-100 dark:bg-red-900 p-2 rounded-md text-sm overflow-auto">{testResult.error}</pre>
                {testResult.details && (<><p className="font-semibold mt-2">Detalhes:</p><pre className="bg-red-100 dark:bg-red-900 p-2 rounded-md text-sm overflow-auto">{testResult.details}</pre></>)}
              </div>
            ) : (
              <div>
                <p className={testResult.ok ? "text-green-600" : "text-orange-600"}>Status: {testResult.status} {testResult.statusText} ({testResult.ok ? "OK" : "Erro"})</p>
                <p className="font-semibold mt-2">Headers da Resposta:</p><pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm overflow-auto">{JSON.stringify(testResult.headers, null, 2)}</pre>
                <p className="font-semibold mt-2">Dados da Resposta:</p><pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-sm overflow-auto">{typeof testResult.data === 'object' ? JSON.stringify(testResult.data, null, 2) : testResult.data}</pre>
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-4">Nota: Este teste utiliza uma Edge Function do Supabase para contornar problemas de CORS.</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Poderes do Sistema Existentes</CardTitle></CardHeader>
        <CardContent>
          {systemPowers.length === 0 ? (<p className="text-muted-foreground">Nenhum poder do sistema adicionado ainda.</p>) : (
            <div className="space-y-4">
              {systemPowers.map((power) => (
                <div key={power.id} className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <h3 className="font-semibold">{power.name} <span className="text-xs text-blue-500">({power.output_variable_name})</span></h3>
                    <p className="text-sm text-muted-foreground">{power.description}</p>
                    <p className="text-xs text-muted-foreground">{power.method} {power.url}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => onToggleEnabled(power)}>
                      {power.enabled ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onEdit(power)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(power.id)}><Trash2 className="h-4 w-4" /></Button>
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

export default SystemPowersPage;