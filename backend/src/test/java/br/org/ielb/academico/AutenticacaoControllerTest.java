package br.org.ielb.academico;

import br.org.ielb.academico.api.AutenticacaoController;
import br.org.ielb.academico.model.Pessoa;
import br.org.ielb.academico.model.Usuario;
import br.org.ielb.academico.repository.UsuarioRepository;
import br.org.ielb.academico.service.SenhaService;
import br.org.ielb.academico.service.SessaoService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AutenticacaoControllerTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SessaoService sessoes = mock(SessaoService.class);
    private final SenhaService senhas = mock(SenhaService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final AutenticacaoController controller = new AutenticacaoController(usuarios, sessoes, senhas);

    @Test
    void rejeitaLoginSemCredenciais() {
        var erro = assertThrows(ResponseStatusException.class,
                () -> controller.login(new AutenticacaoController.LoginRequest(null, null), request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verifyNoInteractions(usuarios);
    }

    @Test
    void rejeitaSenhaIncorretaSemCriarSessao() {
        Usuario usuario = usuarioAtivo();
        when(usuarios.buscarPorLogin("admin")).thenReturn(Optional.of(usuario));
        when(senhas.conferir("errada", "hash")).thenReturn(false);
        var erro = assertThrows(ResponseStatusException.class,
                () -> controller.login(new AutenticacaoController.LoginRequest("ADMIN", "errada"), request));
        assertEquals(HttpStatus.UNAUTHORIZED, erro.getStatusCode());
        verify(sessoes, never()).iniciar(any(), any());
    }

    @Test
    void loginCorretoIniciaSessaoEDevolvePessoa() {
        Usuario usuario = usuarioAtivo();
        when(usuarios.buscarPorLogin("admin")).thenReturn(Optional.of(usuario));
        when(senhas.conferir("1234", "hash")).thenReturn(true);
        var retorno = controller.login(new AutenticacaoController.LoginRequest(" ADMIN ", "1234"), request);
        assertEquals(7L, retorno.id());
        assertEquals(42L, retorno.pessoaId());
        assertEquals("Admin Local", retorno.nome());
        verify(sessoes).iniciar(request, 7L);
    }

    private Usuario usuarioAtivo() {
        Pessoa pessoa = new Pessoa();
        ReflectionTestUtils.setField(pessoa, "id", 42L);
        pessoa.setNome("Admin Local");
        Usuario usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", 7L);
        usuario.setPessoa(pessoa);
        usuario.setLogin("admin");
        usuario.setSenhaHash("hash");
        usuario.setAtivo(true);
        return usuario;
    }
}
