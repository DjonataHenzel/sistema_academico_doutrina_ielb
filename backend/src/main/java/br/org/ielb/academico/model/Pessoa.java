package br.org.ielb.academico.model;

import br.org.ielb.academico.model.TipoUsuarioEnum;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "pessoa")
public class Pessoa {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 11, unique = true)
    private String cpf;

    @Column(length = 20)
    private String whatsapp;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(length = 8)
    private String cep;

    @Column(length = 160)
    private String logradouro;

    @Column(length = 20)
    private String numero;

    @Column(length = 100)
    private String complemento;

    @Column(length = 100)
    private String bairro;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String uf;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_usuario", nullable = false, length = 20)
    private TipoUsuarioEnum tipoUsuario = TipoUsuarioEnum.ALUNO;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @PrePersist
    void antesDeInserir() {
        OffsetDateTime agora = OffsetDateTime.now(ZoneOffset.UTC);
        criadoEm = agora;
        atualizadoEm = agora;
    }

    @PreUpdate
    void antesDeAtualizar() {
        atualizadoEm = OffsetDateTime.now(ZoneOffset.UTC);
    }

    public Long getId() { return id; }
    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }
    public String getWhatsapp() { return whatsapp; }
    public void setWhatsapp(String whatsapp) { this.whatsapp = whatsapp; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }
    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }
    public TipoUsuarioEnum getTipoUsuario() { return tipoUsuario; }
    public void setTipoUsuario(TipoUsuarioEnum tipoUsuario) { this.tipoUsuario = tipoUsuario; }
}
