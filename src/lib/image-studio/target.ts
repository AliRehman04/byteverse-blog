import { IMAGE_LIMITS } from "./types";
import type { Dimensions } from "./types";
import { estimateScale, validateDimensions } from "./geometry";

export const TARGET_SEARCH_LIMITS = Object.freeze({ qualityCeiling: 95, encodesPerRound: 8, resizeRounds: 3 });

export interface SizedCandidate {
  /** Actual encoded bytes; must remain stable for the lifetime of the result. */
  readonly size: number;
}

export interface EncodeRequest extends Dimensions {
  quality: number;
}

export interface TargetAttempt extends EncodeRequest {
  size: number;
  targetMet: boolean;
  /** Both counters are one-based. No image payload is passed to progress callbacks. */
  round: number;
  attempt: number;
}

export interface TargetSearchOptions<Candidate extends SizedCandidate> extends Dimensions {
  targetBytes: number;
  minQuality: number;
  maxQuality?: number;
  preserveDimensions: boolean;
  lossless?: boolean;
  maxEncodesPerRound?: number;
  /** Dimension reductions, not total rounds: 0..3, hence at most 4 rounds. */
  maxResizeRounds?: number;
  signal?: AbortSignal;
  encode: (request: Readonly<EncodeRequest>) => Promise<Candidate>;
  onAttempt?: (attempt: Readonly<TargetAttempt>) => void;
}

export interface TargetSearchResult<Candidate extends SizedCandidate> extends EncodeRequest {
  candidate: Candidate;
  targetMet: boolean;
  attempts: number;
  /** Whether the RETURNED candidate, not merely an attempted one, was resized. */
  resized: boolean;
}

interface Observation<Candidate extends SizedCandidate> extends EncodeRequest {
  candidate: Candidate;
  size: number;
}

function integer(value: number, minimum: number, maximum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
}

function abortError(): Error {
  const error = new Error("Image optimization was cancelled.");
  error.name = "AbortError";
  return error;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

/** Reject promptly on cooperative cancellation, observing even late encoder
 * rejections. This cannot preempt synchronous/native encoding: the worker owns
 * hard termination and IMAGE_LIMITS.jobTimeoutMs. No timer or I/O lives here.
 */
function encodeWithSignal<Candidate extends SizedCandidate>(
  encode: TargetSearchOptions<Candidate>["encode"],
  request: Readonly<EncodeRequest>,
  signal?: AbortSignal,
): Promise<Candidate> {
  checkAbort(signal);
  if (!signal) return encode(request);
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => { cleanup(); reject(abortError()); };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) { onAbort(); return; }
    try {
      Promise.resolve(encode(request)).then((candidate) => {
        cleanup();
        if (signal.aborted) reject(abortError());
        else resolve(candidate);
      }, (error: unknown) => { cleanup(); reject(error); });
    } catch (error) { cleanup(); reject(error); }
  });
}

/** Probe an unsampled gap, preferring higher quality when gaps have equal width.
 * A previous miss is not proof that all higher qualities miss (nonmonotonicity).
 */
function gapProbe(samples: ReadonlyMap<number, number>, minimum: number, maximum: number): number | undefined {
  const seen = [...samples.keys()].filter((quality) => quality >= minimum).sort((a, b) => a - b);
  let start = minimum;
  let bestStart = minimum;
  let bestLength = 0;
  for (const quality of [...seen, maximum + 1]) {
    const length = quality - start;
    if (length > 0 && length >= bestLength) { bestStart = start; bestLength = length; }
    start = quality + 1;
  }
  return bestLength === 0 ? undefined : bestStart + Math.floor(bestLength / 2);
}

/** Bounded single-codec search, NOT a global or cross-codec quality optimum.
 * Prefer the first (largest) dimension round with a passing observation, then
 * its highest observed passing quality. Every observed candidate participates
 * in selection, including probes that contradict binary-search assumptions.
 * If none pass, return the smallest observed candidate with targetMet:false.
 * Retain only best payloads and <=8 size samples, not every encoded buffer.
 */
