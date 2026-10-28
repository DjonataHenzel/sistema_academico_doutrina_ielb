import { useEffect, useRef, useState, type FormEvent } from "react";
import { cpfValido, digitos, filtrarPessoas, formatarCep, formatarCpf, formatarWhatsapp } from "./pessoaUtils";
import { createPortal } from "react-dom";

type TipoUsuario = "ADMINISTRADOR" | "ALUNO";

type Usuario = {
  id: number;
  pessoaId: number;
  nome: string;
  login: string;
  tipoUsuario: TipoUsuario;
  ativo: boolean;
};

type Pessoa = {
  id: number;
  cpf: string | null;
  whatsapp: string | null;
  nome: string;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipoUsuario: TipoUsuario;
  usuarioId: number | null;
  login: string | null;
  usuarioAtivo: boolean | null;
};

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function requisicao<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = "Não foi possível concluir a solicitação.";
    try {
      const body = (await response.json()) as { detail?: string; message?: string };
      message = body.detail ?? body.message ?? message;
    } catch {
      // A resposta pode não conter JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function Marca() {
  return (
    <span className="marca-institucional" aria-hidden="true">
      <img src="/ielb-simbolo.svg" alt="" />
    </span>
  );
}

function Login({
  aoEntrar,
  erro,
}: {
  aoEntrar: (usuario: Usuario) => void;
  erro: string;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erroLogin, setErroLogin] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErroLogin("");
    const dados = new FormData(evento.currentTarget);
    try {
      const usuario = await requisicao<Usuario>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          login: dados.get("login"),
          senha: dados.get("senha"),
        }),
      });
      aoEntrar(usuario);
    } catch (error) {
      setErroLogin(
        error instanceof Error ? error.message : "Não foi possível entrar.",
      );
    } finally {
      setEnviando(false);
    }
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
          <p className="sobretitulo">ACESSO AO SISTEMA</p>
          <h1>Acesse sua conta</h1>
          <p>Entre com suas credenciais para continuar.</p>
        </div>
        <label htmlFor="login">Login</label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          placeholder="nome.sobrenome"
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
        {(erroLogin || erro) && (
          <p className="mensagem-erro" role="alert">
            {erroLogin || erro}
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}

type CamposPessoa = {
  cpf: string;
  whatsapp: string;
  nome: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  tipoUsuario: TipoUsuario;
  criarAcesso: boolean;
  login: string;
  senha: string;
  ativo: boolean;
};

function IconeSecaoPessoa({ nome }: { nome: "dados" | "endereco" | "acesso" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {nome === "dados" && <>
        <circle cx="12" cy="7.5" r="3.2" />
        <path d="M5 20v-2.3c0-3.2 2.8-5.3 7-5.3s7 2.1 7 5.3V20" />
      </>}
      {nome === "endereco" && <>
        <path d="M20 10c0 5.4-8 11.3-8 11.3S4 15.4 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>}
      {nome === "acesso" && <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
      </>}
    </svg>
  );
}

function FormularioPessoa({
  pessoa,
  aoSalvar,
  aoCancelar,
}: {
  pessoa: Pessoa | null;
  aoSalvar: (dados: CamposPessoa) => Promise<void>;
  aoCancelar: () => void;
}) {
  const [campos, setCampos] = useState<CamposPessoa>({
    cpf: formatarCpf(pessoa?.cpf ?? ""),
    whatsapp: formatarWhatsapp(pessoa?.whatsapp ?? ""),
    nome: pessoa?.nome ?? "",
    cep: formatarCep(pessoa?.cep ?? ""),
    logradouro: pessoa?.logradouro ?? "",
    numero: pessoa?.numero ?? "",
    complemento: pessoa?.complemento ?? "",
    bairro: pessoa?.bairro ?? "",
    cidade: pessoa?.cidade ?? "",
    uf: pessoa?.uf ?? "",
    tipoUsuario: pessoa?.tipoUsuario ?? "ALUNO",
    criarAcesso: Boolean(pessoa?.usuarioId) || !pessoa,
    login: pessoa?.login ?? "",
    senha: "",
    ativo: pessoa?.usuarioAtivo ?? true,
  });
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const ultimoCepConsultado = useRef<string>(digitos(pessoa?.cep ?? ""));
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [avisoSenha, setAvisoSenha] = useState("");
  const [loginPersonalizado, setLoginPersonalizado] = useState(Boolean(pessoa?.login));
  const [situacaoLogin, setSituacaoLogin] = useState<"ocioso" | "verificando" | "disponivel" | "indisponivel" | "erro">("ocioso");
  const [cpfDesfocado, setCpfDesfocado] = useState(false);
  const [tentativasValidacaoCpf, setTentativasValidacaoCpf] = useState(0);
  const [situacaoCpf, setSituacaoCpf] = useState<"ocioso" | "invalido" | "verificando" | "disponivel" | "duplicado" | "erro">("ocioso");
  const cpfNumerico = digitos(campos.cpf);
  const loginNormalizado = campos.login.trim().toLowerCase();

  // Checagem no banco com debounce. Ao editar, ignora apenas o usuário da própria pessoa.
  useEffect(() => {
    if (!campos.criarAcesso || !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(loginNormalizado)) {
      setSituacaoLogin("ocioso");
      return;
    }
    const controle = new AbortController();
    setSituacaoLogin("verificando");
    const timer = window.setTimeout(() => {
      const parametros = new URLSearchParams({ login: loginNormalizado });
      if (pessoa?.id) parametros.set("pessoaId", String(pessoa.id));
      void requisicao<{ disponivel: boolean }>(`/api/pessoas/verificar-login?${parametros}`, {
        signal: controle.signal,
      }).then((resposta) => {
        if (!controle.signal.aborted) {
          setSituacaoLogin(resposta.disponivel ? "disponivel" : "indisponivel");
        }
      }).catch(() => {
        if (!controle.signal.aborted) setSituacaoLogin("erro");
      });
    }, 350);
    return () => { window.clearTimeout(timer); controle.abort(); };
  }, [campos.criarAcesso, loginNormalizado, pessoa?.id]);

  // Verifica os dígitos localmente ao sair do campo e a duplicidade no PostgreSQL.
  // O AbortController descarta respostas antigas caso o CPF seja editado durante a consulta.
  useEffect(() => {
    if (!cpfDesfocado) {
      setSituacaoCpf("ocioso");
      return;
    }
    if (!cpfValido(cpfNumerico)) {
      setSituacaoCpf("invalido");
      return;
    }
    const controle = new AbortController();
    setSituacaoCpf("verificando");
    const parametros = new URLSearchParams({ cpf: cpfNumerico });
    if (pessoa?.id) parametros.set("pessoaId", String(pessoa.id));
    void requisicao<{ disponivel: boolean }>(`/api/pessoas/verificar-cpf?${parametros}`, {
      signal: controle.signal,
    }).then((resposta) => {
      if (!controle.signal.aborted) {
        setSituacaoCpf(resposta.disponivel ? "disponivel" : "duplicado");
      }
    }).catch(() => {
      if (!controle.signal.aborted) setSituacaoCpf("erro");
    });
    return () => controle.abort();
  }, [cpfDesfocado, cpfNumerico, pessoa?.id, tentativasValidacaoCpf]);

  // Sugestão consultada na API, evitando repetir logins já existentes.
  useEffect(() => {
    if (loginPersonalizado || pessoa?.usuarioId || !campos.criarAcesso || !campos.nome.trim()) return;
    const controle = new AbortController();
    const timer = window.setTimeout(() => {
      void requisicao<{ login: string }>(
        `/api/pessoas/sugestao-login?nome=${encodeURIComponent(campos.nome)}`,
        { signal: controle.signal },
      ).then((resposta) => {
        if (!controle.signal.aborted) setCampos((atuais) => ({ ...atuais, login: resposta.login }));
      }).catch(() => { /* O usuário poderá informar o login manualmente. */ });
    }, 300);
    return () => { window.clearTimeout(timer); controle.abort(); };
  }, [campos.nome, campos.criarAcesso, pessoa?.usuarioId, loginPersonalizado]);

  function atualizar<K extends keyof CamposPessoa>(campo: K, valor: CamposPessoa[K]) {
    setCampos((atuais) => ({ ...atuais, [campo]: valor }));
  }

  async function buscarCep(forcar = false) {
    const cep = digitos(campos.cep);
    if (!cep || (!forcar && cep === ultimoCepConsultado.current)) return;
    if (cep.length !== 8) {
      setErro("Informe um CEP com 8 dígitos para buscar o endereço.");
      return;
    }
    setErro("");
    setConsultandoCep(true);
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!resposta.ok) {
        throw new Error("Não foi possível consultar o CEP. Tente novamente.");
      }
      const endereco = await resposta.json() as {
        erro?: boolean;
        logradouro?: string;
        complemento?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (endereco.erro) {
        throw new Error("CEP não encontrado. Verifique o número informado.");
      }
      ultimoCepConsultado.current = cep;
      setCampos((atuais) => digitos(atuais.cep) !== cep ? atuais : ({
        ...atuais,
        logradouro: endereco.logradouro ?? "",
        complemento: endereco.complemento ?? atuais.complemento,
        bairro: endereco.bairro ?? "",
        cidade: endereco.localidade ?? "",
        uf: endereco.uf ?? "",
      }));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
    } finally {
      setConsultandoCep(false);
    }
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    if (!cpfValido(campos.cpf)) {
      setCpfDesfocado(true);
      setSituacaoCpf("invalido");
      setErro("Informe um CPF válido.");
      return;
    }
    if (campos.criarAcesso && !/^[a-z0-9][a-z0-9._-]{2,79}$/.test(campos.login.trim().toLowerCase())) {
      setErro("Informe um login válido com 3 a 80 caracteres, sem espaços nem acentos.");
      return;
    }
    if (campos.criarAcesso && !pessoa?.usuarioId && campos.senha.length < 4) {
      setErro("Informe uma senha inicial de pelo menos 4 caracteres.");
      return;
    }
    if (campos.senha && campos.senha.length < 4) {
      setErro("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    setSalvando(true);
    try {
      // Mesmo que o usuário não tenha saído do campo, revalida a unicidade no banco.
      const parametrosCpf = new URLSearchParams({ cpf: cpfNumerico });
      if (pessoa?.id) parametrosCpf.set("pessoaId", String(pessoa.id));
      const verificacaoCpf = await requisicao<{ disponivel: boolean }>(
        `/api/pessoas/verificar-cpf?${parametrosCpf}`,
      );
      if (!verificacaoCpf.disponivel) {
        setCpfDesfocado(true);
        setSituacaoCpf("duplicado");
        return;
      }
      // Revalida ao salvar; a indicação visual não substitui a checagem no servidor.
      if (campos.criarAcesso) {
        const parametros = new URLSearchParams({ login: loginNormalizado });
        if (pessoa?.id) parametros.set("pessoaId", String(pessoa.id));
        const verificacao = await requisicao<{ disponivel: boolean }>(
          `/api/pessoas/verificar-login?${parametros}`,
        );
        if (!verificacao.disponivel) {
          setSituacaoLogin("indisponivel");
          return;
        }
      }
      await aoSalvar({
        ...campos,
        cpf: digitos(campos.cpf),
        whatsapp: digitos(campos.whatsapp),
        cep: digitos(campos.cep),
        uf: campos.uf.trim().toUpperCase(),
        login: campos.login.trim().toLowerCase(),
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && /login/i.test(error.message)) {
        setSituacaoLogin("indisponivel");
      } else if (error instanceof ApiError && error.status === 409 && /cpf/i.test(error.message)) {
        setCpfDesfocado(true);
        setSituacaoCpf("duplicado");
      } else {
        setErro(error instanceof Error ? error.message : "Não foi possível salvar a pessoa.");
      }
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="formulario-usuario" onSubmit={enviar}>
      <header className="titulo-formulario titulo-pessoa">
        <div className="titulo-pessoa-conteudo">
          <span className="icone-titulo-pessoa"><IconeSecaoPessoa nome="dados" /></span>
          <h2 id="titulo-formulario-pessoa">{pessoa ? "Editar pessoa" : "Cadastrar pessoa"}</h2>
        </div>
        <button className="fechar-dialogo-pessoa" type="button" onClick={aoCancelar} aria-label="Fechar cadastro">×</button>
      </header>

      <section className="secao-pessoa" aria-labelledby="titulo-dados-gerais">
        <div className="cabecalho-secao-pessoa">
          <span className="icone-secao-pessoa"><IconeSecaoPessoa nome="dados" /></span>
          <div>
            <h3 id="titulo-dados-gerais">Dados gerais</h3>
          </div>
        </div>
        <div className="conteudo-secao-pessoa">
          <div className="campos-pessoa campos-gerais">
            <label>
              <span className="rotulo-campo">Nome</span>
              <input value={campos.nome} onChange={(evento) => atualizar("nome", evento.target.value)}
                maxLength={160} autoComplete="name" required />
            </label>
            <label className="campo-cpf">
              <span className="rotulo-campo">CPF</span>
              <input value={campos.cpf} onChange={(evento) => {
                  atualizar("cpf", formatarCpf(evento.target.value));
                  setCpfDesfocado(false);
                  setSituacaoCpf("ocioso");
                }}
                onBlur={() => {
                  setCpfDesfocado(true);
                  setTentativasValidacaoCpf((quantidade) => quantidade + 1);
                }}
                className={situacaoCpf === "invalido" || situacaoCpf === "duplicado" ? "campo-cpf-invalido" : ""}
                aria-invalid={situacaoCpf === "invalido" || situacaoCpf === "duplicado"}
                aria-describedby={situacaoCpf !== "ocioso" ? "mensagem-validacao-cpf" : undefined}
                inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={14} required />
              {situacaoCpf !== "ocioso" && <span id="mensagem-validacao-cpf"
                className={`ajuda-campo validacao-cpf ${situacaoCpf}`} role="status" aria-live="polite">
                {situacaoCpf === "invalido"
                  ? "CPF inválido. Confira os 11 dígitos informados."
                  : situacaoCpf === "duplicado"
                    ? `O CPF ${formatarCpf(cpfNumerico)} já está cadastrado. Caso precise alterar os dados, edite o cadastro existente.`
                    : situacaoCpf === "verificando"
                      ? "Verificando CPF..."
                      : situacaoCpf === "erro"
                        ? "Não foi possível verificar o CPF. Tente novamente."
                        : "CPF válido e disponível."}
              </span>}
            </label>
            <label>
              <span className="rotulo-campo">WhatsApp do responsável</span>
              <input value={campos.whatsapp}
                onChange={(evento) => atualizar("whatsapp", formatarWhatsapp(evento.target.value))}
                inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" maxLength={15} required />
            </label>
          </div>
        </div>
      </section>

      <section className="secao-pessoa" aria-labelledby="titulo-endereco">
        <div className="cabecalho-secao-pessoa">
          <span className="icone-secao-pessoa"><IconeSecaoPessoa nome="endereco" /></span>
          <div>
            <h3 id="titulo-endereco">Endereço</h3>
          </div>
        </div>
        <div className="conteudo-secao-pessoa">
          <div className="campos-pessoa campos-endereco">
            <label className="campo-cep">
              <span className="rotulo-campo">CEP</span>
              <span className="campo-com-acao">
                <input value={campos.cep} onChange={(evento) => atualizar("cep", formatarCep(evento.target.value))}
                  onBlur={() => void buscarCep()} inputMode="numeric" autoComplete="postal-code"
                  placeholder="00000-000" maxLength={9} required />
                <button className="botao-buscar-cep" type="button" onClick={() => void buscarCep(true)}
                  disabled={consultandoCep || salvando}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9" />
                  </svg>
                  {consultandoCep ? "Buscando..." : "Buscar CEP"}
                </button>
              </span>
            </label>
            <label className="campo-numero">
              <span className="rotulo-campo">Número</span>
              <input value={campos.numero} onChange={(evento) => atualizar("numero", evento.target.value)}
                maxLength={20} required />
            </label>
            <label className="campo-logradouro">
              <span className="rotulo-campo">Logradouro</span>
              <input value={campos.logradouro} onChange={(evento) => atualizar("logradouro", evento.target.value)}
                autoComplete="address-line1" maxLength={160} required />
            </label>
            <label className="campo-complemento">
              <span className="rotulo-campo">Complemento</span>
              <input value={campos.complemento} onChange={(evento) => atualizar("complemento", evento.target.value)}
                autoComplete="address-line2" maxLength={100} />
            </label>
            <label className="campo-bairro">
              <span className="rotulo-campo">Bairro</span>
              <input value={campos.bairro} onChange={(evento) => atualizar("bairro", evento.target.value)}
                autoComplete="address-level3" maxLength={100} required />
            </label>
            <label className="campo-cidade">
              <span className="rotulo-campo">Cidade</span>
              <input value={campos.cidade} onChange={(evento) => atualizar("cidade", evento.target.value)}
                autoComplete="address-level2" maxLength={100} required />
            </label>
            <label className="campo-uf">
              <span className="rotulo-campo">UF</span>
              <input value={campos.uf}
                onChange={(evento) => atualizar("uf", evento.target.value.slice(0, 2).toUpperCase())}
                autoComplete="address-level1" maxLength={2} required />
            </label>
          </div>
        </div>
      </section>

      <section className="secao-pessoa" aria-labelledby="titulo-acesso">
        <div className="cabecalho-secao-pessoa">
          <span className="icone-secao-pessoa"><IconeSecaoPessoa nome="acesso" /></span>
          <div>
            <h3 id="titulo-acesso">Acesso ao sistema</h3>
          </div>
        </div>
        <div className="conteudo-secao-pessoa">
          <div className="bloco-acesso">
            {!pessoa?.usuarioId && (
              <label className="campo-ativo" htmlFor="criar-acesso">
                <input id="criar-acesso" type="checkbox" checked={campos.criarAcesso}
                  onChange={(evento) => atualizar("criarAcesso", evento.target.checked)} />
                <span>Criar usuário de acesso para esta pessoa</span>
              </label>
            )}
            <div className="campos-pessoa campos-acesso">
              <label className="campo-perfil">
                <span className="rotulo-campo">Perfil</span>
                <select value={campos.tipoUsuario}
                  onChange={(evento) => atualizar("tipoUsuario", evento.target.value as TipoUsuario)}>
                  <option value="ALUNO">Aluno</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </label>
              {campos.criarAcesso && <>
                <label className="campo-login">
                  <span className="rotulo-campo">Login</span>
                  <input value={campos.login}
                    onChange={(evento) => {
                      setLoginPersonalizado(true);
                      atualizar("login", evento.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""));
                    }}
                    className={situacaoLogin === "indisponivel" ? "campo-login-duplicado" : ""}
                    aria-invalid={situacaoLogin === "indisponivel"}
                    aria-describedby="mensagem-validacao-login"
                    autoComplete="off" maxLength={80} placeholder="nome.sobrenome" required />
                  <span id="mensagem-validacao-login" className={`ajuda-campo validacao-login ${situacaoLogin}`} role="status" aria-live="polite">
                    {situacaoLogin === "indisponivel"
                      ? "Este login já está cadastrado. Informe outro login."
                      : situacaoLogin === "verificando"
                        ? "Verificando disponibilidade do login..."
                        : situacaoLogin === "disponivel"
                          ? "Login disponível."
                          : situacaoLogin === "erro"
                            ? "Não foi possível verificar o login. Verifique a conexão."
                            : "Sugerido pelo nome. Você pode editar, desde que seja único."}
                  </span>
                </label>
                <div className="campo-senha">
                  <label htmlFor="senha-pessoa" className="rotulo-campo">
                    {pessoa?.usuarioId ? "Senha (alteração opcional)" : "Senha inicial"}
                  </label>
                  <div className="campo-senha-com-acao">
                    <input id="senha-pessoa" type={mostrarSenha ? "text" : "password"} value={campos.senha}
                      onChange={(evento) => {
                        atualizar("senha", evento.target.value);
                        setAvisoSenha("");
                        if (!evento.target.value) setMostrarSenha(false);
                      }}
                      autoComplete="new-password" minLength={4}
                      placeholder={pessoa?.usuarioId ? "••••••••" : "Mínimo 4 caracteres"}
                      aria-describedby={avisoSenha ? "aviso-senha-protegida" : undefined}
                      required={!pessoa?.usuarioId} />
                    <button type="button" className="botao-visibilidade-senha"
                      aria-label={mostrarSenha ? "Ocultar nova senha" : "Mostrar senha digitada"}
                      aria-pressed={mostrarSenha}
                      title={pessoa?.usuarioId && !campos.senha
                        ? "A senha atual está protegida; clique para saber mais"
                        : mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                      onClick={() => {
                        if (pessoa?.usuarioId && !campos.senha) {
                          setAvisoSenha("A senha atual não pode ser exibida por segurança. Digite uma nova senha para visualizá-la e substituí-la.");
                          return;
                        }
                        if (campos.senha) setMostrarSenha((valor) => !valor);
                      }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {mostrarSenha ? <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 5.4A10.6 10.6 0 0 1 12 5.3c5.8 0 9.6 6.7 9.6 6.7a15 15 0 0 1-3.6 4.2" />
                          <path d="M6.5 6.8C3.9 8.3 2.4 12 2.4 12s3.8 6.7 9.6 6.7c1.5 0 2.9-.4 4.1-1.1" />
                          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                        </> : <>
                          <path d="M2.4 12S6.2 5.3 12 5.3s9.6 6.7 9.6 6.7-3.8 6.7-9.6 6.7S2.4 12 2.4 12Z" />
                          <circle cx="12" cy="12" r="3" />
                        </>}
                      </svg>
                    </button>
                  </div>
                  {avisoSenha && <span id="aviso-senha-protegida" className="aviso-senha-protegida" role="status">{avisoSenha}</span>}
                </div>
                <label className="campo-ativo" htmlFor="acesso-ativo">
                  <input id="acesso-ativo" type="checkbox" checked={campos.ativo}
                    onChange={(evento) => atualizar("ativo", evento.target.checked)} />
                  <span>Usuário ativo</span>
                </label>
              </>}
            </div>
          </div>
        </div>
      </section>

      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      <div className="acoes-formulario">
        <div className="botoes-formulario">
          <button className="botao-principal" type="submit"
            disabled={salvando || consultandoCep || situacaoCpf === "invalido" || situacaoCpf === "duplicado"
              || (campos.criarAcesso && situacaoLogin === "indisponivel")}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h12l3 3v13H4V4h1Z" />
              <path d="M8 4v6h8V4M8 20v-6h8v6" />
            </svg>
            {salvando ? "Salvando..." : pessoa ? "Salvar alterações" : campos.criarAcesso ? "Cadastrar pessoa e acesso" : "Cadastrar pessoa"}
          </button>
          <button className="botao-secundario" type="button" onClick={aoCancelar}>Fechar</button>
        </div>
      </div>
    </form>
  );
}

function GerenciarPessoas() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<Pessoa | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [menuContexto, setMenuContexto] = useState<{
    pessoa: Pessoa;
    x: number;
    y: number;
  } | null>(null);

  const pessoasFiltradas = filtrarPessoas(pessoas, filtro);

  // Posiciona o menu SOBRE a linha acionada, e não na área vazia abaixo da tabela.
  function abrirMenuContexto(pessoa: Pessoa, linha: HTMLElement) {
    const retangulo = linha.getBoundingClientRect();
    const larguraMenu = 170;
    const alturaMenu = 44;
    setMenuContexto({
      pessoa,
      x: Math.max(8, Math.min(retangulo.right - larguraMenu - 8, window.innerWidth - larguraMenu - 8)),
      y: Math.max(8, Math.min(retangulo.top + Math.max(0, (retangulo.height - alturaMenu) / 2), window.innerHeight - alturaMenu - 8)),
    });
  }

  useEffect(() => {
    if (!menuContexto) return;
    const fecharMenu = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuContexto(null);
    };
    const fecharAoRolar = () => setMenuContexto(null);
    const fecharAoClicarFora = (evento: PointerEvent) => {
      if (evento.target instanceof Element && !evento.target.closest(".menu-contexto-usuario")) {
        setMenuContexto(null);
      }
    };
    document.addEventListener("keydown", fecharMenu);
    document.addEventListener("pointerdown", fecharAoClicarFora);
    window.addEventListener("scroll", fecharAoRolar, true);
    window.addEventListener("resize", fecharAoRolar);
    return () => {
      document.removeEventListener("keydown", fecharMenu);
      document.removeEventListener("pointerdown", fecharAoClicarFora);
      window.removeEventListener("scroll", fecharAoRolar, true);
      window.removeEventListener("resize", fecharAoRolar);
    };
  }, [menuContexto]);

  async function carregarPessoas() {
    setCarregando(true);
    setErro("");
    try {
      setPessoas(await requisicao<Pessoa[]>("/api/pessoas"));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível consultar as pessoas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregarPessoas();
  }, []);

  async function salvar(dados: CamposPessoa) {
    await requisicao<Pessoa>(editando ? `/api/pessoas/${editando.id}` : "/api/pessoas", {
      method: editando ? "PUT" : "POST",
      body: JSON.stringify(dados),
    });
    await carregarPessoas();
    setFormularioAberto(false);
    setEditando(null);
  }

  async function excluir(pessoa: Pessoa) {
    setMenuContexto(null);
    if (!window.confirm(`Deseja excluir ${pessoa.nome}${pessoa.usuarioId ? " e seu usuário de acesso" : ""}? Esta ação não pode ser desfeita.`)) return;
    setErro("");
    try {
      await requisicao<void>(`/api/pessoas/${pessoa.id}`, { method: "DELETE" });
      setPessoas((lista) => lista.filter((item) => item.id !== pessoa.id));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir a pessoa.");
    }
  }

  return (
    <section className="painel-usuarios" onClick={() => setMenuContexto(null)}>
      <div className="cabecalho-secao">
        <div>
          <p className="sobretitulo">ADMINISTRAÇÃO</p>
          <h1>Pessoas</h1>
        </div>
        <button className="botao-adicionar-usuario" type="button" onClick={() => {
          setEditando(null);
          setFormularioAberto(true);
        }}>
          <span aria-hidden="true">+</span> Adicionar
        </button>
      </div>
      {erro && <p className="mensagem-erro" role="alert">{erro}</p>}
      <div className="lista-usuarios">
        <div className="titulo-lista">
          <div>
            <h2>Pessoas cadastradas</h2>
            <p>{filtro.trim()
              ? `${pessoasFiltradas.length} de ${pessoas.length} ${pessoas.length === 1 ? "pessoa cadastrada" : "pessoas cadastradas"}`
              : `${pessoas.length} ${pessoas.length === 1 ? "pessoa cadastrada" : "pessoas cadastradas"}`} · Duplo clique para editar, botão direito para excluir</p>
          </div>
          <label className="filtro-pessoas">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>
            <input type="search" value={filtro} onChange={(evento) => {
              setFiltro(evento.target.value);
              setMenuContexto(null);
            }} placeholder="Filtrar por nome, CPF, WhatsApp ou login"
              aria-label="Filtrar pessoas por nome, CPF, WhatsApp ou login" />
          </label>
        </div>
        {carregando ? (
          <p className="estado-lista">Carregando pessoas...</p>
        ) : pessoas.length === 0 ? (
          <p className="estado-lista">Nenhuma pessoa cadastrada.</p>
        ) : pessoasFiltradas.length === 0 ? (
          <p className="estado-lista">Nenhuma pessoa encontrada para o filtro informado.</p>
        ) : (
          <div className="tabela-responsiva">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF</th>
                  <th>WhatsApp</th>
                  <th>Localidade</th>
                  <th>Perfil</th>
                  <th>Login</th>
                  <th>Acesso</th>
                </tr>
              </thead>
              <tbody>
                {pessoasFiltradas.map((pessoa) => (
                  <tr key={pessoa.id} className="linha-usuario" tabIndex={0}
                    title="Duplo clique para editar; botão direito para excluir"
                    onDoubleClick={() => { setMenuContexto(null); setEditando(pessoa); setFormularioAberto(true); }}
                    onContextMenu={(evento) => {
                      evento.preventDefault();
                      evento.stopPropagation();
                      abrirMenuContexto(pessoa, evento.currentTarget);
                    }}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter") {
                        setMenuContexto(null);
                        setEditando(pessoa);
                        setFormularioAberto(true);
                      } else if (evento.key === "F10" && evento.shiftKey) {
                        evento.preventDefault();
                        abrirMenuContexto(pessoa, evento.currentTarget);
                      }
                    }}
                  >
                    <td data-label="Nome">
                      <span className="avatar-usuario">{pessoa.nome.trim().slice(0, 1).toUpperCase()}</span>
                      <strong>{pessoa.nome}</strong>
                    </td>
                    <td data-label="CPF">{pessoa.cpf ? formatarCpf(pessoa.cpf) : "—"}</td>
                    <td data-label="WhatsApp">{pessoa.whatsapp ? formatarWhatsapp(pessoa.whatsapp) : "—"}</td>
                    <td data-label="Localidade">{pessoa.cidade && pessoa.uf ? `${pessoa.cidade}/${pessoa.uf}` : "—"}</td>
                    <td data-label="Perfil">{pessoa.tipoUsuario === "ADMINISTRADOR" ? "Administrador" : "Aluno"}</td>
                    <td data-label="Login">{pessoa.login || "—"}</td>
                    <td data-label="Acesso"><span className={`estado-usuario ${pessoa.usuarioAtivo ? "ativo" : "inativo"}`}>
                      {pessoa.usuarioId ? (pessoa.usuarioAtivo ? "Ativo" : "Inativo") : "Sem usuário"}
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {menuContexto && createPortal(
        <div className="menu-contexto-usuario" role="menu"
          style={{ left: menuContexto.x, top: menuContexto.y }}
          onClick={(evento) => evento.stopPropagation()}>
          <button role="menuitem" type="button" onClick={() => void excluir(menuContexto.pessoa)}>Excluir pessoa</button>
        </div>,
        document.body,
      )}
      {formularioAberto && (
        <div className="sobreposicao-formulario" onClick={(evento) => {
          if (evento.currentTarget === evento.target) { setFormularioAberto(false); setEditando(null); }
        }}>
          <div className="dialogo-formulario dialogo-pessoa" role="dialog" aria-modal="true" aria-labelledby="titulo-formulario-pessoa">
            <FormularioPessoa
              key={editando?.id ?? "nova"}
              pessoa={editando}
              aoSalvar={salvar}
              aoCancelar={() => { setFormularioAberto(false); setEditando(null); }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function Icone({
  nome,
}: {
  nome: "inicio" | "aluno" | "turmas" | "sino";
}) {
  const caminhos = {
    inicio: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
    aluno: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1" /></>,
    turmas: <><path d="M3 5h18v14H3zM3 10h18M9 5v14" /><path d="M6 8h.01M12 14h.01M16 14h.01" /></>,
    sino: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {caminhos[nome]}
    </svg>
  );
}

const alturasGrafico = [28, 42, 39, 58, 53, 72, 68, 86, 78, 96];

function PainelInicio({ usuario }: { usuario: Usuario }) {
  const metricas = [
    { titulo: "Alunos ativos", valor: "120", variacao: "+8,2%", estilo: "azul" },
    { titulo: "Cursos", valor: "8", variacao: "2 em andamento", estilo: "verde" },
    { titulo: "Turmas", valor: "12", variacao: "Neste semestre", estilo: "roxo" },
    { titulo: "Atividades", valor: "45", variacao: "12 pendentes", estilo: "laranja" },
  ];
  const atividades = [
    { iniciais: "DL", titulo: "Nova turma criada", detalhe: "Doutrina Luterana · Turma 2026.1", tempo: "Há 2 horas", cor: "roxo" },
    { iniciais: "HI", titulo: "Atividade corrigida", detalhe: "História da Igreja · 8 alunos", tempo: "Há 5 horas", cor: "azul" },
    { iniciais: "CA", titulo: "Novo aluno matriculado", detalhe: "Curso de Catecismo", tempo: "Ontem", cor: "verde" },
  ];

  return (
    <section className="painel-inicio">
      <div className="boas-vindas-painel">
        <div>
          <p className="sobretitulo">VISÃO GERAL</p>
          <h1>Olá, {usuario.nome}!</h1>
          <p>Acompanhe o resumo dos cursos, alunos e atividades da igreja.</p>
        </div>
        <span className="data-painel">Ano letivo 2026</span>
      </div>

      <div className="grade-metricas">
        {metricas.map((metrica) => (
          <article className="cartao-metrica" key={metrica.titulo}>
            <div className={`icone-metrica ${metrica.estilo}`} aria-hidden="true">
              <span />
            </div>
            <div>
              <p>{metrica.titulo}</p>
              <strong>{metrica.valor}</strong>
              <small>{metrica.variacao}</small>
            </div>
          </article>
        ))}
      </div>

      <div className="grade-painel">
        <article className="cartao-painel cartao-evolucao">
          <div className="titulo-cartao">
            <div>
              <h2>Evolução de alunos</h2>
              <p>Matrículas ao longo do ano</p>
            </div>
            <span className="etiqueta-periodo">Últimos 10 meses</span>
          </div>
          <div className="grafico-alunos" role="img" aria-label="Gráfico de matrículas em crescimento ao longo dos últimos dez meses">
            <div className="rotulos-grafico" aria-hidden="true">
              <span>150</span><span>100</span><span>50</span><span>0</span>
            </div>
            <div className="barras-grafico" aria-hidden="true">
              {alturasGrafico.map((altura, indice) => (
                <div className="coluna-grafico" key={indice}>
                  <span className="barra-grafico" style={{ height: `${altura}%` }} />
                  <small>{["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out"][indice]}</small>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="cartao-painel cartao-atividades">
          <div className="titulo-cartao">
            <div>
              <h2>Atividades recentes</h2>
              <p>Acompanhe as últimas atualizações</p>
            </div>
            <button className="link-cartao" type="button">Ver todas</button>
          </div>
          <ul className="lista-atividades">
            {atividades.map((atividade) => (
              <li key={atividade.titulo}>
                <span className={`avatar-atividade ${atividade.cor}`}>{atividade.iniciais}</span>
                <div>
                  <strong>{atividade.titulo}</strong>
                  <small>{atividade.detalhe}</small>
                </div>
                <time>{atividade.tempo}</time>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

function Home({
  usuario,
  aoSair,
}: {
  usuario: Usuario;
  aoSair: () => void;
}) {
  const [pagina, setPagina] = useState<"inicio" | "pessoas">("inicio");
  const administrador = usuario.tipoUsuario === "ADMINISTRADOR";
  const iniciais = usuario.nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <main className="pagina-home">
      <aside className="barra-lateral">
        <a
          className="marca-home"
          href="#inicio"
          aria-label="IELB Sistema Acadêmico"
          onClick={() => setPagina("inicio")}
        >
          <Marca />
          <span>
            <strong>IELB</strong>
            <small>Sistema Acadêmico</small>
          </span>
        </a>
        <nav className="navegacao-lateral" aria-label="Menu principal">
          <p className="rotulo-menu">MENU PRINCIPAL</p>
          <button
            className={`item-menu ${pagina === "inicio" ? "selecionado" : ""}`}
            type="button"
            onClick={() => setPagina("inicio")}
          >
            <Icone nome="inicio" />
            Início
          </button>
          <button className="item-menu" type="button" disabled title="Disponível em breve">
            <Icone nome="aluno" />
            Aluno
          </button>
          <button className="item-menu" type="button" disabled title="Disponível em breve">
            <Icone nome="turmas" />
            Turmas
          </button>
          {administrador && (
            <>
              <p className="rotulo-menu rotulo-administracao">ADMINISTRAÇÃO</p>
              <button
                className={`item-menu ${pagina === "pessoas" ? "selecionado" : ""}`}
                type="button"
                onClick={() => setPagina("pessoas")}
              >
                <Icone nome="aluno" />
                Pessoas
              </button>
            </>
          )}
        </nav>
        <div className="rodape-lateral">
          <span className="avatar-perfil">{iniciais}</span>
          <span className="dados-perfil">
            <strong>{usuario.nome}</strong>
            <small>{administrador ? "Administrador" : "Aluno"}</small>
          </span>
        </div>
      </aside>

      <div className="conteudo-home">
        <header className="cabecalho-dashboard">
          <div className="caminho-pagina">
            <span>Painel</span>
            <span aria-hidden="true">/</span>
            <strong>{pagina === "pessoas" ? "Pessoas" : "Visão geral"}</strong>
          </div>
          <div className="acoes-cabecalho">
            <button className="botao-notificacao" type="button" aria-label="Notificações">
              <Icone nome="sino" />
              <span />
            </button>
            <div className="perfil-cabecalho">
              <span className="avatar-perfil">{iniciais}</span>
              <span>
                <strong>{usuario.nome}</strong>
                <small>{administrador ? "Administrador" : "Aluno"}</small>
              </span>
            </div>
            <button className="botao-sair" type="button" onClick={aoSair}>
              Sair
            </button>
          </div>
        </header>
        {pagina === "pessoas" && administrador ? (
          <GerenciarPessoas />
        ) : (
          <PainelInicio usuario={usuario} />
        )}
      </div>
    </main>
  );
}

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [erroSessao, setErroSessao] = useState("");
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  useEffect(() => {
    let ativo = true;
    requisicao<Usuario>("/api/auth/me")
      .then((usuarioAtual) => {
        if (ativo) setUsuario(usuarioAtual);
      })
      .catch((error: unknown) => {
        if (
          ativo &&
          !(error instanceof ApiError && error.status === 401)
        ) {
          setErroSessao(
            error instanceof Error ? error.message : "Não foi possível verificar o acesso.",
          );
        }
      })
      .finally(() => {
        if (ativo) setVerificandoSessao(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  async function sair() {
    try {
      await requisicao<void>("/api/auth/logout", { method: "POST" });
      setUsuario(null);
    } catch (error) {
      setErroSessao(
        error instanceof Error ? error.message : "Não foi possível encerrar a sessão.",
      );
    }
  }

  if (verificandoSessao) {
    return (
      <main className="pagina-login">
        <p className="estado-carregamento">Verificando acesso...</p>
      </main>
    );
  }

  return usuario ? (
    <Home
      usuario={usuario}
      aoSair={() => void sair()}
    />
  ) : (
    <Login aoEntrar={setUsuario} erro={erroSessao} />
  );
}
