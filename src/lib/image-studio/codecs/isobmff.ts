/** Small framing-only ISO-BMFF reader. All offsets are into the supplied local
 * bytes; external data references, unbounded box walks and metadata URLs are
 * never followed. In particular, do not send malformed whole HEIF files to
 * exifr's unbounded meta-box search (a zero-sized non-meta box can loop). */
export interface IsoMetadata {
  tiffs: Uint8Array[];
  profile: boolean;
  complete: boolean;
  /** Geometry can be verified even when a later EXIF item is malformed. */
  geometryRead: boolean;
  other: boolean;
  hasCleanAperture: boolean;
  /** Applied in property-association order, to raw decoded pixel order. */
  transforms: { kind: "rotate" | "mirror"; value: number }[];
  width?: number;
  height?: number;
}

interface Box { type: string; start: number; end: number }

export function readIsoMetadata(bytes: Uint8Array): IsoMetadata {
  const result: IsoMetadata = { tiffs: [], profile: false, complete: true, geometryRead: false, other: false, hasCleanAperture: false, transforms: [] };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let records = 0;
  const check = (position: number, count: number, end = bytes.length) => {
    if (!Number.isSafeInteger(position) || !Number.isSafeInteger(count) || position < 0 || count < 0
      || position + count > end || end > bytes.length) throw new Error();
  };
  const integer = (position: number, count: number, end = bytes.length): number => {
    if (count > 8) throw new Error();
    check(position, count, end);
    let value = 0;
    for (let index = 0; index < count; index++) value = value * 256 + bytes[position + index];
    if (!Number.isSafeInteger(value)) throw new Error();
    return value;
  };
  const fourcc = (position: number, end = bytes.length) => {
    check(position, 4, end);
    return String.fromCharCode(...bytes.subarray(position, position + 4));
  };
  const boxes = (start: number, end: number): Box[] => {
    const values: Box[] = [];
    for (let position = start; position < end;) {
      if (++records > 4096) throw new Error();
      check(position, 8, end);
      let size = integer(position, 4, end);
      const type = fourcc(position + 4, end);
      const header = size === 1 ? 16 : 8;
      if (size === 1) size = integer(position + 8, 8, end);
      if (size === 0) size = end - position;
      if (size < header) throw new Error();
      check(position, size, end);
      values.push({ type, start: position + header, end: position + size });
      position += size;
    }
    return values;
  };
  try {
    const meta = boxes(0, bytes.length).find((box) => box.type === "meta");
    if (!meta) { result.complete = false; return result; }
    check(meta.start, 4, meta.end);
    if (bytes[meta.start] !== 0) throw new Error();
    const children = boxes(meta.start + 4, meta.end);
    const primary = children.find((box) => box.type === "pitm");
    let primaryId: number | undefined;
    if (primary) {
      check(primary.start, 4, primary.end);
      const version = bytes[primary.start];
      if (version > 1) throw new Error();
      primaryId = integer(primary.start + 4, version === 0 ? 2 : 4, primary.end);
    }
    const iprp = children.find((box) => box.type === "iprp");
    if (iprp) {
      const properties = boxes(iprp.start, iprp.end);
      const ipco = properties.find((box) => box.type === "ipco");
      const ipma = properties.filter((box) => box.type === "ipma");
      const entries = ipco ? boxes(ipco.start, ipco.end) : [];
      result.profile = entries.some((box) => box.type === "colr");
      for (const associations of ipma) {
        check(associations.start, 8, associations.end);
        const version = bytes[associations.start];
        if (version > 1) throw new Error();
        const wide = (integer(associations.start + 1, 3, associations.end) & 1) !== 0;
        const count = integer(associations.start + 4, 4, associations.end);
        if (count > 4096) throw new Error();
        let position = associations.start + 8;
        for (let item = 0; item < count; item++) {
          const id = integer(position, version === 0 ? 2 : 4, associations.end);
          position += version === 0 ? 2 : 4;
          const length = integer(position++, 1, associations.end);
          for (let index = 0; index < length; index++) {
            if (++records > 4096) throw new Error();
            const propertyIndex = integer(position, wide ? 2 : 1, associations.end) & (wide ? 0x7fff : 0x7f);
            position += wide ? 2 : 1;
            if (id !== primaryId || propertyIndex === 0) continue;
            const property = entries[propertyIndex - 1];
            if (!property) throw new Error();
            if (property.type === "ispe") {
              check(property.start, 12, property.end);
              result.width = view.getUint32(property.start + 4);
              result.height = view.getUint32(property.start + 8);
            } else if (property.type === "irot" || property.type === "imir") {
              check(property.start, 1, property.end);
              const value = bytes[property.start];
              if (value > (property.type === "irot" ? 3 : 1) || result.transforms.length >= 8) throw new Error();
              result.transforms.push({ kind: property.type === "irot" ? "rotate" : "mirror", value });
            } else if (property.type === "clap") {
              // Clean-aperture crop is handled by native/libheif decoders; a
              // raw AVIF fallback must not claim equivalent geometry.
              result.hasCleanAperture = true;
            }
          }
        }
      }
    }
    result.geometryRead = primaryId !== undefined;
    const exifIds = new Set<number>();
    const iinf = children.find((box) => box.type === "iinf");
    if (iinf) {
      check(iinf.start, 6, iinf.end);
      const countBytes = bytes[iinf.start] === 0 ? 2 : 4;
      const count = integer(iinf.start + 4, countBytes, iinf.end);
      if (count > 4096) throw new Error();
      const items = boxes(iinf.start + 4 + countBytes, iinf.end);
      if (items.length !== count) throw new Error();
      for (const item of items) {
        if (item.type !== "infe") continue;
        check(item.start, 4, item.end);
        const version = bytes[item.start];
        if (version !== 2 && version !== 3) { result.complete = false; continue; }
        const idBytes = version === 2 ? 2 : 4;
        const id = integer(item.start + 4, idBytes, item.end);
        const type = fourcc(item.start + 4 + idBytes + 2, item.end);
        if (type === "Exif") exifIds.add(id);
        if (type === "mime" || type === "uri ") result.other = true;
      }
    }
    if (!exifIds.size) return result;
    if (exifIds.size > 8) throw new Error();
    const iloc = children.find((box) => box.type === "iloc");
    if (!iloc) throw new Error();
    check(iloc.start, 8, iloc.end);
    const version = bytes[iloc.start];
    if (version > 2) throw new Error();
    const offsetSize = bytes[iloc.start + 4] >> 4;
    const lengthSize = bytes[iloc.start + 4] & 15;
    const baseSize = bytes[iloc.start + 5] >> 4;
    const indexSize = version === 0 ? 0 : bytes[iloc.start + 5] & 15;
    if (![offsetSize, lengthSize, baseSize, indexSize].every((size) => [0, 4, 8].includes(size))) throw new Error();
    let position = iloc.start + 6;
    const idBytes = version === 2 ? 4 : 2;
    const count = integer(position, idBytes, iloc.end);
    position += idBytes;
    if (count > 4096) throw new Error();
    const idat = children.find((box) => box.type === "idat");
    let found = 0;
    for (let item = 0; item < count; item++) {
      const id = integer(position, idBytes, iloc.end); position += idBytes;
      const construction = version > 0 ? integer(position, 2, iloc.end) & 15 : 0;
      if (version > 0) position += 2;
      const reference = integer(position, 2, iloc.end); position += 2;
      const base = integer(position, baseSize, iloc.end); position += baseSize;
      const extents = integer(position, 2, iloc.end); position += 2;
      if (extents > 256) throw new Error();
      const wanted = exifIds.has(id);
      const parts: Uint8Array[] = [];
      let total = 0;
      for (let index = 0; index < extents; index++) {
        if (++records > 4096) throw new Error();
        check(position, indexSize, iloc.end); position += indexSize;
        const offset = integer(position, offsetSize, iloc.end); position += offsetSize;
        const length = integer(position, lengthSize, iloc.end); position += lengthSize;
        if (!wanted) continue;
        if (reference !== 0 || construction > 1 || (construction === 1 && !idat) || length === 0) throw new Error();
        total += length;
        if (total > 1_048_576) throw new Error();
        const start = base + offset + (construction === 1 ? idat!.start : 0);
        check(start, length, construction === 1 ? idat!.end : bytes.length);
        parts.push(bytes.subarray(start, start + length));
      }
      if (wanted) {
        if (total < 12) throw new Error();
        const data = parts.length === 1 ? parts[0] : new Uint8Array(total);
        if (parts.length !== 1) { let at = 0; for (const part of parts) { data.set(part, at); at += part.length; } }
        const skip = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0) + 4;
        if (skip + 8 > data.length) throw new Error();
        result.tiffs.push(data.subarray(skip));
        found++;
      }
    }
    if (found !== exifIds.size) result.complete = false;
  } catch {
    result.complete = false;
  }
  return result;
}