import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { getBlogPosts } from "@/lib/server-data";
import type { BlogPost } from "@/lib/types";
import { buttonClass, sectionTitle } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { TabbedPanels } from "@/components/home/TabbedPanels";

function PostGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {posts.slice(0, 4).map((post) => (
        <li key={post.id}>
          <Link href={`/blog/${post.slug}`} className="group flex h-full flex-col">
            <div className="overflow-hidden bg-muted">
              <Image
                src={post.thumbnail || "/vo-sinh-vovinam.jpg"}
                alt=""
                width={1376}
                height={997}
                sizes="(min-width: 1024px) 24vw, (min-width: 640px) 48vw, 100vw"
                className="aspect-square h-auto w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
              />
            </div>
            <h3 className="mt-4 line-clamp-2 text-[15px] leading-snug font-semibold text-ink group-hover:text-accent-text">{post.title}</h3>
            <span className="mt-auto inline-flex items-center gap-2 pt-5 text-[15px] font-medium text-ink">
              Xem thêm <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** "Tin tức và cẩm nang": tiêu đề giữa, tab viên thuốc theo chuyên mục, lưới 4 bài viết, nút "Xem tất cả". */
export async function NewsSection() {
  const result = await getBlogPosts();
  if (!result.ok || result.data.length === 0) return null;
  const posts = result.data;
  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))].slice(0, 3);

  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20" aria-labelledby="tin-tuc">
      <h2 id="tin-tuc" className={`${sectionTitle} mb-8 text-center`}>
        Cẩm nang và tin võ thuật
      </h2>
      <TabbedPanels
        tabs={[
          { label: "Bài nổi bật", content: <PostGrid posts={posts} /> },
          ...categories.map((c) => ({ label: c, content: <PostGrid posts={posts.filter((p) => p.category === c)} /> })),
        ]}
      />
      <div className="mt-10 flex justify-center">
        <Link href="/blog" className={buttonClass("dark", "lg", "px-10")}>
          Xem tất cả
        </Link>
      </div>
    </section>
  );
}

export function NewsSectionSkeleton() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 pt-16 sm:px-6 lg:px-8 lg:pt-20" aria-hidden>
      <Skeleton className="mx-auto mb-8 h-9 w-80" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-none" />
        ))}
      </div>
    </section>
  );
}
