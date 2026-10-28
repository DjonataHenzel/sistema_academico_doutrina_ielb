package br.org.ielb.academico;

import br.org.ielb.academico.service.SenhaService;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class SenhaServiceTest {
    private final SenhaService senhas = new SenhaService();

    @Test
    void geraBcryptEValidaSenhaSemArmazenarTextoPuro() {
        String hash = senhas.gerarHash("Senha@12345");
        assertTrue(hash.startsWith("$2a$12$"));
        assertNotEquals("Senha@12345", hash);
        assertTrue(senhas.conferir("Senha@12345", hash));
        assertFalse(senhas.conferir("senhaIncorreta", hash));
        assertFalse(senhas.conferir(null, hash));
    }
}
