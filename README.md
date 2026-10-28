# Sistema Acadêmico — Doutrina IELB

Sistema acadêmico da Igreja Evangélica Luterana do Brasil. O módulo **Administração → Pessoas** reúne os dados de pessoa, endereço, perfil e credenciais em um único cadastro; o sistema **não exige e-mail** de crianças/alunos.

## Tecnologias e organização

| Camada | Tecnologia | Local |
| --- | --- | --- |
| API | Java 25, Spring Boot 3.5.4 | `backend/src/main/java/` |
| Persistência | Spring Data JPA / Hibernate, PostgreSQL | `backend/src/main/java/br/org/ielb/academico/model/` e `repository/` |
| Versionamento do banco | Flyway | `backend/src/main/resources/db/migration/` |
| Autenticação | Sessão HTTP, senha com BCrypt (cost 12) | `backend/src/main/java/br/org/ielb/academico/service/` |
| Web | React 19, TypeScript, Vite | `frontend/src/` |
| Testes | JUnit/Mockito (Java), Node Test Runner (utilitários da view) | `backend/src/test/`, `frontend/tests/` |

**Não há mais `JdbcTemplate` nem CRUD administrativo separado de usuários.** O acesso é gerenciado pela própria pessoa; a API de autenticação permanece independente. A entidade `Pessoa` contém o perfil (`ADMINISTRADOR` ou `ALUNO`); cada pessoa possui **zero ou uma** conta `Usuario` vinculada.

## Como executar

Pré-requisitos: JDK **25**, Maven **3.9+**, PostgreSQL **14+**, Node.js **22+** e npm. No PostgreSQL, crie o banco com o nome exato (as aspas preservam letras maiúsculas):

```sql
CREATE DATABASE "sistemaAcademicoIELB";
```

Defina as credenciais reais de conexão **no ambiente**; a aplicação não inclui senha de PostgreSQL embutida. Exemplo no PowerShell:

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/sistemaAcademicoIELB"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "SENHA_REAL_DO_BANCO"
cd backend
mvn spring-boot:run
```

Em outro terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Acesse `http://localhost:5173`. O Vite redireciona `/api` para `http://localhost:8080`. Para verificar a API diretamente: `GET http://localhost:8080/api/health` (responde `{ "status": "ok" }`).

**Não execute migrations manualmente:** o Flyway aplica automaticamente `V1` a `V4` ao inicializar o backend, mantendo seu histórico em `flyway_schema_history`. O Hibernate usa `ddl-auto: validate`, portanto **não cria e não modifica o esquema**. SQL continua necessário para migrations, mesmo com JPA. Não apague nem reescreva versões já executadas em outros ambientes.

### Primeiro administrador local

Para ambiente de desenvolvimento e banco inicialmente vazio, após o Flyway rode **uma única vez** `backend/database/cadastrar_admin.sql` no pgAdmin. O script adiciona `admin` com senha inicial `Admin@12345`, **somente se ainda não existir conta vinculada à pessoa de teste**. Execuções repetidas não alteram senha nem reativam contas existentes. Altere a senha após o primeiro acesso. **Não execute este script em produção**; para produção, estabeleça um procedimento próprio e seguro de provisionamento inicial.

As migrations V1–V4 preservam instalações existentes: criam `pessoa`, associam usuários antigos à pessoa e substituem `email` por `login`. Os hashes BCrypt e perfis são mantidos. A extensão `pgcrypto` é utilizada somente na migration/SQL de provisionamento legado, **não nas operações Java/JPA**.

## Cadastro unificado: pessoa, endereço e usuário

Ao entrar com perfil **Administrador**, abra **Administração → Pessoas**. Use **Adicionar** para cadastrar, **duplo clique** ou **Enter** sobre uma linha para editar, e **botão direito** ou **Shift+F10** para excluir usando o menu contextual. A lista não exibe uma coluna de ações; o filtro único pesquisa **Nome, CPF, WhatsApp ou Login**, ignora acentos/maiúsculas e reconhece números com ou sem pontuação.

Na janela de cadastro, preencha **Nome, CPF, WhatsApp do responsável, CEP, Número, Logradouro, Complemento (opcional), Bairro, Cidade e UF**. Os campos de endereço podem ser preenchidos pelo **ViaCEP**, com possibilidade de correção manual; deixar o CEP sem alterá-lo não reaplica a busca nem sobrescreve o endereço corrigido. O CPF tem máscara e é validado ao perder o foco: verifica dígitos e consulta duplicidade na API. Um CPF já utilizado gera aviso orientando a editar o cadastro existente. Ao editar, manter o próprio CPF é permitido.

