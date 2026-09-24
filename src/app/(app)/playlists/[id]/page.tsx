import { PlaylistDetailClient } from "@/components/PlaylistDetailClient";

export const metadata = { title: "Playlist - Favorite Songs" };

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlaylistDetailClient playlistId={id} />;
}
