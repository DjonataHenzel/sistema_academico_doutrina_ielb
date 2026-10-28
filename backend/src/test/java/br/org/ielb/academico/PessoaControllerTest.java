package br.org.ielb.academico;

import br.org.ielb.academico.api.PessoaController;
import br.org.ielb.academico.model.TipoUsuarioEnum;
import br.org.ielb.academico.model.Pessoa;
import br.org.ielb.academico.model.Usuario;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import br.org.ielb.academico.repository.PessoaRepository;
import br.org.ielb.academico.repository.UsuarioRepository;
import br.org.ielb.academico.service.SenhaService;
import br.org.ielb.academico.service.SessaoService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;

class PessoaControllerTest {
    private final PessoaRepository pessoas = mock(PessoaRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final SessaoService sessao = mock(SessaoService.class);
    private final SenhaService senha = mock(SenhaService.class);
    private final HttpServletRequest request = mock(HttpServletRequest.class);
    private final PessoaController controller = new PessoaController(pessoas, usuarios, sessao, senha);

    @Test
    void loginUsadoPorOutraPessoaNaoEstaDisponivel() {
        when(usuarios.existsByLoginAndPessoa_IdNot("djonata.henzel", 5L)).thenReturn(true);
        assertFalse(controller.verificarLogin("Djonata.Henzel", 5L, request).disponivel());
        verify(sessao).exigirAdministrador(request);
    }

    @Test
    void loginDoProprioUsuarioPodeSerMantidoNaEdicao() {
        when(usuarios.existsByLoginAndPessoa_IdNot("djonata.henzel", 5L)).thenReturn(false);
        assertTrue(controller.verificarLogin("djonata.henzel", 5L, request).disponivel());
    }

    @Test
    void cpfInvalidoEhRejeitadoAntesDeConsultarBanco() {
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.verificarCpf("111.111.111-11", 0L, request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verifyNoInteractions(pessoas);
    }

    @Test
    void cpfJaCadastradoDeOutraPessoaNaoEstaDisponivel() {
        when(pessoas.existsByCpfAndIdNot("00690779917", 0L)).thenReturn(true);
        assertFalse(controller.verificarCpf("006.907.799-17", 0L, request).disponivel());
        verify(sessao).exigirAdministrador(request);
    }

    @Test
    void mesmoCpfDaPessoaEditadaPermaneceDisponivel() {
        when(pessoas.existsByCpfAndIdNot("00690779917", 42L)).thenReturn(false);
        assertTrue(controller.verificarCpf("00690779917", 42L, request).disponivel());
    }

    @Test
    void impedeCadastroDuplicadoComMensagemEspecifica() {
        when(pessoas.existsByCpfAndIdNot("00690779917", 0L)).thenReturn(true);
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.criarPessoa(dados("1234", false), request));
        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        assertTrue(erro.getReason().contains("006.907.799-17"));
        assertTrue(erro.getReason().contains("edite o cadastro existente"));
        verify(pessoas, never()).saveAndFlush(any(Pessoa.class));
    }

    @Test
    void senhaNumericaComQuatroDigitosEhAceitaNaCriacao() {
        when(pessoas.saveAndFlush(any(Pessoa.class))).thenAnswer(invocacao -> {
            Pessoa pessoa = invocacao.getArgument(0);
            ReflectionTestUtils.setField(pessoa, "id", 50L);
            return pessoa;
        });
        when(senha.gerarHash("1234")).thenReturn("hash-bcrypt");
        assertDoesNotThrow(() -> controller.criarPessoa(dados("1234", true), request));
        verify(senha).gerarHash("1234");
        verify(usuarios).saveAndFlush(any());
    }

    @Test
    void senhaComMenosDeQuatroCaracteresEhRejeitada() {
        when(pessoas.saveAndFlush(any(Pessoa.class))).thenAnswer(invocacao -> {
            Pessoa pessoa = invocacao.getArgument(0);
            ReflectionTestUtils.setField(pessoa, "id", 50L);
            return pessoa;
        });
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.criarPessoa(dados("123", true), request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        assertTrue(erro.getReason().contains("4 caracteres"));
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test
    void loginNuloRetornaErroControlado() {
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.verificarLogin(null, 0, request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
    }

    @Test
    void sugestaoLoginAcrescentaSufixoQuandoJaExiste() {
        when(usuarios.existsByLogin("maria.silva")).thenReturn(true);
        assertEquals("maria.silva2", controller.sugerirLogin("Maria da Silva", request).login());
    }

    @Test
    void naoPermiteExcluirSeuProprioCadastro() {
        when(sessao.exigirAdministrador(request)).thenReturn(administrador(42L, 7L));
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.excluirPessoa(42L, request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        verify(pessoas, never()).delete(any());
    }

    @Test
    void impedeAlteracaoQueDesligaAcessoExistenteSilenciosamente() {
        when(sessao.exigirAdministrador(request)).thenReturn(administrador(42L, 7L));
        Pessoa pessoa = pessoa(30L);
        when(pessoas.findById(30L)).thenReturn(java.util.Optional.of(pessoa));
        when(usuarios.findByPessoa_Id(30L)).thenReturn(java.util.Optional.of(usuario(pessoa, 9L)));

        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.atualizarPessoa(30L, dados("", false), request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        assertTrue(erro.getReason().contains("Usuário ativo"));
        verify(pessoas, never()).saveAndFlush(any());
    }

    @Test
    void impedeDesativarSeuProprioUsuario() {
        Usuario admin = administrador(42L, 7L);
        when(sessao.exigirAdministrador(request)).thenReturn(admin);
        when(pessoas.findById(42L)).thenReturn(java.util.Optional.of(admin.getPessoa()));
        when(usuarios.findByPessoa_Id(42L)).thenReturn(java.util.Optional.of(admin));
        PessoaController.PessoaRequest entrada = new PessoaController.PessoaRequest(
                "00690779917", "45988043418", "Exemplo Teste", "85908270", "Rua A", "10", "",
                "Centro", "Toledo", "PR", TipoUsuarioEnum.ADMINISTRADOR, true, "exemplo.teste", "", false);

        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> controller.atualizarPessoa(42L, entrada, request));
        assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        assertTrue(erro.getReason().contains("próprio acesso"));
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test
    void atualizacaoDaPessoaSemContaMantemDadosESemCriarUsuario() {
        when(sessao.exigirAdministrador(request)).thenReturn(administrador(42L, 7L));
        Pessoa pessoa = pessoa(30L);
        when(pessoas.findById(30L)).thenReturn(java.util.Optional.of(pessoa));
        when(usuarios.findByPessoa_Id(30L)).thenReturn(java.util.Optional.empty());

        PessoaController.PessoaResponse resultado = controller.atualizarPessoa(30L, dados("", false), request);
        assertEquals("Exemplo Teste", resultado.nome());
        assertNull(resultado.usuarioId());
        verify(pessoas).saveAndFlush(pessoa);
        verify(usuarios, never()).saveAndFlush(any());
    }

    @Test
    void exclusaoRemovePrimeiroUsuarioEDepoisPessoa() {
        when(sessao.exigirAdministrador(request)).thenReturn(administrador(42L, 7L));
        Pessoa pessoa = pessoa(30L);
        Usuario vinculado = usuario(pessoa, 9L);
        when(pessoas.findById(30L)).thenReturn(java.util.Optional.of(pessoa));
        when(usuarios.findByPessoa_Id(30L)).thenReturn(java.util.Optional.of(vinculado));
        controller.excluirPessoa(30L, request);
        var ordem = inOrder(usuarios, pessoas);
        ordem.verify(usuarios).delete(vinculado);
        ordem.verify(usuarios).flush();
        ordem.verify(pessoas).delete(pessoa);
        ordem.verify(pessoas).flush();
    }

    private Pessoa pessoa(long pessoaId) {
        Pessoa pessoa = new Pessoa();
        ReflectionTestUtils.setField(pessoa, "id", pessoaId);
        pessoa.setTipoUsuario(TipoUsuarioEnum.ALUNO);
        return pessoa;
    }

    private Usuario usuario(Pessoa pessoa, long usuarioId) {
        Usuario usuario = new Usuario();
        ReflectionTestUtils.setField(usuario, "id", usuarioId);
        usuario.setPessoa(pessoa);
        usuario.setLogin("exemplo.teste");
        usuario.setAtivo(true);
        return usuario;
    }

    private Usuario administrador(long pessoaId, long usuarioId) {
        Pessoa pessoa = pessoa(pessoaId);
        pessoa.setTipoUsuario(TipoUsuarioEnum.ADMINISTRADOR);
        return usuario(pessoa, usuarioId);
    }

    private PessoaController.PessoaRequest dados(String senha, boolean criarAcesso) {
        return new PessoaController.PessoaRequest("00690779917", "45988043418", "Exemplo Teste",
                "85908270", "Rua A", "10", "", "Centro", "Toledo", "PR",
                TipoUsuarioEnum.ALUNO, criarAcesso, "exemplo.teste", senha, true);
    }

}
