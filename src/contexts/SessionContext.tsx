"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
}

interface Workspace {
  id: string;
  name: string;
  plan: string;
  created_by: string;
}

interface SessionContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  workspace: Workspace | null;
  loading: boolean; // Overall loading for the session context
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // Novo estado para controlar o carregamento inicial completo

  // Effect para lidar com a sessão inicial e mudanças de estado de autenticação
  useEffect(() => {
    const loadSessionAndUser = async () => {
      const { data: { session: initialSession }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching initial session:', error);
        showError('Erro ao carregar sessão inicial.');
      }
      setSession(initialSession);
      setUser(initialSession?.user || null);
      // Não definimos initialLoadComplete aqui, pois ainda precisamos carregar perfil/workspace
    };

    loadSessionAndUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // Este listener deve apenas atualizar a sessão e o usuário, sem disparar um re-fetch completo de dados
      setSession(currentSession);
      setUser(currentSession?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []); // Executa apenas uma vez na montagem

  // Effect para buscar perfil e workspace quando o usuário muda
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        // Buscar perfil
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 significa "no rows found"
          console.error('Error fetching profile:', profileError);
          showError('Erro ao carregar perfil.');
          setProfile(null);
        } else {
          setProfile(profileData);
        }

        // Garantir que o usuário tenha um workspace ou criar um
        const { data: workspaceData, error: workspaceError } = await supabase.rpc('create_workspace_for_user', {
          p_user_id: user.id,
        });

        if (workspaceError) {
          console.error('Error ensuring workspace:', workspaceError);
          showError('Erro ao garantir workspace.');
          setWorkspace(null);
        } else {
          setWorkspace(workspaceData);
        }
      } else {
        // Usuário deslogado ou sem usuário
        setProfile(null);
        setWorkspace(null);
      }
      setInitialLoadComplete(true); // Marca que o carregamento inicial de dados está completo
    };

    // Só busca dados do usuário se 'user' foi definido pelo primeiro useEffect (não é 'undefined' inicial)
    // Isso evita que 'fetchUserData' seja chamado antes mesmo de 'loadSessionAndUser' ter uma chance de definir 'user'
    if (user !== undefined) {
      fetchUserData();
    }
  }, [user]); // Re-executa quando o objeto 'user' muda

  // O estado 'loading' geral é true até que o carregamento inicial completo seja marcado como true
  const loading = !initialLoadComplete;

  return (
    <SessionContext.Provider value={{ session, user, profile, workspace, loading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};