const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp"]);
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function avatarFileError(file: Pick<File, "type" | "size">) {
  if (!ACCEPTED.has(file.type)) return "Choisissez une image JPG, PNG ou WebP";
  if (file.size > AVATAR_MAX_BYTES) return "La photo doit faire moins de 5 Mo";
  if (file.size === 0) return "Cette image est vide";
  return null;
}

/** Version locale légère pour l'espace d'essai, sans envoyer la photo à un service externe. */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const error = avatarFileError(file);
  if (error) throw new Error(error);
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Impossible de lire cette photo"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Cette image ne peut pas être affichée"));
    element.src = source;
  });
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Impossible de préparer cette photo");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}
