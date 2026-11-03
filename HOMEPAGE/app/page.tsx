import Backdrop from "@/components/Backdrop";
import DebugAvatar from "@/components/avatar/DebugAvatar";
import RaraApp from "@/components/RaraApp";
import { getRaraConfig } from "@/lib/raraConfig";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { debugAvatar } = await searchParams;
  const { leadRules, knowledge } = getRaraConfig();
  const whatsapp = { number: leadRules.whatsappCsNumber, prefill: leadRules.whatsappPrefillTemplate };
  const products = knowledge.categories.map(({ id, name, items, heroIngredients, moqNote }) => ({ id, name, items, heroIngredients, moqNote }));
  return (
    <main className="page">
      <Backdrop />
      <header className="topbar">
        <span className="logo">HARAKA ERFI</span>
      </header>
      {debugAvatar === "1" ? (
        <section className="stage">
          <div className="avatar-slot"><DebugAvatar /></div>
        </section>
      ) : (
        <RaraApp whatsapp={whatsapp} products={products} />
      )}
    </main>
  );
}
