import type { EditorSession } from "@react-fabrio/core";

const sessionUrls = new WeakMap<EditorSession, Set<string>>();
export const retainAssetUrl = (session: EditorSession, url: string) => {
  let urls = sessionUrls.get(session);
  if (!urls) sessionUrls.set(session, (urls = new Set()));
  urls.add(url);
};
export const releaseAssetUrls = (session: EditorSession) => {
  sessionUrls.get(session)?.forEach((url) => URL.revokeObjectURL(url));
  sessionUrls.delete(session);
};
