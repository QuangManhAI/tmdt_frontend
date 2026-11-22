import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { cx, formatDate } from "@/lib/format";
import { getBlogPosts } from "@/lib/server-data";
import { container } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiUnavailable } from "@/components/home/ProductSections";

export const metadata: Metadata = {
  title: "Cẩm nang võ sinh",
  description: "Hướng dẫn thắt đai, giặt và bảo quản võ phục, phân biệt quy cách võ phục các môn võ.",
  alternates: { canonical: "/blog" },
};

async function PostList() {
  const result = await getBlogPosts();
  if (!result.ok) return <ApiUnavailable message="Chưa tải được bài viết. Vui lòng thử lại sau ít giây." />;
  if (result.data.length === 0) return <p className="text-ink-2">Chưa có bài viết nào.</p>;

  return (
    <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
      {result.data.map((post, i) => (
        <li key={post.id} className={cx(i === 0 && "md:col-span-2 lg:col-span-2")}>
          <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-4">
            <div className="overflow-hidden rounded-md bg-muted">
              <Image
                src={post.thumbnail || "/vo-sinh-vovinam.jpg"}
                alt=""
                width={1376}
                height={997}
                sizes={i === 0 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"}
                className={cx("h-auto w-full object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.02]", i === 0 ? "aspect-[16/9]" : "aspect-[4/3]")}
              />
            </div>
            <p className="text-[13px] text-ink-3">
              {post.category}
              {post.created_at ? ` · ${formatDate(post.created_at)}` : ""}
            </p>
            <h2 className={cx("font-semibold tracking-tight text-ink group-hover:underline group-hover:decoration-line-strong group-hover:underline-offset-4", i === 0 ? "text-2xl md:text-3xl" : "text-lg")}>
              {post.title}
            </h2>
            <p className="line-clamp-3 max-w-[65ch] text-sm leading-relaxed text-ink-2">{post.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function BlogPage() {
  return (
    <div className={cx(container, "py-8 lg:py-12")}>
      <h1 className="text-3xl font-semibold tracking-tight text-ink md:text-5xl">Cẩm nang võ sinh</h1>
      <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-ink-2">Kinh nghiệm chọn, mặc và giữ võ phục bền đẹp qua nhiều mùa tập.</p>
      <div className="mt-12">
        <Suspense fallback={<Skeleton className="aspect-[16/9] w-full rounded-md lg:w-2/3" />}>
          <PostList />
        </Suspense>
      </div>
    </div>
  );
}
