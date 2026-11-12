import { useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { prepareImage, type Prepared } from "../lib/image";

type Opts = { maxDim?: number; keepAlpha?: boolean };
type PickProps = { onPick: (items: Prepared[]) => void; onError?: (msg: string) => void; multiple?: boolean; busy?: boolean; opts?: Opts };

// The "+" tile. Clicking it opens the phone/computer gallery; files can also be dropped on it.
export function PlusTile({ onPick, onError, multiple = false, busy = false, opts, className = "h-24 w-24", label }: PickProps & { className?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false), [working, setWorking] = useState(false);
  const handle = async (list: FileList | File[] | null) => {
    const files = Array.from(list ?? []).slice(0, multiple ? 10 : 1); if (!files.length) return;
    setWorking(true);
    try { onPick(await Promise.all(files.map((f) => prepareImage(f, opts)))); } catch (e) { onError?.((e as Error).message); }
    setWorking(false); if (input.current) input.current.value = "";
  };
  const spin = busy || working;
  return (
    <>
      <button type="button" disabled={spin} onClick={() => input.current?.click()} aria-label={label ?? "Add photo"}
        onDragOver={(e: DragEvent) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e: DragEvent) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files); }}
        className={`group flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed text-mute transition duration-200 disabled:opacity-60 ${drag ? "border-brand bg-brand/10 text-brand" : "border-line bg-soft hover:border-brand hover:bg-brand/5 hover:text-brand"} ${className}`}>
        {spin ? <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-sm transition group-hover:scale-110 group-hover:shadow-md"><ImagePlus className="h-5 w-5" aria-hidden /></span>}
        <span className="px-1 text-center text-[11px] font-medium leading-tight">{spin ? "Uploading…" : label ?? "Add photo"}</span>
      </button>
      <input ref={input} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => void handle(e.target.files)} />
    </>
  );
}

export type GridImage = { id: string; url: string; staged?: boolean };
// Several photos: thumbnails (first one is the main photo) plus a "+" tile.
export function ImageGrid({ images, onPick, onRemove, onMakeMain, onError, busy, max = 8 }: { images: GridImage[]; onRemove: (img: GridImage) => void; onMakeMain?: (img: GridImage) => void; max?: number } & Omit<PickProps, "multiple">) {
  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {images.map((im, i) => (
        <div key={im.id} className="group relative h-24 w-24 overflow-hidden rounded-2xl border border-line bg-white">
          <img src={im.url} alt="" className="h-full w-full object-contain p-1" />
          {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-white">Main</span>}
          {im.staged && <span className="absolute bottom-1 left-1 rounded-full bg-ink/80 px-1.5 py-0.5 text-[9px] text-white">Not saved</span>}
          <button type="button" onClick={() => onRemove(im)} aria-label="Remove photo" className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-ink shadow transition hover:bg-brand hover:text-white"><X className="h-3.5 w-3.5" /></button>
          {i > 0 && onMakeMain && <button type="button" onClick={() => onMakeMain(im)} aria-label="Make main photo" className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-ink opacity-100 shadow transition hover:bg-brand hover:text-white sm:opacity-0 sm:group-hover:opacity-100"><Star className="h-3.5 w-3.5" /></button>}
        </div>))}
      {images.length < max && <PlusTile multiple onPick={onPick} onError={onError} busy={busy} label={images.length ? "Add more" : "Add photos"} />}
    </div>
  );
}

// One photo (logo, category image…): shows a preview with Change/Remove, or the "+" tile when empty.
export function SingleImage({ url, onPick, onRemove, onError, busy, opts, label, className = "h-24 w-24" }: { url?: string | null; onRemove: () => void; label?: string; className?: string } & Omit<PickProps, "multiple" | "onPick"> & { onPick: (p: Prepared) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const change = async (f?: File) => { if (!f) return; setWorking(true); try { onPick(await prepareImage(f, opts)); } catch (e) { onError?.((e as Error).message); } setWorking(false); if (input.current) input.current.value = ""; };
  if (!url) return <PlusTile className={className} label={label} busy={busy} opts={opts} onError={onError} onPick={(a) => onPick(a[0])} />;
  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-line bg-white ${className}`}>
      <img src={url} alt="" className="h-full w-full object-contain p-1" />
      {(busy || working) && <div className="absolute inset-0 grid place-items-center bg-white/70"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <button type="button" onClick={() => input.current?.click()} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold">Change</button>
        <button type="button" onClick={onRemove} className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-brand">Remove</button>
      </div>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void change(e.target.files?.[0])} />
    </div>
  );
}
