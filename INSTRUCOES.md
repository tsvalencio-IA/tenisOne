# Copa das Vendas Tênis One — configuração de produção

Este pacote está preparado para uso com a equipe.

## Arquivo principal

Publique estes arquivos no GitHub Pages e abra:

`index.html`

## Acesso por email e senha

O sistema usa Firebase Authentication por email e senha.

No `config.js`, o gerente já está configurado como:

```js
managerEmail: "saulo@t1.com"
```

Os vendedores continuam no bloco:

```js
sellers: [
  { vendorId: "isack", email: "isack@tenisone.com.br" },
  { vendorId: "viviane", email: "viviane@tenisone.com.br" },
  { vendorId: "matheus", email: "matheus@tenisone.com.br" },
  { vendorId: "brian", email: "brian@tenisone.com.br" },
  { vendorId: "vendedor5", email: "vendedor5@tenisone.com.br" }
]
```

Cada email precisa existir em Firebase Authentication, no provedor Email/Senha.

## Firebase Realtime Database

O `config.js` já está preenchido com os dados do projeto Firebase enviados.

Use o arquivo:

`firebase-rules.json`

Cole o conteúdo dele em:

Firebase Console → Realtime Database → Rules

As regras já estão configuradas para permitir escrita somente ao email:

`saulo@t1.com`

Os vendedores autenticados conseguem ler, mas não conseguem gravar.

## Cloudinary

No `config.js`, preencha quando tiver:

```js
cloudinary: {
  cloudName: "",
  uploadPreset: ""
}
```

O `uploadPreset` precisa ser `unsigned`.

Se Cloudinary ainda estiver vazio, o sistema permite escolher ou bater foto localmente; porém para uso profissional com banco real, o correto é preencher Cloudinary para não salvar fotos grandes diretamente no banco.

## Figurinhas

As figurinhas foram atualizadas para o padrão visual pedido, sem logos oficiais.

Campos disponíveis no cadastro do vendedor:

- nome completo
- nome curto
- equipe
- número da camisa
- função / posição
- altura
- peso
- nascimento
- idade
- raridade
- título/destaque
- subtítulo

A figurinha mostra:

- foto grande
- moldura premium
- selo da Copa das Vendas 2026
- equipe
- nascimento/idade
- altura
- peso
- nome
- função/posição

## Câmera e upload

No painel de vendedores, o gerente pode usar:

- `Enviar foto`
- `Bater foto`

Em celular, a opção `Bater foto` abre a câmera do aparelho quando o navegador permitir.

## Observação importante

Depois de subir no GitHub Pages, faça um hard refresh no navegador do celular:

- Android/Chrome: menu do navegador → atualizar
- ou limpe cache do site

Isso evita abrir uma versão antiga do `index.html`, `app.js` ou `config.js`.
