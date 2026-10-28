package br.org.ielb.academico.api;

import br.org.ielb.academico.model.Pessoa;
import br.org.ielb.academico.model.Usuario;
import br.org.ielb.academico.model.TipoUsuarioEnum;
import br.org.ielb.academico.repository.PessoaRepository;
import br.org.ielb.academico.repository.UsuarioRepository;
import br.org.ielb.academico.service.SenhaService;
import br.org.ielb.academico.service.SessaoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
public class PessoaController {
    private final PessoaRepository pessoaRepository;
    private final UsuarioRepository usuarioRepository;
    private final SessaoService sessaoService;
    private final SenhaService senhaService;

    public PessoaController(PessoaRepository pessoaRepository, UsuarioRepository usuarioRepository,
                            SessaoService sessaoService, SenhaService senhaService) {
        this.pessoaRepository = pessoaRepository;
        this.usuarioRepository = usuarioRepository;
        this.sessaoService = sessaoService;
        this.senhaService = senhaService;
    }

    @Transactional(readOnly = true)
    @GetMapping("/api/pessoas")
    public List<PessoaResponse> listarPessoas(HttpServletRequest request) {
        sessaoService.exigirAdministrador(request);
        // Duas consultas, independentemente da quantidade de pessoas (evita N+1).
        Map<Long, Usuario> acessos = usuarioRepository.listarComPessoa().stream()
                .collect(Collectors.toMap(u -> u.getPessoa().getId(), Function.identity()));
        return pessoaRepository.findAllByOrderByNomeAscIdAsc().stream()
                .map(pessoa -> mapearPessoa(pessoa, acessos.get(pessoa.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    @GetMapping("/api/pessoas/sugestao-login")
    public SugestaoLoginResponse sugerirLogin(@RequestParam String nome, HttpServletRequest request) {
        sessaoService.exigirAdministrador(request);
        String base = sugerirBaseLogin(nome);
        if (base.isBlank()) {
            return new SugestaoLoginResponse("");
        }
        String sugestao = base;
        for (int sufixo = 2; sufixo <= 99999; sufixo++) {
            if (!usuarioRepository.existsByLogin(sugestao)) {
                return new SugestaoLoginResponse(sugestao);
            }
            sugestao = base.substring(0, Math.min(base.length(), 70)) + sufixo;
        }
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Não foi possível sugerir um login disponível.");
    }

    @Transactional(readOnly = true)
    @GetMapping("/api/pessoas/verificar-login")
    public VerificacaoLoginResponse verificarLogin(
            @RequestParam String login,
            @RequestParam(defaultValue = "0") long pessoaId,
            HttpServletRequest request
    ) {
        sessaoService.exigirAdministrador(request);
        String normalizado = login == null ? "" : login.trim().toLowerCase(Locale.ROOT);
        if (!normalizado.matches("^[a-z0-9][a-z0-9._-]{2,79}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um login válido de 3 a 80 caracteres.");
        }
        return new VerificacaoLoginResponse(loginDisponivel(normalizado, pessoaId));
    }

    @Transactional(readOnly = true)
    @GetMapping("/api/pessoas/verificar-cpf")
    public VerificacaoCpfResponse verificarCpf(
            @RequestParam String cpf,
            @RequestParam(defaultValue = "0") long pessoaId,
            HttpServletRequest request
    ) {
        sessaoService.exigirAdministrador(request);
        String normalizado = apenasDigitos(cpf);
        if (!cpfValido(normalizado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um CPF válido.");
        }
        return new VerificacaoCpfResponse(cpfDisponivel(normalizado, pessoaId));
    }

    private boolean cpfDisponivel(String cpf, long pessoaId) {
        return !pessoaRepository.existsByCpfAndIdNot(cpf, pessoaId);
    }

    private void exigirCpfDisponivel(String cpf, long pessoaId) {
        if (!cpfDisponivel(cpf, pessoaId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, mensagemCpfDuplicado(cpf));
        }
    }

    private String mensagemCpfDuplicado(String cpf) {
        String formatado = cpf.substring(0, 3) + "." + cpf.substring(3, 6) + "."
                + cpf.substring(6, 9) + "-" + cpf.substring(9);
        return "O CPF " + formatado + " já está cadastrado. "
                + "Caso precise alterar os dados, edite o cadastro existente.";
    }

    private boolean loginDisponivel(String login, long pessoaId) {
        return !usuarioRepository.existsByLoginAndPessoa_IdNot(login, pessoaId);
    }

    private String sugerirBaseLogin(String nome) {
        if (nome == null || nome.isBlank()) {
            return "";
        }
        String normalizado = Normalizer.normalize(nome.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^a-z0-9 ]", " ")
                .trim().replaceAll(" +", " ");
        if (normalizado.isBlank()) {
            return "";
        }
        String[] palavras = normalizado.split(" ");
        String primeiro = palavras[0];
        String ultimo = palavras.length > 1 ? palavras[palavras.length - 1] : "aluno";
        String base = primeiro + "." + ultimo;
        return base.substring(0, Math.min(base.length(), 68));
    }

    @Transactional
    @PostMapping("/api/pessoas")
    @ResponseStatus(HttpStatus.CREATED)
    public PessoaResponse criarPessoa(@RequestBody PessoaRequest dados, HttpServletRequest request) {
        sessaoService.exigirAdministrador(request);
        PessoaNormalizada normalizada = validarPessoa(dados);
        exigirCpfDisponivel(normalizada.cpf(), 0L);
        try {
            Pessoa pessoa = new Pessoa();
            atualizarCampos(pessoa, normalizada);
            pessoaRepository.saveAndFlush(pessoa);
            salvarAcesso(pessoa, dados, null);
            return mapearPessoa(pessoa, usuarioRepository.findByPessoa_Id(pessoa.getId()).orElse(null));
        } catch (DataIntegrityViolationException exception) {
            throw tratarChaveDuplicada(exception, normalizada.cpf());
        }
    }

    @Transactional
    @PutMapping("/api/pessoas/{id}")
    public PessoaResponse atualizarPessoa(@PathVariable long id, @RequestBody PessoaRequest dados,
                                          HttpServletRequest request) {
        Usuario administrador = sessaoService.exigirAdministrador(request);
        PessoaNormalizada normalizada = validarPessoa(dados);
        if (normalizada.tipoUsuario() != TipoUsuarioEnum.ADMINISTRADOR
                && administrador.getPessoa().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Não é possível remover seu próprio perfil de administrador.");
        }
        Pessoa pessoa = pessoaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pessoa não encontrada."));
        // Uma conta existente não deve ser desassociada silenciosamente por uma requisição incompleta.
        if (!dados.criarAcesso() && usuarioRepository.findByPessoa_Id(id).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta pessoa já possui acesso. Para impedir o login, desative Usuário ativo.");
        }
        exigirCpfDisponivel(normalizada.cpf(), id);
        try {
            atualizarCampos(pessoa, normalizada);
            pessoaRepository.saveAndFlush(pessoa);
            salvarAcesso(pessoa, dados, administrador.getId());
            return mapearPessoa(pessoa, usuarioRepository.findByPessoa_Id(id).orElse(null));
        } catch (DataIntegrityViolationException exception) {
            throw tratarChaveDuplicada(exception, normalizada.cpf());
        }
    }

    @Transactional
    @DeleteMapping("/api/pessoas/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirPessoa(@PathVariable long id, HttpServletRequest request) {
        Usuario administrador = sessaoService.exigirAdministrador(request);
        if (administrador.getPessoa().getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não é possível excluir seu próprio cadastro.");
        }
        Pessoa pessoa = pessoaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pessoa não encontrada."));
        usuarioRepository.findByPessoa_Id(id).ifPresent(usuarioRepository::delete);
        usuarioRepository.flush();
        pessoaRepository.delete(pessoa);
        pessoaRepository.flush();
    }

    private void atualizarCampos(Pessoa pessoa, PessoaNormalizada dados) {
        pessoa.setCpf(dados.cpf());
        pessoa.setWhatsapp(dados.whatsapp());
        pessoa.setNome(dados.nome());
        pessoa.setCep(dados.cep());
        pessoa.setLogradouro(dados.logradouro());
        pessoa.setNumero(dados.numero());
        pessoa.setComplemento(dados.complemento());
        pessoa.setBairro(dados.bairro());
        pessoa.setCidade(dados.cidade());
        pessoa.setUf(dados.uf());
        pessoa.setTipoUsuario(dados.tipoUsuario());
    }

    // Mantém pessoa e credenciais na mesma transação JPA.
    private void salvarAcesso(Pessoa pessoa, PessoaRequest dados, Long administradorId) {
        if (!dados.criarAcesso()) {
            return;
        }
        String login = dados.login() == null ? "" : dados.login().trim().toLowerCase(Locale.ROOT);
        if (!login.matches("^[a-z0-9][a-z0-9._-]{2,79}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Informe um login de 3 a 80 caracteres (letras sem acento, números, ponto, hífen ou _).");
        }
        if (!loginDisponivel(login, pessoa.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este login já está cadastrado. Informe outro login.");
        }
        String senha = dados.senha() == null ? "" : dados.senha();
        boolean ativo = dados.ativo() == null || dados.ativo();
        Usuario usuario = usuarioRepository.findByPessoa_Id(pessoa.getId()).orElse(null);
        if (usuario == null) {
            if (senha.length() < 4) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Informe uma senha inicial com pelo menos 4 caracteres.");
            }
            usuario = new Usuario();
            usuario.setPessoa(pessoa);
            usuario.setSenhaHash(senhaService.gerarHash(senha));
        } else {
            if (!senha.isEmpty() && senha.length() < 4) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "A nova senha deve ter pelo menos 4 caracteres.");
            }
            if (administradorId != null && usuario.getId().equals(administradorId) && !ativo) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Não é possível desativar seu próprio acesso.");
            }
            if (!senha.isEmpty()) {
                usuario.setSenhaHash(senhaService.gerarHash(senha));
            }
        }
        usuario.setLogin(login);
        usuario.setAtivo(ativo);
        // saveAndFlush garante que a restrição UNIQUE do PostgreSQL também seja validada.
        usuarioRepository.saveAndFlush(usuario);
    }

    private ResponseStatusException tratarChaveDuplicada(DataIntegrityViolationException exception, String cpf) {
        String causa = exception.getMostSpecificCause().getMessage();
        if (causa != null && (causa.contains("usuario_login_unique") || causa.contains("usuario_login_key"))) {
            return new ResponseStatusException(HttpStatus.CONFLICT,
                    "Este login já está cadastrado. Informe outro login.");
        }
        // A constraint UNIQUE no PostgreSQL protege também contra cadastros concorrentes.
        if (causa != null && causa.contains("cpf")) {
            return new ResponseStatusException(HttpStatus.CONFLICT, mensagemCpfDuplicado(cpf));
        }
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "Outro dado informado já está cadastrado. Verifique os dados.");
    }

    private PessoaNormalizada validarPessoa(PessoaRequest dados) {
        if (dados == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe os dados da pessoa.");
        }
        String cpf = apenasDigitos(dados.cpf());
        if (!cpfValido(cpf)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um CPF válido.");
        }
        String whatsapp = apenasDigitos(dados.whatsapp());
        if (!whatsapp.matches("^\\d{10,11}$")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Informe um WhatsApp com DDD e 10 ou 11 dígitos."
            );
        }
        String cep = apenasDigitos(dados.cep());
        if (!cep.matches("^\\d{8}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um CEP válido com 8 dígitos.");
        }
        String nome = validarTexto(dados.nome(), 160, "Informe o nome com até 160 caracteres.");
        String logradouro = validarTexto(dados.logradouro(), 160, "Informe o logradouro.");
        String numero = validarTexto(dados.numero(), 20, "Informe o número do endereço.");
        String bairro = validarTexto(dados.bairro(), 100, "Informe o bairro.");
        String cidade = validarTexto(dados.cidade(), 100, "Informe a cidade.");
        String uf = dados.uf() == null ? "" : dados.uf().trim().toUpperCase(Locale.ROOT);
        if (!uf.matches("^[A-Z]{2}$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe uma UF válida.");
        }
        String complemento = dados.complemento() == null ? "" : dados.complemento().trim();
        if (complemento.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O complemento deve ter até 100 caracteres.");
        }
        if (dados.tipoUsuario() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione Administrador ou Aluno.");
        }
        return new PessoaNormalizada(
                cpf,
                whatsapp,
                nome,
                cep,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                uf,
                dados.tipoUsuario()
        );
    }

