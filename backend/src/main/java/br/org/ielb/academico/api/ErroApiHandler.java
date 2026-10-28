package br.org.ielb.academico.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class ErroApiHandler {

    // Exibe somente mensagens de validação controladas pela aplicação.
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> tratarErroValidacao(ResponseStatusException exception) {
        String mensagem = exception.getReason();
        if (mensagem == null || mensagem.isBlank()) {
            mensagem = "Não foi possível concluir a operação.";
        }
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("detail", mensagem));
    }
}
