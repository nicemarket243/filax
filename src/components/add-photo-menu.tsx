import { useRef } from "react";
import { Camera, Images, FolderOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface AddPhotoMenuProps {
  onFile: (file: File) => void;
  /** Restrict to images only, or allow PDF as well (documents). */
  allowPdf?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Trigger that lets the user choose between live camera capture, the photo
 * gallery or the file manager — each wired to a real hidden file input.
 */
export function AddPhotoMenu({ onFile, allowPdf, children, className }: AddPhotoMenuProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = "";
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild className={className}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 rounded-2xl border-white/10 bg-card/95 backdrop-blur-2xl">
          <DropdownMenuItem onSelect={() => cameraRef.current?.click()} className="gap-2.5 py-2.5">
            <Camera className="h-4 w-4 text-brand-green" /> Appareil photo
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => galleryRef.current?.click()} className="gap-2.5 py-2.5">
            <Images className="h-4 w-4 text-brand-blue" /> Galerie
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileRef.current?.click()} className="gap-2.5 py-2.5">
            <FolderOpen className="h-4 w-4 text-brand-violet" /> Gestionnaire de fichiers
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handle} />
      <input
        ref={fileRef}
        type="file"
        accept={allowPdf ? "image/*,application/pdf" : "image/*"}
        className="hidden"
        onChange={handle}
      />
    </>
  );
}
