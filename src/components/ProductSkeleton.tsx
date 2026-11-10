export default function ProductSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card p-4"><div className="skeleton h-28 w-full" /><div className="skeleton mt-4 h-3 w-1/3" /><div className="skeleton mt-2 h-4 w-2/3" /><div className="skeleton mt-2 h-3 w-full" />
          <div className="mt-6 flex items-center justify-between"><div className="skeleton h-5 w-20" /><div className="skeleton h-9 w-24" /></div></div>))}
    </div>
  );
}
