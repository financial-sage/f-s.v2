"use client";

import { useRef, useState } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  AVATAR_ACCEPT,
  AVATARS_BUCKET,
  avatarObjectPath,
  prepareAvatarFile,
  withAvatarCacheBust,
} from "@/lib/avatar";

type ProfileAvatarEditorProps = {
  userId: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
};

export default function ProfileAvatarEditor({
  userId,
  displayName,
  initials,
  avatarUrl: initialUrl,
}: ProfileAvatarEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    setIsUploading(true);

    try {
      const prepared = await prepareAvatarFile(file);
      const supabase = createClient();
      const path = avatarObjectPath(userId, prepared.type);

      const { error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(path, prepared, {
          upsert: true,
          contentType: prepared.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);

      const nextUrl = withAvatarCacheBust(publicUrl);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: nextUrl } as never)
        .eq("id", userId);

      if (profileError) throw profileError;

      setAvatarUrl(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la foto.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="relative shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-14 w-14 rounded-full object-cover shadow-sm ring-2 ring-glass-border"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-lg font-medium text-on-primary-container shadow-sm ring-2 ring-glass-border">
            {initials}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-glass-border bg-surface-lowest text-on-surface shadow-sm transition hover:bg-glass-strong disabled:opacity-60"
          aria-label="Cambiar foto de perfil"
        >
          {isUploading ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Camera size={14} />
          )}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPT}
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {error ? (
        <p className="max-w-[16rem] text-[11px] font-light text-error">{error}</p>
      ) : null}
    </div>
  );
}
