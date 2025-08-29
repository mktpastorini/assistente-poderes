"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from './SessionContext';

interface SystemPower {
  id: string;
  name: string;
  method: string;
  url: string | null;
  headers: Record<string, string> | null;
  body: Record<string, any> | null;
  enabled: boolean;
  output_variable_name: string;
}

interface SystemContextType {
  systemVariables: Record<string, any>;
  loadingSystemContext: boolean;
  refreshSystemVariables: () => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { workspace, loading: sessionLoading } = useSession();
  const [systemVariables, setSystemVariables] = useState<Record<string, any>>({});
  const [loadingSystemContext, setLoadingSystemContext] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Para forçar o refresh

  const executeSystemPowers = async () => {
    if (!workspace?.id) {
      setLoadingSystemContext(false);
      return;
    }

    setLoadingSystemContext(true);
    try {
      const { data: enabledPowers, error } = await supabase
        .from('system_powers')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('enabled', true);

      if (error) {
        console.error("Erro ao carregar poderes do sistema habilitados:", error);
        showError("Erro ao carregar automações do sistema.");
        setLoadingSystemContext(false);
        return;
      }

      const newSystemVariables: Record<string, any> = {};
      for (const power of enabledPowers || []) {
        if (!power.url) {
          console.warn(`Poder do sistema '${power.name}' não tem URL definida. Ignorando.`);
          continue;
        }

        try {
          const payload = {
            url: power.url,
            method: power.method,
            headers: power.headers,
            body: power.body,
          };

          // Usar a Edge Function 'proxy-api' para executar a requisição
          const { data, error: invokeError } = await supabase.functions.invoke('proxy-api', { body: payload });

          if (invokeError) {
            console.error(`Erro ao executar poder do sistema '${power.name}':`, invokeError);
            showError(`Erro na automação '${power.name}'.`);
            newSystemVariables[power.output_variable_name] = { error: invokeError.message };
          } else {
            // Armazenar apenas a 'data' da resposta da proxy-api
            newSystemVariables[power.output_variable_name] = data?.data || data;
          }
        } catch (execError: any) {
          console.error(`Erro inesperado ao executar poder do sistema '${power.name}':`, execError);
          showError(`Erro inesperado na automação '${power.name}'.`);
          newSystemVariables[power.output_variable_name] = { error: execError.message };
        }
      }
      setSystemVariables(newSystemVariables);
    } catch (globalError: any) {
      console.error("Erro global ao processar poderes do sistema:", globalError);
      showError("Erro ao processar automações do sistema.");
    } finally {
      setLoadingSystemContext(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading) {
      executeSystemPowers();
    }
  }, [workspace, sessionLoading, refreshKey]);

  const refreshSystemVariables = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <SystemContext.Provider value={{ systemVariables, loadingSystemContext, refreshSystemVariables }}>
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemContextProvider');
  }
  return context;
};