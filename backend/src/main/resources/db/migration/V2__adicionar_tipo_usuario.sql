ALTER TABLE usuario
    ADD COLUMN tipo_usuario VARCHAR(20) NOT NULL DEFAULT 'ALUNO';

ALTER TABLE usuario
    ADD CONSTRAINT usuario_tipo_usuario_check
        CHECK (tipo_usuario IN ('ADMINISTRADOR', 'ALUNO'));
