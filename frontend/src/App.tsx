import { useState, type FormEvent } from "react";

function Marca() {
  return (
    <span className="marca-institucional" aria-hidden="true">
      <img src="/ielb-simbolo.svg" alt="" />
    </span>
  );
}

function Login({ aoEntrar }: { aoEntrar: () => void }) {
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    aoEntrar();
  }

  return (
    <main className="pagina-login">
      <div className="login-identidade">
        <Marca />
        <span className="identidade-texto">
          <span className="nome-igreja">
            Igreja Evangélica
            <br />
            Luterana do Brasil
          </span>
          <span className="nome-sistema">Sistema Acadêmico</span>
        </span>
      </div>
      <form className="painel-login" onSubmit={enviar}>
        <div className="titulo-login">
          <p className="sobretitulo">ÁREA DO ALUNO</p>
          <h1>Acesse sua conta</h1>
          <p>Entre com suas credenciais para continuar.</p>
        </div>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="seu.email@exemplo.com"
          required
        />
        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          required
        />
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}

function Home({ aoSair }: { aoSair: () => void }) {
  return (
    <main className="pagina-home">
      <header className="cabecalho">
        <a className="marca-home" href="#inicio" aria-label="Início">
          <Marca />
          <span>
            <strong>IELB</strong>
            <small>Sistema Acadêmico</small>
          </span>
        </a>
        <button className="botao-sair" type="button" onClick={aoSair}>
          Sair
        </button>
      </header>
      <section className="boas-vindas" id="inicio">
        <div className="linha-decorativa" />
        <Marca />
        <p className="sobretitulo">SISTEMA ACADÊMICO</p>
        <h1>Doutrina IELB</h1>
        <p className="texto-boas-vindas">
          Bem-vindo ao ambiente de ensino da Igreja Evangélica Luterana do
          Brasil.
        </p>
      </section>
      <footer className="rodape-home">
        IELB <span /> Ensino da doutrina cristã
      </footer>
    </main>
  );
}

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  return autenticado ? (
    <Home aoSair={() => setAutenticado(false)} />
  ) : (
    <Login aoEntrar={() => setAutenticado(true)} />
  );
}
