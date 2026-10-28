-- Preserva todas as contas e senhas: apenas troca o identificador de acesso.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TABLE usuario ADD COLUMN login VARCHAR(80);

WITH nomes AS (
    SELECT u.id,
           regexp_replace(
               regexp_replace(
                   translate(lower(trim(p.nome)),
                       'áàâãäåéèêëíìîïóòôõöúùûüçñ',
                       'aaaaaaeeeeiiiiooooouuuucn'),
                   '[^a-z0-9 ]', '', 'g'),
               ' +', ' ', 'g') AS nome_normalizado
    FROM usuario AS u
    JOIN pessoa AS p ON p.id = u.pessoa_id
),
bases AS (
    SELECT id,
           COALESCE(NULLIF(split_part(nome_normalizado, ' ', 1), ''), 'aluno') AS primeiro,
           COALESCE(NULLIF(split_part(nome_normalizado, ' ', 2), ''), 'aluno') AS segundo,
           nome_normalizado
    FROM nomes
),
logins AS (
    SELECT id,
           LEFT(primeiro || '.' ||
               COALESCE(NULLIF((regexp_match(nome_normalizado, '[^ ]+$'))[1], ''), segundo), 68) AS base
    FROM bases
),
numerados AS (
    SELECT id, base,
           ROW_NUMBER() OVER (PARTITION BY base ORDER BY id) AS ordem
    FROM logins
)
UPDATE usuario AS u
SET login = CASE WHEN n.ordem = 1 THEN n.base ELSE n.base || '.' || u.id::text END
FROM numerados AS n
WHERE u.id = n.id;

ALTER TABLE usuario ALTER COLUMN login SET NOT NULL;
ALTER TABLE usuario ADD CONSTRAINT usuario_login_unique UNIQUE (login);
ALTER TABLE usuario ADD CONSTRAINT usuario_login_formato_check
    CHECK (login ~ '^[a-z0-9][a-z0-9._-]{2,79}$');
ALTER TABLE usuario DROP COLUMN email;
