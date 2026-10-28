export function digitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function normalizarBusca(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export type PessoaPesquisavel = {
  nome: string;
  cpf: string | null;
  whatsapp: string | null;
  login: string | null;
};

/** Filtro único por nome, CPF, WhatsApp ou login, com ou sem máscaras. */
export function filtrarPessoas<T extends PessoaPesquisavel>(pessoas: T[], filtro: string): T[] {
  const busca = normalizarBusca(filtro.trim());
  if (!busca) return pessoas;
  const buscaNumerica = /^[\d().+\-\s]+$/.test(filtro.trim()) ? digitos(filtro) : "";
  return pessoas.filter((pessoa) => {
    const dadosTextuais = [pessoa.nome, pessoa.cpf, pessoa.whatsapp, pessoa.login];
    if (dadosTextuais.some((valor) => normalizarBusca(valor ?? "").includes(busca))) return true;
    return Boolean(buscaNumerica) && [pessoa.cpf, pessoa.whatsapp].some(
      (valor) => digitos(valor ?? "").includes(buscaNumerica),
    );
  });
}

export function formatarCpf(valor: string) {
  const cpf = digitos(valor).slice(0, 11);
  return cpf
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatarCep(valor: string) {
  const cep = digitos(valor).slice(0, 8);
  return cep.length > 5 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep;
}

export function formatarWhatsapp(valor: string) {
  const whatsapp = digitos(valor).slice(0, 11);
  if (whatsapp.length <= 2) return whatsapp.length ? `(${whatsapp}` : "";
  const ddd = whatsapp.slice(0, 2);
  const numero = whatsapp.slice(2);
  return numero.length > 8
    ? `(${ddd}) ${numero.slice(0, 5)}-${numero.slice(5)}`
    : `(${ddd}) ${numero.slice(0, 4)}${numero.length > 4 ? `-${numero.slice(4)}` : ""}`;
}

export function cpfValido(cpfFormatado: string) {
  const cpf = digitos(cpfFormatado);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  for (let digito = 9; digito <= 10; digito += 1) {
    let soma = 0;
    for (let indice = 0; indice < digito; indice += 1) {
      soma += Number(cpf[indice]) * (digito + 1 - indice);
    }
    let verificador = (soma * 10) % 11;
    if (verificador === 10) verificador = 0;
    if (verificador !== Number(cpf[digito])) return false;
  }
  return true;
}

