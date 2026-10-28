package br.org.ielb.academico.service;

import br.org.ielb.academico.model.TipoUsuarioEnum;
import br.org.ielb.academico.model.Usuario;
import br.org.ielb.academico.repository.UsuarioRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessaoService {
    private static final String USUARIO_ID = "usuarioId";
    private final UsuarioRepository usuarioRepository;

    public SessaoService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public void iniciar(HttpServletRequest request, Long usuarioId) {
        HttpSession anterior = request.getSession(false);
        if (anterior != null) {
            anterior.invalidate();
        }
        request.getSession(true).setAttribute(USUARIO_ID, usuarioId);
    }

    public void encerrar(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    public Usuario usuarioAtivo(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object id = session == null ? null : session.getAttribute(USUARIO_ID);
        if (!(id instanceof Long usuarioId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Faça login para continuar.");
        }
        Usuario usuario = usuarioRepository.buscarComPessoa(usuarioId).orElse(null);
        if (usuario == null || !usuario.isAtivo()) {
            encerrar(request);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida ou usuário inativo.");
        }
        return usuario;
    }

    public Usuario exigirAdministrador(HttpServletRequest request) {
        Usuario usuario = usuarioAtivo(request);
        if (usuario.getPessoa().getTipoUsuario() != TipoUsuarioEnum.ADMINISTRADOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso restrito a administradores.");
        }
        return usuario;
    }
}
