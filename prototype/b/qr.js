// Minimal QR code encoder for the coupon screen: byte mode, error correction level M, versions 1-6.
// Written from the QR specification (ISO/IEC 18004) so the prototype needs no download.
// QR.matrix(text) returns rows of booleans (true = dark); QR.svg(text) returns an SVG string.
(function () {
  // Level M block layout per version: [error correction codewords per block, blocks, data codewords per block].
  const LAYOUT = [null, [10, 1, 16], [16, 1, 28], [26, 1, 44], [18, 2, 32], [24, 2, 43], [16, 4, 27]];

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  function rsDivisor(degree) {
    const result = new Array(degree).fill(0);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        result[j] = gfMul(result[j], root);
        if (j + 1 < degree) result[j] ^= result[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return result;
  }

  function rsRemainder(data, divisor) {
    const result = divisor.map(() => 0);
    for (const b of data) {
      const factor = b ^ result.shift();
      result.push(0);
      divisor.forEach((d, i) => { result[i] ^= gfMul(d, factor); });
    }
    return result;
  }

  function utf8(text) {
    return Array.from(new TextEncoder().encode(text));
  }

  // Data bits, padded and split into blocks with error correction, then interleaved.
  function codewords(bytes, version) {
    const [ecLen, blocks, dataLen] = LAYOUT[version];
    const capacity = blocks * dataLen;
    const bits = [];
    const put = (value, length) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
    put(0b0100, 4);
    put(bytes.length, 8);
    bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, capacity * 8 - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let pad = 0xec; data.length < capacity; pad ^= 0xec ^ 0x11) data.push(pad);

    const divisor = rsDivisor(ecLen);
    const dataBlocks = [], ecBlocks = [];
    for (let b = 0; b < blocks; b++) {
      const block = data.slice(b * dataLen, (b + 1) * dataLen);
      dataBlocks.push(block);
      ecBlocks.push(rsRemainder(block, divisor));
    }
    const out = [];
    for (let i = 0; i < dataLen; i++) dataBlocks.forEach(block => out.push(block[i]));
    for (let i = 0; i < ecLen; i++) ecBlocks.forEach(block => out.push(block[i]));
    return out;
  }

  const MASKS = [
    (x, y) => (x + y) % 2 === 0,
    (x, y) => y % 2 === 0,
    (x, y) => x % 3 === 0,
    (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
    (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0,
    (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
  ];

  function build(version, words, mask) {
    const size = version * 4 + 17;
    const dark = Array.from({ length: size }, () => new Array(size).fill(false));
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, value) => { dark[y][x] = value; fixed[y][x] = true; };

    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
          if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
        }
      }
    }
    if (version > 1) {
      const c = size - 7;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }

    // Format information: level M (00) and the mask, BCH protected.
    const format = mask;
    let rem = format;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((format << 10) | rem) ^ 0x5412;
    const bit = i => ((bits >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);

    // Data in the zigzag order, then the mask over every non-function module.
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert;
          if (fixed[y][x]) continue;
          if (i < words.length * 8) dark[y][x] = ((words[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
          if (MASKS[mask](x, y)) dark[y][x] = !dark[y][x];
        }
      }
    }
    return dark;
  }

  // Simplified penalty (runs, 2x2 blocks, dark balance); any mask decodes, this only picks a cleaner one.
  function penalty(m) {
    const size = m.length;
    let score = 0;
    for (let a = 0; a < size; a++) {
      for (const line of [m[a], m.map(row => row[a])]) {
        let run = 1;
        for (let b = 1; b <= size; b++) {
          if (b < size && line[b] === line[b - 1]) { run++; continue; }
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
    }
    let darkCount = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (m[y][x]) darkCount++;
        if (x + 1 < size && y + 1 < size && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
      }
    }
    return score + Math.floor(Math.abs(darkCount * 20 - size * size * 10) / (size * size)) * 10;
  }

  function matrix(text) {
    const bytes = utf8(text);
    const version = LAYOUT.findIndex(l => l && bytes.length <= Math.floor((l[1] * l[2] * 8 - 12) / 8));
    if (version < 0) throw new Error('QR text too long: ' + bytes.length + ' bytes');
    const words = codewords(bytes, version);
    let best = null, bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      const m = build(version, words, mask);
      const score = penalty(m);
      if (score < bestScore) { best = m; bestScore = score; }
    }
    return best;
  }

  // Dark modules as one path, with a 4-module quiet zone.
  function svg(text) {
    const m = matrix(text);
    const n = m.length + 8;
    let d = '';
    m.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + 4} ${y + 4}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img">` +
      `<rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  const api = { matrix, svg };
  if (typeof module !== 'undefined') module.exports = api;
  else window.QR = api;
})();
