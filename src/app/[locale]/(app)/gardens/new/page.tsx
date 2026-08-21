import { getTranslations, setRequestLocale } from "next-intl/server";
import { GardenForm } from "@/components/garden/garden-form";

export default async function NewGardenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("garden");

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4">
      <h1 className="text-2xl font-semibold">{t("create")}</h1>
      <GardenForm />
    </section>
  );
}
