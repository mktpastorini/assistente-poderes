INSERT INTO public.system_powers (
  workspace_id,
  name,
  description,
  method,
  url,
  headers,
  body,
  enabled,
  output_variable_name
) VALUES (
  (SELECT id FROM public.workspaces LIMIT 1), -- Assume o primeiro workspace disponível
  'get_client_ip',
  'Obtém o endereço IP do cliente que acessa a aplicação.',
  'GET',
  'https://mcnegecxqstyqlbcrhxp.supabase.co/functions/v1/get-client-ip',
  '{}'::jsonb,
  '{}'::jsonb,
  TRUE,
  'ip_cliente'
)
ON CONFLICT (workspace_id, name) DO UPDATE SET
  description = EXCLUDED.description,
  method = EXCLUDED.method,
  url = EXCLUDED.url,
  headers = EXCLUDED.headers,
  body = EXCLUDED.body,
  enabled = EXCLUDED.enabled,
  output_variable_name = EXCLUDED.output_variable_name;