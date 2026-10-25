// Reads what an image file says about itself. Generators and editing tools
// increasingly write their name, an IPTC "digital source type" or a C2PA
// manifest into the file. This is a strong signal when present, and means
// nothing when absent: metadata is stripped by screenshots, re-saves and most
// social platforms.

export interface MediaScan {
  aiSignal: "strong" | "partial" | "none";
  /** A C2PA manifest is embedded. Its signature is not verified here. */
  c2pa: boolean;
  camera: string | null;
  findings: string[];
}

const GENERATORS: [RegExp, string][] = [
  [/Steps: \d+[\s\S]{0,200}Sampler:/, "Stable Diffusion generation parameters"],
  [/"class_type"\s*:\s*"KSampler/, "a ComfyUI generation workflow"],
  [/\bMidjourney\b/i, "Midjourney"],
  [/\bDALL[·\-\s]?E\b/, "DALL·E"],
  [/\bgpt-image|\bChatGPT\b/, "OpenAI's image generator"],
  [/\bAdobe Firefly\b/, "Adobe Firefly"],
  [/\bNovelAI\b/, "NovelAI"],
  [/\bStable Diffusion\b/i, "Stable Diffusion"],
  [/\bLeonardo\.Ai\b/i, "Leonardo.Ai"],
  [/\bIdeogram\b/, "Ideogram"],
  [/\bGoogle Imagen\b|\bImagen [234]\b/, "Google Imagen"],
];

const CAMERA = /\b(Canon|NIKON|SONY|FUJIFILM|Apple|samsung|Google Pixel|LEICA|Panasonic|OLYMPUS|OM Digital|RICOH|PENTAX|Hasselblad|DJI|GoPro)\b/;

export function scanImageMetadata(bytes: Uint8Array): MediaScan {
  // latin1 maps every byte to one char, so binary data survives intact.
  const raw = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("latin1");
  const findings: string[] = [];
  let aiSignal: MediaScan["aiSignal"] = "none";

  if (raw.includes("compositeWithTrainedAlgorithmicMedia")) {
    aiSignal = "partial";
    findings.push("Embedded IPTC source type says the image combines AI-generated material with other content.");
  } else if (raw.includes("trainedAlgorithmicMedia")) {
    aiSignal = "strong";
    findings.push("Embedded IPTC source type says the image was produced by a generative model.");
  }

  for (const [pattern, name] of GENERATORS) {
    if (pattern.test(raw)) {
      if (aiSignal === "none") aiSignal = "strong";
      findings.push(`File metadata names ${name}.`);
    }
  }

  const c2pa = raw.includes("c2pa");
  if (c2pa) {
    findings.push(
      aiSignal === "none"
        ? "Contains a C2PA Content Credentials manifest with no AI source declared (signature not yet verified)."
        : "Contains a C2PA Content Credentials manifest.",
    );
  }

  let camera: string | null = null;
  if (raw.includes("Exif")) {
    const m = raw.slice(0, 256 * 1024).match(CAMERA);
    if (m) {
      camera = m[1];
      findings.push(`EXIF data names a ${camera} camera. (Easy to fake, so this alone proves nothing.)`);
    }
  }

  if (findings.length === 0) {
    findings.push("No provenance metadata found. That's normal for exported or re-saved files and is not evidence either way.");
  }

  return { aiSignal, c2pa, camera, findings };
}

export function sniffImageType(bytes: Uint8Array): "jpg" | "png" | "webp" | "gif" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "webp";
  return null;
}
