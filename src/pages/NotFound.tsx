import { Link } from "react-router-dom";
export default function NotFound({ what = "Page" }: { what?: string }) {
  return <div className="mx-auto max-w-xl px-4 py-28 text-center"><h1 className="text-3xl font-bold">{what} not found</h1><p className="mt-2 text-mute">It may have moved or no longer exists.</p><Link to="/products" className="btn btn-primary mt-6">Browse products</Link></div>;
}
