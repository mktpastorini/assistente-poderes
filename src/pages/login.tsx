"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useRouter } from "next/router"; // Using next/router for pages directory

const LoginPage = () => {
  const router = useRouter();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          router.push("/"); // Redirect to home if logged in
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 p-4">
      <div className="w-full max-w-md p-8 rounded-lg shadow-2xl bg-gray-800 bg-opacity-70 backdrop-filter backdrop-blur-lg border border-blue-700 border-opacity-50 relative overflow-hidden">
        <h2 className="text-3xl font-bold text-center text-white mb-8 tracking-wide">
          Acesso ao Sistema
        </h2>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "hsl(210 100% 70%)", // Bright blue for primary actions
                  brandAccent: "hsl(270 100% 70%)", // Bright purple for hover/focus
                  inputBackground: "hsl(220 20% 20%)", // Dark input background
                  inputBorder: "hsl(210 100% 50%)", // Blue border
                  inputBorderHover: "hsl(270 100% 50%)", // Purple border on hover
                  inputBorderFocus: "hsl(270 100% 60%)", // Brighter purple on focus
                  inputText: "hsl(0 0% 90%)", // Light gray text
                  defaultButtonBackground: "hsl(210 100% 60%)",
                  defaultButtonBackgroundHover: "hsl(210 100% 70%)",
                  defaultButtonBorder: "hsl(210 100% 60%)",
                  defaultButtonText: "hsl(0 0% 100%)",
                  messageBackground: "hsl(220 20% 25%)",
                  messageText: "hsl(0 0% 90%)",
                  anchorText: "hsl(210 100% 70%)",
                  anchorTextHover: "hsl(270 100% 70%)",
                },
                fontSizes: {
                  baseButtonSize: "1rem",
                  baseInputSize: "1rem",
                  baseLabelSize: "0.9rem",
                  baseLinkSize: "0.9rem",
                  baseMessageSize: "0.9rem",
                },
                radii: {
                  borderRadiusButton: "0.5rem",
                  borderRadiusInput: "0.5rem",
                },
              },
            },
          }}
          providers={["google", "github"]} // Exemplo de provedores, ajuste conforme necessário
          redirectTo={process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}
          localization={{
            variables: {
              sign_in: {
                email_label: "Email",
                password_label: "Senha",
                email_input_placeholder: "Seu email",
                password_input_placeholder: "Sua senha",
                button_label: "Entrar",
                social_provider_text: "Ou entre com",
                link_text: "Já tem uma conta? Entrar",
              },
              sign_up: {
                email_label: "Email",
                password_label: "Crie sua senha",
                email_input_placeholder: "Seu email",
                password_input_placeholder: "Sua senha",
                button_label: "Cadastrar",
                social_provider_text: "Ou cadastre-se com",
                link_text: "Não tem uma conta? Cadastre-se",
              },
              forgotten_password: {
                email_label: "Email",
                password_label: "Sua senha",
                email_input_placeholder: "Seu email",
                button_label: "Enviar instruções de recuperação",
                link_text: "Esqueceu sua senha?",
              },
              update_password: {
                password_label: "Nova senha",
                password_input_placeholder: "Sua nova senha",
                button_label: "Atualizar senha",
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default LoginPage;