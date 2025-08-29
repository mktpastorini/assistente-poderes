"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { useSession } from './SessionContext';
import { replacePlaceholders } from '@/lib/utils'; // Importar a função

interface SystemContextType {
  systemVariables: Record<string, any>;
  loadingSystemContext: boolean;
  refreshSystemVariables: () => void;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

// URL da Edge Function get-client-ip
const GET_CLIENT_IP_FUNCTION_URL = `https://mcnegecxqstyqlbcrhxp.supabase.co/functions/v1/get-client-ip`;

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
      // 1. Buscar poderes em ordem de criação para garantir execução sequencial
      const { data: enabledPowers, error } = await supabase
        .from('system_powers')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('enabled', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("[SystemContext] Erro ao carregar poderes do sistema habilitados:", error);
        showError("Erro ao carregar automações do sistema.");
        setLoadingSystemContext(false);
        return;
      }

      const newSystemVariables: Record<string, any> = {};
      // 2. Executar poderes em um loop sequencial (for...of com await)
      for (const power of enabledPowers || []) {
        if (!power.url) {
          console.warn(`[SystemContext] Poder do sistema '${power.name}' não tem URL definida. Ignorando.`);
          continue;
        }

        try {
          let data, invokeError;
          const isGetClientIpPower = power.url === GET_CLIENT_IP_FUNCTION_URL;

          if (isGetClientIpPower) {
            // Invocar get-client-ip diretamente do cliente usando fetch para obter o IP real do navegador
            console.log(`[SystemContext] Directly fetching 'get-client-ip' for power '${power.name}'`);
            try {
              const response = await fetch(GET_CLIENT_IP_FUNCTION_URL, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorBody.error || response.statusText}`);
              }
              data = await response.json();
              invokeError = null; // No error
            } catch (e: any) {
              invokeError = e;
              data = null;
            }
          } else {
            // Para outros poderes, continuar usando proxy-api
            // 3. Substituir placeholders usando as variáveis já coletadas
            const processedUrl = replacePlaceholders(power.url, newSystemVariables);
            const processedHeadersStr = replacePlaceholders(JSON.stringify(power.headers || {}), newSystemVariables);
            const processedBodyStr = replacePlaceholders(JSON.stringify(power.body || {}), newSystemVariables);

            const payload = {
              url: processedUrl,
              method: power.method,
              headers: JSON.parse(processedHeadersStr),
              body: JSON.parse(processedBodyStr),
            };

            console.log(`[SystemContext] Executing power '${power.name}' via 'proxy-api'. URL: ${payload.url}`);
            const { data: proxyData, error: proxyError } = await supabase.functions.invoke('proxy-api', { body: payload });
            data = proxyData;
            invokeError = proxyError;
          }
          
          console.log(`[SystemContext] Resultado bruto para '${power.name}':`, { data, invokeError });

          if (invokeError) {
            console.error(`[SystemContext] Erro ao executar poder do sistema '${power.name}':`, invokeError);
            showError(`Erro na automação '${power.name}'.`);
            newSystemVariables[power.output_variable_name] = { error: invokeError.message };
          } else {
            // 4. Adicionar o resultado ao objeto de variáveis para o próximo poder usar
            newSystemVariables[power.output_variable_name] = data?.data || data;
          }
        } catch (execError: any) {
          console.error(`[SystemContext] Erro inesperado ao executar poder do sistema '${power.name}':`, execError);
          showError(`Erro inesperado na automação '${power.name}'.`);
          newSystemVariables[power.output_variable_name] = { error: execError.message };
        }
      }
      setSystemVariables(newSystemVariables);
      console.log("[SystemContext] Final systemVariables:", newSystemVariables);
    } catch (globalError: any) {
      console.error("[SystemContext] Erro global ao processar poderes do sistema:", globalError);
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