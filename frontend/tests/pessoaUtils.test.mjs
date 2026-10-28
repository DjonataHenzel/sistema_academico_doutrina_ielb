import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpfValido, digitos, filtrarPessoas, formatarCpf, formatarCep, formatarWhatsapp } from '../src/pessoaUtils.ts';

const pessoas = [
  { nome: 'José da Silva', cpf: '00690779917', whatsapp: '45988043418', login: 'jose.silva' },
  { nome: 'Maria Eugenia', cpf: '52998224725', whatsapp: '44999999999', login: 'maria.eugenia' },
  { nome: 'Ana', cpf: null, whatsapp: null, login: null },
];

test('CPF válido aceita máscaras, dígitos e rejeita inválidos', () => {
  assert.equal(cpfValido('006.907.799-17'), true);
  assert.equal(cpfValido('00690779917'), true);
  assert.equal(cpfValido('006.907.799-18'), false);
  assert.equal(cpfValido('11111111111'), false);
  assert.equal(cpfValido('0069077991'), false);
  assert.equal(cpfValido(''), false);
});

test('máscaras não perdem zeros à esquerda e limitam comprimento', () => {
  assert.equal(digitos('006.907.799-17'), '00690779917');
  assert.equal(formatarCpf('006907799171234'), '006.907.799-17');
  assert.equal(formatarCep('85908270'), '85908-270');
  assert.equal(formatarWhatsapp('45988043418'), '(45) 98804-3418');
  assert.equal(formatarWhatsapp('4530501234'), '(45) 3050-1234');
});

test('view filtra nome sem acento e sem diferenciar caixa', () => {
  assert.deepEqual(filtrarPessoas(pessoas, 'joSe'), [pessoas[0]]);
  assert.deepEqual(filtrarPessoas(pessoas, 'EUGENIA'), [pessoas[1]]);
});

test('view filtra CPF com e sem pontuação e WhatsApp formatado', () => {
  assert.deepEqual(filtrarPessoas(pessoas, '006.907'), [pessoas[0]]);
  assert.deepEqual(filtrarPessoas(pessoas, '00690779917'), [pessoas[0]]);
  assert.deepEqual(filtrarPessoas(pessoas, '(45) 98804-3418'), [pessoas[0]]);
});

test('view filtra login, lida com null e mantém todos ao limpar', () => {
  assert.deepEqual(filtrarPessoas(pessoas, 'maria.eugenia'), [pessoas[1]]);
  assert.deepEqual(filtrarPessoas(pessoas, ' nao-existe '), []);
  assert.equal(filtrarPessoas(pessoas, '').length, pessoas.length);
  assert.equal(filtrarPessoas(pessoas, '    ').length, pessoas.length);
});