Na seção **Acesso ao sistema**, o perfil inicial sugerido é **Aluno**. Para novas pessoas, é possível criar a conta de acesso junto com o cadastro (opção inicialmente marcada) ou cadastrar somente a pessoa e criar a conta depois. O login é sugerido a partir de `primeiro.ultimo`, sem acentos e com sufixo se necessário. Pode ser personalizado: **3 a 80 caracteres**, começando por letra/número e usando apenas letras minúsculas, números, ponto, hífen e `_`. A senha inicial exige **pelo menos 4 caracteres**, inclusive quatro dígitos; a edição permite deixá-la vazia para manter a anterior. Use **Usuário ativo** para bloquear/liberar o acesso.

A API valida os mesmos dados no servidor, inclusive na gravação: indicadores visuais do frontend não substituem as restrições `UNIQUE` do banco. Pessoa e conta são gravadas em **uma transação JPA**, evitando cadastro parcialmente persistido em caso de erro. Um usuário já existente **não pode ser removido silenciosamente** omitindo o campo de acesso: para impedir login, desative **Usuário ativo**. A exclusão da pessoa remove também a conta associada; o sistema impede o administrador de excluir seu próprio cadastro, retirar seu próprio perfil administrativo ou desativar seu próprio usuário.

### API usada pelo frontend

| Método | Rota | Uso | Permissão |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Login por identificador e senha | Pública |
| `GET` | `/api/auth/me` | Sessão atual | Autenticado |
| `POST` | `/api/auth/logout` | Encerrar sessão | Autenticado |
| `GET` | `/api/pessoas` | Listar pessoas e acessos | Administrador |
| `GET` | `/api/pessoas/sugestao-login?nome=...` | Sugerir login único | Administrador |
| `GET` | `/api/pessoas/verificar-login?login=...&pessoaId=...` | Consultar disponibilidade do login | Administrador |
| `GET` | `/api/pessoas/verificar-cpf?cpf=...&pessoaId=...` | Validar disponibilidade do CPF | Administrador |
| `POST` | `/api/pessoas` | Criar pessoa (+ acesso opcional) | Administrador |
| `PUT` | `/api/pessoas/{id}` | Editar pessoa e acesso | Administrador |
| `DELETE` | `/api/pessoas/{id}` | Excluir pessoa e respectiva conta | Administrador |
| `GET` | `/api/health` | Saúde básica do processo | Pública |

**Não existem mais rotas administrativas `/api/usuarios`** nesta versão. Adeque qualquer cliente externo antigo para o cadastro unificado. As rotas `/api/auth/*` e `/api/pessoas/*` continuam sendo consumidas pela view.

## Testes e revisão

```powershell
# Backend (JDK 25, dependências Maven disponíveis)
cd backend
mvn test

# Frontend (Node.js 22+)
cd ../frontend
npm ci
npm test
npm run build
```

A suíte Java cobre operações CRUD, CPF inválido/duplicado, reutilização do próprio CPF/login na edição, senhas mínimas de quatro caracteres, proteção do administrador e autenticação. A suíte frontend executa testes automatizados de máscaras, algoritmo de CPF e filtro unificado. O TypeScript é verificado no build (`tsc`). Para detalhes do code review e dos testes efetivamente executados nesta revisão, consulte [`REVISAO_CADASTRO_PESSOAS.md`](REVISAO_CADASTRO_PESSOAS.md).

**Testes de integração com PostgreSQL e testes visuais de navegador** precisam de um ambiente com serviços, JDK e dependências configurados: crie uma pessoa, verifique a tabela/filtro, edite CPF e login, ative/desative, teste uma conta `ALUNO`, confirme recusa de duplicidade e exclua o cadastro. É importante conferir migrations em banco novo e também em cópia de banco com registros anteriores à V4, antes de publicar.

## Segurança e próximos módulos

- Senhas nunca retornam na API nem ficam em texto puro no banco: a recuperação/redefinição é administrativa. Não reutilize a senha inicial de teste fora do ambiente local.
- A regra de **4 caracteres** atende ao requisito atual, mas é **fraca para produção**; recomenda-se fortalecer a política e incluir limitação de tentativas de login antes de exposição pública.
- Para uso público, implemente política de CSRF adequada às sessões por cookie, HTTPS, backups e controles de acesso/observabilidade. O atributo `SameSite=Strict` já está configurado, mas não substitui uma revisão formal de segurança.
- O painel inicial ainda apresenta **indicadores demonstrativos**, não relatórios calculados com dados do banco. Funcionalidades de cursos e turmas continuam futuras.
