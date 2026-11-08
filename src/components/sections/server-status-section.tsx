import { ServerStatusLive } from "@/components/sections/server-status-live";
import { getEnabledServers } from "@/lib/data";

export async function ServerStatusSection() {
  const servers = await getEnabledServers();
  return (
    <section id="servers" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <ServerStatusLive initialServers={servers} />
    </section>
  );
}
