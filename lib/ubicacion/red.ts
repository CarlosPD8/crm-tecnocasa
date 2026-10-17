/**
 * The client's public IP and the office networks. Pure: the server passes in
 * the request headers. Vercel sets `x-real-ip` and overwrites
 * `x-forwarded-for`, so neither can be forged by the browser; this only holds
 * while the app is served straight from Vercel (no proxy in front).
 *
 * A network is stored as the exact IPv4 address, or as the /64 prefix of an
 * IPv6 address (the part an ISP assigns to one customer; devices rotate the
 * rest).
 */

export function ipDeCabeceras(cabecera: (nombre: string) => string | null): string | null {
  return normalizarIp(cabecera("x-real-ip") ?? cabecera("x-forwarded-for")?.split(",")[0]);
}

function normalizarIp(ip: string | null | undefined): string | null {
  let s = ip?.trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("[")) s = s.slice(1, s.indexOf("]"));
  if (s.startsWith("::ffff:") && s.includes(".")) s = s.slice(7);
  return esIpv4(s) || gruposIpv6(s) ? s : null;
}

function esIpv4(s: string) {
  const partes = s.split(".");
  return partes.length === 4 && partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

/** The 8 groups of an IPv6 address as numbers, or null if it isn't one. */
function gruposIpv6(s: string): number[] | null {
  if (!s.includes(":") || !/^[0-9a-f:]+$/.test(s)) return null;
  const mitades = s.split("::");
  if (mitades.length > 2) return null;
  const izquierda = mitades[0] ? mitades[0].split(":") : [];
  const derecha = mitades.length === 2 && mitades[1] ? mitades[1].split(":") : [];
  const faltan = 8 - izquierda.length - derecha.length;
  if (mitades.length === 1 ? faltan !== 0 : faltan < 1) return null;
  const grupos = [...izquierda, ...Array<string>(mitades.length === 2 ? faltan : 0).fill("0"), ...derecha];
  if (grupos.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return grupos.map((g) => parseInt(g, 16));
}

/** The network an IP belongs to, as stored in `Oficina.redes`. */
export function redDeIp(ip: string): string | null {
  const s = normalizarIp(ip);
  if (!s) return null;
  if (esIpv4(s)) return s;
  const grupos = gruposIpv6(s)!;
  return `${grupos.slice(0, 4).map((g) => g.toString(16)).join(":")}::/64`;
}

export function ipEnRedes(ip: string | null, redes: readonly string[]) {
  const red = ip ? redDeIp(ip) : null;
  return red !== null && redes.includes(red);
}

/**
 * Whether the IP is reachable on the internet. A private, loopback, link-local
 * or carrier-grade NAT address (shared by many customers) can't identify the
 * office.
 */
export function esIpPublica(ip: string) {
  const s = normalizarIp(ip);
  if (!s) return false;
  if (esIpv4(s)) {
    const [a, b] = s.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const [primero] = gruposIpv6(s)!;
  // Global unicast is 2000::/3; everything else (::1, fc00::/7, fe80::/10…) isn't.
  return primero >= 0x2000 && primero <= 0x3fff;
}
