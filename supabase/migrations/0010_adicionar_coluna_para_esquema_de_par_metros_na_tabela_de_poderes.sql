-- Adiciona a coluna parameters_schema à tabela powers para suportar a definição de parâmetros para Function Calling da OpenAI.
ALTER TABLE public.powers
ADD COLUMN parameters_schema jsonb NOT NULL DEFAULT '{"type": "object", "properties": {}, "required": []}'::jsonb;

-- Adiciona um comentário para explicar o propósito da nova coluna.
COMMENT ON COLUMN public.powers.parameters_schema IS 'JSON Schema definition for the parameters of the power, used for OpenAI Function Calling.';