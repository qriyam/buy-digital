import { Link } from "react-router-dom";
import { useT } from "../lib/i18n";
import Seo from "../lib/seo";
export default function NotFound({ what = "Page" }: { what?: string }) {
  const { t } = useT();
  return <div className="mx-auto max-w-xl px-4 py-28 text-center"><Seo title="Not found" path="/404" description="Page not found" noindex /><h1 className="text-3xl font-bold">{what} {t("notFound")}</h1><Link to="/products" className="btn btn-primary mt-6">{t("browse")}</Link></div>;
}
