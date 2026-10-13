/**
 * Gera o hash bcrypt para ADMIN_PASSWORD_HASH.
 *
 *   npm run admin:senha -- "nova-senha-forte"
 *
 * Na Vercel, cole o hash como está. No .env.local, escape os cifrões (\$) — o Next expande "$..." em arquivos .env.
 */
import bcrypt from "bcryptjs";

const senha = process.argv[2];
if (!senha || senha.length < 10) {
  console.error('Uso: npm run admin:senha -- "senha-com-10+-caracteres"');
  process.exit(1);
}
const hash = bcrypt.hashSync(senha, 12);
console.log("Vercel (ADMIN_PASSWORD_HASH):", hash);
console.log(".env.local:", `ADMIN_PASSWORD_HASH="${hash.replace(/\$/g, "\\$")}"`);
