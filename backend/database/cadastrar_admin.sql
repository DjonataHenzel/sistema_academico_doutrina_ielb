-- Apenas para testes locais, após o Flyway. Credencial inicial: admin / Admin@12345.
-- NÃO execute em produção. A execução repetida NÃO redefine a senha nem reativa usuários.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

--Criação do usuário aluno.aluno 
INSERT INTO public.pessoa(id, cpf, whatsapp, nome, cep, logradouro, numero, complemento, bairro, cidade, uf, tipo_usuario, criado_em, atualizado_em) 
VALUES (1, 58631575003, 45999999999, 'aluno', 85909050, 'Rua dos Butias', 12, 'Casa verde', 'Vila Operária', 'Toledo', 'PR', 'ALUNO', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO public.usuario(id, senha_hash, ativo, criado_em, atualizado_em, pessoa_id, login)
VALUES (1, '$2a$12$xefq6C4KPzRSVS0suyV91OZT6Dlsv10Y4M8ziyzhW/hj/nSqxC2FG', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, 'aluno.aluno');


--Criação do usuário admin.admin
INSERT INTO public.pessoa(id, cpf, whatsapp, nome, cep, logradouro, numero, complemento, bairro, cidade, uf, tipo_usuario, criado_em, atualizado_em) 
VALUES (2, 33582915026, 45999999999, 'admin', 85909050, 'Rua dos Butias', 1245, 'Casa amarela', 'Vila Operária', 'Toledo', 'PR', 'ADMINISTRADOR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO public.usuario(id, senha_hash, ativo, criado_em, atualizado_em, pessoa_id, login)
VALUES (2, '$2a$12$xefq6C4KPzRSVS0suyV91OZT6Dlsv10Y4M8ziyzhW/hj/nSqxC2FG', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 2, 'admin.admin');

COMMIT;
