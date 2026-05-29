// Configuration file for the Copa do Mundo das Vendas system.
//
// 1. Fill in your Firebase project information below.  You can find these
//    values in the Firebase console under Project Settings → General → Your apps.
// 2. Fill in your Cloudinary account information.  You'll need a
//    `cloudName` and an unsigned `uploadPreset` to allow the browser to upload
//    images directly.  Create an unsigned preset in the Cloudinary dashboard.
// 3. Define which email address belongs to the gerente (manager) and which
//    belong to the vendedores (sellers).  These addresses must match the
//    accounts created in Firebase Authentication.  The system uses these
//    addresses to determine permissions at runtime.

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

export const cloudinaryConfig = {
  cloudName: "",
  uploadPreset: ""
};

// Assign the email address of the gerente (manager) account.  Only the
// manager will be allowed to write to the database, create or edit vendors,
// upload photos and close rounds.  The email must match a real user
// registered in Firebase Authentication.
export const managerEmail = "gerente@example.com";

// List the email addresses of all vendedores (sellers).  These accounts
// should also exist in Firebase Authentication.  Sellers may log in to
// view the scoreboard, ranking and album but cannot write data.
export const sellerEmails = [
  "vendedor1@example.com",
  "vendedor2@example.com",
  "vendedor3@example.com",
  "vendedor4@example.com",
  "vendedor5@example.com"
];