export async function searchTarget<Candidate extends SizedCandidate>(
  options: TargetSearchOptions<Candidate>,
): Promise<TargetSearchResult<Candidate>> {
  validateDimensions(options.width, options.height);
  integer(options.targetBytes, IMAGE_LIMITS.targetMinBytes, IMAGE_LIMITS.maxOutputBytes, "Target bytes");
  integer(options.minQuality, 1, TARGET_SEARCH_LIMITS.qualityCeiling, "Minimum quality");
  const requestedCeiling = options.maxQuality ?? TARGET_SEARCH_LIMITS.qualityCeiling;
  integer(requestedCeiling, 1, 100, "Maximum quality");
  const ceiling = Math.min(TARGET_SEARCH_LIMITS.qualityCeiling, requestedCeiling);
  if (options.minQuality > ceiling) throw new RangeError("Minimum quality exceeds the search ceiling.");
  const perRound = options.maxEncodesPerRound ?? TARGET_SEARCH_LIMITS.encodesPerRound;
  const reductions = options.maxResizeRounds ?? TARGET_SEARCH_LIMITS.resizeRounds;
  integer(perRound, 1, TARGET_SEARCH_LIMITS.encodesPerRound, "Encodes per round");
  integer(reductions, 0, TARGET_SEARCH_LIMITS.resizeRounds, "Dimension reductions");
  if (typeof options.preserveDimensions !== "boolean" || (options.lossless !== undefined && typeof options.lossless !== "boolean")) {
    throw new TypeError("Target-search flags must be booleans.");
  }
  if (typeof options.encode !== "function" || (options.onAttempt !== undefined && typeof options.onAttempt !== "function")) {
    throw new TypeError("Target search requires an encoder and an optional progress callback.");
  }
  checkAbort(options.signal);
  let width = options.width;
  let height = options.height;
  let attempts = 0;
  let smallest: Observation<Candidate> | undefined;
  const result = (observation: Observation<Candidate>): TargetSearchResult<Candidate> => ({
    candidate: observation.candidate,
    width: observation.width,
    height: observation.height,
    quality: observation.quality,
    targetMet: observation.size <= options.targetBytes,
    attempts,
    resized: observation.width !== options.width || observation.height !== options.height,
  });

  for (let round = 0; round <= reductions; round++) {
    const samples = new Map<number, number>();
    const state: { passing?: Observation<Candidate>; minSize: number } = { minSize: Infinity };
    // observe changes this across await boundaries; do not retain a narrowed
    // property value from before an encoder callback ran.
    const getPassing = (): Observation<Candidate> | undefined => state.passing;
    const observe = async (quality: number): Promise<number> => {
      checkAbort(options.signal);
      const request = Object.freeze({ width, height, quality });
      attempts++;
      const candidate = await encodeWithSignal(options.encode, request, options.signal);
      checkAbort(options.signal);
      if (!candidate || typeof candidate !== "object") throw new TypeError("Encoder must return a sized candidate.");
      const size = candidate.size;
      integer(size, 1, IMAGE_LIMITS.maxOutputBytes, "Encoded bytes");
      const observation = { ...request, candidate, size };
      samples.set(quality, size);
      state.minSize = Math.min(state.minSize, size);
      if (!smallest || size < smallest.size || (size === smallest.size && quality > smallest.quality)
        || (size === smallest.size && quality === smallest.quality && width * height > smallest.width * smallest.height)) smallest = observation;
      if (size <= options.targetBytes && (!state.passing || quality > state.passing.quality)) state.passing = observation;
      options.onAttempt?.(Object.freeze({ ...request, size, targetMet: size <= options.targetBytes, round: round + 1, attempt: attempts }));
      checkAbort(options.signal);
      return size;
    };

    // A one-encode lossy budget tests the floor; lossless never searches quality.
    await observe(!options.lossless && perRound === 1 ? options.minQuality : ceiling);
    const initialPassing = getPassing();
    if (initialPassing) return result(initialPassing);
    if (!options.lossless && perRound > 1 && options.minQuality !== ceiling) {
      await observe(options.minQuality);
      let low = options.minQuality + 1;
      let high = ceiling - 1;
      const binaryAttempts = Math.max(0, perRound - samples.size - 2);
      for (let index = 0; index < binaryAttempts && low <= high; index++) {
        const quality = Math.floor((low + high) / 2);
        const size = await observe(quality);
        if (size <= options.targetBytes) low = quality + 1;
        else high = quality - 1;
      }
      let checkedNeighbor = false;
      while (samples.size < perRound) {
        let quality: number | undefined;
        const passing = getPassing();
        if (!checkedNeighbor && passing && passing.quality < ceiling && !samples.has(passing.quality + 1)) {
          quality = passing.quality + 1;
          checkedNeighbor = true;
        } else quality = gapProbe(samples, passing ? passing.quality + 1 : options.minQuality, ceiling);
        if (quality === undefined) break;
        await observe(quality);
      }
    }
    const bestPassing = getPassing();
    if (bestPassing) return result(bestPassing);
    if (options.preserveDimensions || round === reductions) break;
    const scale = estimateScale(options.targetBytes, state.minSize);
    const nextWidth = Math.max(1, Math.floor(width * scale));
    const nextHeight = Math.max(1, Math.floor(height * scale));
    if (nextWidth === width && nextHeight === height) break;
    width = nextWidth;
    height = nextHeight;
  }
  if (!smallest) throw new Error("Encoder produced no candidate.");
  return result(smallest);
}