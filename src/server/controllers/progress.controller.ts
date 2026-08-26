import { ok, err } from "@/server/utils/respond";
import { requireUser } from "@/server/middleware/auth";
import { upsertProgress, getContinueWatching } from "@/server/models/progress.model";
import { getTitleById } from "@/server/models/title.model";

export async function getMyProgressRow() {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to continue watching");
  const items = await getContinueWatching(user.id);
  return ok({
    items: items.map((i) => ({
      ...i.title.toObject(),
      progressRatio: i.progressRatio,
      progressSec: i.positionSec,
    })),
  });
}

export async function saveProgress(req: Request) {
  const user = await requireUser();
  if (!user) return err(401, "Sign in to save progress");

  const body = await req.json().catch(() => null);
  const titleId = String(body?.titleId ?? "");
  const positionSec = Number(body?.positionSec);
  const durationSec = Number(body?.durationSec);

  if (!titleId) return err(400, "titleId is required");
  if (!(positionSec >= 0 && positionSec <= 86400)) return err(400, "Invalid position");
  if (!(durationSec > 0 && durationSec <= 86400)) return err(400, "Invalid duration");

  const title = await getTitleById(titleId);
  if (!title) return err(404, "Title not found");

  await upsertProgress({ userId: user.id, titleId, positionSec, durationSec });
  return ok({ saved: true });
}
