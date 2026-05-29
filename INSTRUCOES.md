# Copa das Vendas Tênis One — configuração de produção

Este pacote contém somente os arquivos necessários para a equipe usar a gincana hoje.

## Arquivo principal

Abra e publique:

`index.html`

## Onde colocar Firebase

Abra:

`config.js`

Preencha este bloco:

```js
firebase: {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
}
```

Essas informações ficam no Firebase Console, em Project settings, na configuração do app Web.

## Onde colocar Cloudinary

No mesmo `config.js`, preencha:

```js
cloudinary: {
  cloudName: "",
  uploadPreset: ""
}
```

O `uploadPreset` precisa ser unsigned para permitir envio direto das fotos das figurinhas pelo navegador.

## Onde colocar o email do gerente

No `config.js`, preencha:

```js
auth: {
  enabled: true,
  managerName: "Saulo",
  managerEmail: "gerente@tenisone.com.br"
}
```

Troque `gerente@tenisone.com.br` pelo email real cadastrado no Firebase Authentication.

## Onde colocar os emails dos vendedores

No `config.js`, preencha a lista:

```js
sellers: [
  { vendorId: "isack", email: "isack@tenisone.com.br" },
  { vendorId: "viviane", email: "viviane@tenisone.com.br" },
  { vendorId: "matheus", email: "matheus@tenisone.com.br" },
  { vendorId: "brian", email: "brian@tenisone.com.br" },
  { vendorId: "vendedor5", email: "vendedor5@tenisone.com.br" }
]
```

O `vendorId` precisa bater com o `id` do vendedor em `campaign.vendors`.

## Regras do banco

Use o arquivo:

`firebase-rules.json`

Cole o conteúdo dele em Realtime Database, na aba Rules.

Antes de publicar as regras, confira o email do gerente dentro do arquivo de regras e troque pelo mesmo email configurado em `config.js`.

## Publicação

Suba estes arquivos no GitHub Pages ou em outra hospedagem HTTPS.

A câmera e os uploads funcionam melhor em HTTPS.


## Atualização desta versão

- O login profissional agora sempre mostra campo de email e senha quando `auth.enabled` está `true` no `config.js`.
- Para o usuário não precisar digitar tudo de novo, existe a opção **Salvar email e senha neste aparelho**. Use somente em aparelho confiável da loja.
- Para entrar, o email precisa existir no Firebase Authentication e também estar liberado em `managerEmail` ou em `auth.sellers` no `config.js`.
- As figurinhas agora seguem o padrão visual solicitado pelo Saulo, com campos: **Função**, **Altura**, **Peso** e **Idade**.
- Esses campos podem ser editados em **Gerenciar vendedores e figurinhas**.
