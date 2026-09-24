// Without look-alike characters (0/O, 1/l/I), so it can be read out or copied by hand.
const LETRAS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITOS = "23456789";
const ALFABETO = LETRAS + DIGITOS;

function aleatorio(max: number) {
  // Rejection sampling: no modulo bias.
  const limite = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limite) return buf[0] % max;
  }
}

/**
 * Temporary password handed to a new user, e.g. «kR7m-Wq3x-Hn8e» (about 80
 * bits). The user must replace it on first sign-in.
 */
export function generarPasswordTemporal() {
  const grupo = () => {
    const chars = Array.from({ length: 4 }, () => ALFABETO[aleatorio(ALFABETO.length)]);
    // At least one digit per group, so it never looks like a word.
    chars[aleatorio(4)] = DIGITOS[aleatorio(DIGITOS.length)];
    return chars.join("");
  };
  return [grupo(), grupo(), grupo()].join("-");
}
