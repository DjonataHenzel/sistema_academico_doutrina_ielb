package br.org.ielb.academico.repository;

import br.org.ielb.academico.model.Pessoa;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PessoaRepository extends JpaRepository<Pessoa, Long> {
    List<Pessoa> findAllByOrderByNomeAscIdAsc();

    // Exclui a pessoa atual da checagem para permitir manter o CPF na edição.
    boolean existsByCpfAndIdNot(String cpf, Long id);
}
