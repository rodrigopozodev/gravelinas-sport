import { redirect } from "next/navigation";

/** Una sola vista con P1 y P2 en /opgg. */
export default function OpggPartida2Redirect() {
  redirect("/opgg#partida-2");
}
