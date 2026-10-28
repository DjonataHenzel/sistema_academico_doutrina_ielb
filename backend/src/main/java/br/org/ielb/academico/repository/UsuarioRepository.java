package br.org.ielb.academico.repository;

import br.org.ielb.academico.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    @Query("select u from Usuario u join fetch u.pessoa where u.login = :login")
    Optional<Usuario> buscarPorLogin(@Param("login") String login);

    @Query("select u from Usuario u join fetch u.pessoa where u.id = :id")
    Optional<Usuario> buscarComPessoa(@Param("id") Long id);

    @Query("select u from Usuario u join fetch u.pessoa")
    List<Usuario> listarComPessoa();

    Optional<Usuario> findByPessoa_Id(Long pessoaId);
    boolean existsByLogin(String login);
    boolean existsByLoginAndPessoa_IdNot(String login, Long pessoaId);
}
