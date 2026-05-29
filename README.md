# Copa das Vendas – Versão Profissional

Esta pasta contém a versão profissional do sistema da gincana **Copa do Mundo das Vendas** para a franquia Tênis One.  O objetivo desta versão é se integrar com serviços externos (Firebase e Cloudinary) para fornecer um fluxo completo de autenticação, persistência de dados e armazenamento de imagens.

## Estrutura

```
tenis-one-professional/
├── index.html         # página inicial do sistema
├── styles.css         # estilo global
├── app.js             # lógica de interface e comunicação com Firebase
├── config.js          # definições de Firebase, Cloudinary e emails
├── firebase-rules.json# regras de segurança para o Firebase Realtime Database
└── README.md          # este arquivo
```

## Pré-requisitos

1. **Projeto Firebase** – Crie um projeto no [Firebase Console](https://console.firebase.google.com/).  Ative o serviço de **Realtime Database** e **Authentication (Email/Password)**.  Copie as chaves de configuração para `config.js`.
2. **Conta Cloudinary** – Crie uma conta no [Cloudinary](https://cloudinary.com/) e configure um **Upload Preset** sem assinatura.  Anote o `cloudName` e o `uploadPreset` e preencha em `config.js`.
3. **Usuários de autenticação** – Crie as contas dos usuários diretamente no Firebase Authentication:
   - Uma conta para o gerente (manager).  Insira o email na variável `managerEmail` em `config.js`.
   - Uma conta para cada vendedor.  Insira esses emails no array `sellerEmails` em `config.js`.
   - A senha inicial pode ser qualquer valor; os usuários podem alterá-la depois.
4. **Regras de banco** – Atualize `firebase-rules.json` substituindo `gerente@example.com` pelo email real do gerente.  Importe ou copie estas regras para o console do Firebase em **Realtime Database → Rules**.

## Configuração

1. Edite `config.js` e preencha:
   - `firebaseConfig` com as informações do seu app Firebase (`apiKey`, `authDomain`, `databaseURL`, `projectId`, `storageBucket`, `messagingSenderId` e `appId`).
   - `cloudinaryConfig` com `cloudName` e `uploadPreset` obtidos no painel Cloudinary.
   - `managerEmail` com o email do gerente.
   - `sellerEmails` com os emails dos cinco vendedores.
2. Edite `firebase-rules.json` e substitua `gerente@example.com` pelo email do gerente para garantir que somente o gerente possa escrever dados.  Você também pode optar por usar regras baseadas em *roles* para permitir leitura e escrita condicional com `root.child('roles').child(auth.uid).child('role')`.
3. Faça o **deploy** do projeto em um serviço de hospedagem estática ou no GitHub Pages.  Certifique‑se de usar HTTPS para permitir a captura de imagens e acesso à câmera.

## Funcionamento

### Autenticação

O sistema usa o Firebase Authentication (Email/Password).  Ao acessar `index.html` pela primeira vez, o usuário deverá informar seu email e senha.  O código em `app.js` verifica se o email está listado como gerente ou vendedor e libera as funcionalidades adequadas.

### Permissões

Somente o gerente tem permissão para gravar dados (lançar vendas, cadastrar vendedores, fechar rodadas e editar figurinhas).  Vendedores apenas visualizam placar, ranking, vendas e álbum.  As regras de segurança do banco (`firebase-rules.json`) implementam essa política.

### Cloudinary

As fotos das figurinhas são enviadas diretamente para o Cloudinary usando o widget de upload.  Para isso funcionar, o `uploadPreset` deve ser **unsigned** (não requer autenticação).  Você poderá visualizar e gerenciar as fotos no seu painel Cloudinary.

### Realtime Database

Os dados são armazenados em uma estrutura simples de árvore:

```
sales/
  yyyy-mm-dd/
    uid1: { amount: 123.45, note: "observação" }
    uid2: { amount: 456.00 }

vendors/
  uid1: { name: "Isack", team: "green", number: 10, rarity: "legend", title: "Capitão", photoUrl: "..." }
  uid2: { ... }

roles/
  authUid1: { role: "manager" }
  authUid2: { role: "seller" }

figures/
  uid1: { ... }

history/
  yyyy-mm-dd: { greenGoals: 2, blueGoals: 1, winner: "green" }
```

Essa estrutura pode ser adaptada conforme necessidade.  O código em `app.js` consulta estas informações e atualiza o placar e o ranking em tempo real.

## Observação

Este repositório fornece apenas a interface básica e a integração com Firebase/Cloudinary.  Você pode personalizar os estilos em `styles.css`, adicionar componentes de UI e refinar a lógica de negócios em `app.js` conforme necessário para se adequar ao fluxo operacional da sua loja.