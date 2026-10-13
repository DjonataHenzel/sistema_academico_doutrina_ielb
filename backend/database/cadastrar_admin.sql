CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO usuario (nome, email, senha_hash, ativo)
VALUES (
    'Administrador',
    'admin@teste.com',
    crypt('1', gen_salt('bf', 12)),
    TRUE
)
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    senha_hash = EXCLUDED.senha_hash,
    ativo = TRUE,
    atualizado_em = CURRENT_TIMESTAMP;