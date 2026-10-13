# Sistema Acadêmico Doutrina IELB

Aplicação acadêmica para o ensino da doutrina cristã da Igreja Evangélica Luterana do Brasil.

## Tecnologias

- **Backend:** Java 25, Spring Boot, Spring JDBC, Flyway e PostgreSQL.
- **Frontend:** React 19, TypeScript e Vite.

## Estrutura

- `backend/`: API Spring Boot e migrations do banco de dados.
- `frontend/`: aplicação React com as telas iniciais de login e home.

## Executar localmente

Requisitos: Java 25, Maven 3.9+, PostgreSQL 14+ e Node.js 22+.

Crie o banco PostgreSQL com o nome exato informado (as aspas preservam letras maiúsculas):

```sql
CREATE DATABASE "sistemaAcademicoIELB";
```

Antes de iniciar o backend, configure no mesmo terminal a senha real do usuário PostgreSQL (não use o texto de exemplo):

```powershell
$env:DB_URL = "jdbc:postgresql://localhost:5432/sistemaAcademicoIELB"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "sua_senha"
```

Inicie o backend:

```powershell
cd backend
mvn spring-boot:run
```

Em outro terminal, inicie o frontend:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173` · Backend: `http://localhost:8080` · Saúde da API: `http://localhost:8080/api/health`

Ao iniciar o backend, o Flyway aplica as migrations e cria as tabelas versionadas no código. Atualmente, a migration inicial cria `usuario`. A tela de login nesta etapa é apenas visual e leva à home para demonstração; autenticação real e demais tabelas dependem dos requisitos do projeto.

### Usuário para teste

Depois de iniciar o backend uma vez para o Flyway criar a tabela `usuario`, execute `backend/database/cadastrar_admin.sql` no Query Tool do pgAdmin conectado ao banco `sistemaAcademicoIELB`.

- **E-mail:** `admin@teste.com`
- **Senha:** `1`

O script cria ou atualiza o administrador de teste, armazenando a senha como BCrypt. Esta senha é apenas para desenvolvimento local. A tela atual ainda não valida as credenciais contra o banco.
