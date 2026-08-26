import { ok, err } from "@/server/utils/respond";
import { requireUser } from "@/server/middleware/auth";
import { addToWatchlist, getWatchlist, removeFromWatchlist } from "@/server/models/list.model";
import { getTitleById } from "@/server/models/title.model";

export async function getMyList() {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to view your list");
  return ok({ titles: await getWatchlist(user.id) });
}

export async function addToMyList(req: Request) {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to save titles");

  const body = await req.json().catch(() => null);
  const titleId = String(body?.titleId ?? "");
  if (!titleId) return err(400, "titleId is required");

  const title = await getTitleById(titleId);
  if (!title) return err(404, "Title not found");

  await addToWatchlist(user.id, titleId);
  return ok({ added: titleId }, { status: 201 });
}

export async function removeFromMyList(titleIdRaw: string) {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to edit your list");
  if (!titleIdRaw) return err(400, "Invalid title id");

  await removeFromWatchlist(user.id, titleIdRaw);
  return ok({ removed: titleIdRaw });
}
