package br.org.ielb.academico.api;

import br.org.ielb.academico.model.Usuario;
import br.org.ielb.academico.model.TipoUsuarioEnum;
import br.org.ielb.academico.repository.UsuarioRepository;
import br.org.ielb.academico.service.SenhaService;
import br.org.ielb.academico.service.SessaoService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

/** A gestão de credenciais acontece exclusivamente no cadastro unificado de pessoas. */
@RestController
@RequestMapping("/api/auth")
public class AutenticacaoController {
    private final UsuarioRepository usuarios;
    private final SessaoService sessoes;
    private final SenhaService senhas;

    public AutenticacaoController(UsuarioRepository usuarios, SessaoService sessoes, SenhaService senhas) {
        this.usuarios = usuarios;
        this.sessoes = sessoes;
        this.senhas = senhas;
    }

    @Transactional(readOnly = true)
    @PostMapping("/login")
    public UsuarioResponse login(@RequestBody LoginRequest dados, HttpServletRequest request) {
        if (dados == null || dados.login() == null || dados.login().isBlank()
                || dados.senha() == null || dados.senha().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe login e senha.");
        }
        String login = dados.login().trim().toLowerCase(Locale.ROOT);
        Usuario usuario = usuarios.buscarPorLogin(login).orElse(null);
        if (usuario == null || !usuario.isAtivo() || !senhas.conferir(dados.senha(), usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Login ou senha inválidos.");
        }
        sessoes.iniciar(request, usuario.getId());
        return mapearUsuario(usuario);
    }

    @Transactional(readOnly = true)
    @GetMapping("/me")
    public UsuarioResponse usuarioAtual(HttpServletRequest request) {
        return mapearUsuario(sessoes.usuarioAtivo(request));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request) {
        sessoes.encerrar(request);
    }

    private UsuarioResponse mapearUsuario(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getPessoa().getId(),
                usuario.getPessoa().getNome(), usuario.getLogin(),
                usuario.getPessoa().getTipoUsuario(), usuario.isAtivo());
    }

    public record LoginRequest(String login, String senha) { }
    public record UsuarioResponse(long id, long pessoaId, String nome, String login,
                                  TipoUsuarioEnum tipoUsuario, boolean ativo) { }
}
