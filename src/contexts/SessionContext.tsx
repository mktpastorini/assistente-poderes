"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const lastUserIdRef = useRef<string | null>(null);

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
    };

    loadSessionAndUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      // Atualiza user somente se mudou para evitar loop
      if (currentSession?.user?.id !== lastUserIdRef.current) {
        setUser(currentSession?.user || null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect para buscar perfil e workspace quando o usuário muda
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        if (user.id === lastUserIdRef.current) {
          // Já carregamos dados para este usuário, evitar fetch repetido
          setInitialLoadComplete(true);
          return;
        }
        lastUserIdRef.current = user.id;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
          showError('Erro ao carregar perfil.');
          setProfile(null);
        } else {
          setProfile(profileData);
        }

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
        lastUserIdRef.current = null;
        setProfile(null);
        setWorkspace(null);
      }
      setInitialLoadComplete(true);
    };

    if (user !== undefined) {
      fetchUserData();
    }
  }, [user]);

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