import { Header } from "../../components/layout/Header";
import { WhatsAppButton } from "../../components/layout/WhatsAppButon";

/**
 * Layout do Route Group (marketing) — Landing Page.
 * O Header fixo e o WhatsAppButton existem SOMENTE neste contexto.
 * O paddingTop compensa o Header fixo de ~84px.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div style={{ paddingTop: "84px" }}>{children}</div>
      <WhatsAppButton />
    </>
  );
}