    private String validarTexto(String texto, int limite, String mensagem) {
        String valor = texto == null ? "" : texto.trim();
        if (valor.isBlank() || valor.length() > limite) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
        }
        return valor;
    }

    private String apenasDigitos(String texto) {
        return texto == null ? "" : texto.replaceAll("\\D", "");
    }

    private boolean cpfValido(String cpf) {
        if (!cpf.matches("^\\d{11}$") || cpf.chars().distinct().count() == 1) {
            return false;
        }
        for (int digito = 9; digito <= 10; digito++) {
            int soma = 0;
            for (int indice = 0; indice < digito; indice++) {
                soma += Character.getNumericValue(cpf.charAt(indice)) * (digito + 1 - indice);
            }
            int verificador = (soma * 10) % 11;
            if (verificador == 10) {
                verificador = 0;
            }
            if (verificador != Character.getNumericValue(cpf.charAt(digito))) {
                return false;
            }
        }
        return true;
    }

    private PessoaResponse mapearPessoa(Pessoa pessoa, Usuario usuario) {
        return new PessoaResponse(
                pessoa.getId(), pessoa.getCpf(), pessoa.getWhatsapp(), pessoa.getNome(),
                pessoa.getCep(), pessoa.getLogradouro(), pessoa.getNumero(), pessoa.getComplemento(),
                pessoa.getBairro(), pessoa.getCidade(), pessoa.getUf(), pessoa.getTipoUsuario(),
                usuario == null ? null : usuario.getId(),
                usuario == null ? null : usuario.getLogin(),
                usuario == null ? null : usuario.isAtivo()
        );
    }

    public record PessoaRequest(
            String cpf,
            String whatsapp,
            String nome,
            String cep,
            String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String uf,
            TipoUsuarioEnum tipoUsuario,
            boolean criarAcesso,
            String login,
            String senha,
            Boolean ativo
    ) {
    }

    public record SugestaoLoginResponse(String login) {
    }

    public record VerificacaoLoginResponse(boolean disponivel) {
    }

    public record VerificacaoCpfResponse(boolean disponivel) {
    }

    public record PessoaResponse(
            long id,
            String cpf,
            String whatsapp,
            String nome,
            String cep,
            String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String uf,
            TipoUsuarioEnum tipoUsuario,
            Long usuarioId,
            String login,
            Boolean usuarioAtivo
    ) {
    }

    private record PessoaNormalizada(
            String cpf,
            String whatsapp,
            String nome,
            String cep,
            String logradouro,
            String numero,
            String complemento,
            String bairro,
            String cidade,
            String uf,
            TipoUsuarioEnum tipoUsuario
    ) {
    }
}
