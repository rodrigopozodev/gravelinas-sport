import { HomeView } from "@/components/gravelinas/HomeView";
import { getTeamSnapshot } from "@/lib/gravelinas/syncTeam";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getTeamSnapshot({ trigger: "page" });

  return <HomeView data={data} />;
}
