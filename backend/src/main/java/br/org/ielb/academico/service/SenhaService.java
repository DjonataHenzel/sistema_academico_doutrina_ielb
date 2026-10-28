package br.org.ielb.academico.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SenhaService {
    // Compatível com os hashes bcrypt ($2a$) gerados anteriormente pelo pgcrypto.
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public String gerarHash(String senha) {
        return encoder.encode(senha);
    }

    public boolean conferir(String senha, String hash) {
        return senha != null && hash != null && encoder.matches(senha, hash);
    }
}
