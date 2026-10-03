import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FilaxQR } from "@/components/filax/qr";

export const Route = createFileRoute("/user/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.username} sur FILAX` },
      { name: "description", content: "Rejoins-moi sur Filax pour gérer notre épargne ensemble !" },
      { property: "og:title", content: `${params.username} sur FILAX` },
      { property: "og:description", content: "Rejoins-moi sur Filax pour gérer notre épargne ensemble !" },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicProfile,
});

function PublicProfile() {
  const { username } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data } = await supabase.rpc("public_profile", { _username: username });
      return data?.[0] ?? null;
    },
  });
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6 text-center text-foreground">
      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : !data ? (
        <p className="text-muted-foreground">Profil introuvable</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{data.first_name} {data.last_name}</h1>
          <p className="text-sm text-muted-foreground">{data.filax_id}</p>
          <FilaxQR value={data.filax_id ?? username} />
          <p className="max-w-xs text-sm">Rejoins-moi sur Filax pour gérer notre épargne ensemble !</p>
        </>
      )}
      <Link to="/inscription" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Rejoindre FILAX</Link>
    </main>
  );
}
