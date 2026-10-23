import { useParams } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { SceneImage } from "../components/ui/SceneImage";
import { brand } from "../config/brand";
import { dateShort } from "../lib/format";
import { useApi, useDocumentTitle } from "../lib/hooks";
import type { Post } from "../lib/types";
import NotFound from "./NotFound";

export default function JournalPost() {
  const { slug = "" } = useParams();
  const { data: post, error } = useApi<Post>(`/posts/${slug}`);
  useDocumentTitle(post ? `${post.title} · ${brand.name}` : undefined);
  if (error && !post) return <NotFound />;
  if (!post) return <div className="min-h-screen" role="status" aria-label="Loading" />;
  return (
    <article className="pb-28 pt-40">
      <header className="container-luxe max-w-4xl">
        <p className="eyebrow">{dateShort(post.published_at)} · {post.author}</p>
        <h1 className="mt-5 text-[clamp(2.6rem,6vw,5rem)] leading-[1]">{post.title}</h1>
        <p className="mt-6 text-xl text-stone-300">{post.excerpt}</p>
      </header>
      {post.cover && (
        <div className="container-luxe mt-16">
          <SceneImage src={post.cover} alt="" priority className="aspect-[21/9] rounded-sm" />
        </div>
      )}
      {/* Body HTML is allow-list sanitised server-side (nh3) on every write. */}
      <div className="prose-luxe container-luxe mt-16 max-w-3xl text-lg" dangerouslySetInnerHTML={{ __html: post.body ?? "" }} />
      <div className="container-luxe mt-16 max-w-3xl">
        <ButtonLink to="/journal" variant="quiet" arrow>All articles</ButtonLink>
      </div>
    </article>
  );
}
