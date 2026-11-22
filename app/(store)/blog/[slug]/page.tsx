import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cx, formatDate } from "@/lib/format";
import { getBlogPost } from "@/lib/server-data";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { SITE_BASE_URL } from "@/lib/api";
import { buttonClass, container } from "@/components/ui/styles";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiUnavailable } from "@/components/home/ProductSections";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getBlogPost(slug);
  if (!result.ok) return { title: "Cẩm nang võ sinh" };
  return {
    title: result.data.title,
    description: result.data.summary,
    alternates: { canonical: `/blog/${result.data.slug}` },
    openGraph: { type: "article", title: result.data.title, images: [{ url: result.data.thumbnail || "/banner-bieu-dien.jpg" }] },
  };
}

async function Article({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  const { slug } = await params;
  const result = await getBlogPost(slug);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <ApiUnavailable message="Chưa tải được bài viết. Vui lòng thử lại sau ít giây." />;
  }
  const post = result.data;
  const paragraphs = (post.content || post.summary).split(/\n{2,}|\r\n\r\n/).filter(Boolean);

  const cover = absoluteUrl(post.thumbnail || "/banner-bieu-dien.jpg");
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    image: [cover],
    datePublished: post.created_at || undefined,
    dateModified: post.created_at || undefined,
    inLanguage: "vi-VN",
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    author: { "@type": "Organization", name: "VÕ SPORT", url: `${SITE_BASE_URL}/` },
    publisher: { "@id": `${SITE_BASE_URL}/#store` },
  };

  return (
    <article>
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbJsonLd([["Trang chủ", "/"], ["Cẩm nang võ sinh", "/blog"], [post.title, `/blog/${post.slug}`]])} />
      <header className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-ink-3 hover:text-ink">
          Cẩm nang võ sinh
        </Link>
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-ink md:text-5xl">{post.title}</h1>
        <p className="mt-4 text-sm text-ink-3">
          {post.category}
          {post.created_at ? ` · ${formatDate(post.created_at)}` : ""}
        </p>
      </header>
      <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-md bg-muted">
        <Image src={post.thumbnail || "/banner-bieu-dien.jpg"} alt="" width={1432} height={593} preload sizes="(min-width: 1024px) 64rem, 100vw" className="aspect-[16/9] h-auto w-full object-cover" />
      </div>
      <div className="mx-auto mt-10 flex max-w-[68ch] flex-col gap-5 text-[17px] leading-[1.75] text-ink-2">
        <p className="text-lg leading-relaxed font-medium text-ink">{post.summary}</p>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-[68ch] flex-wrap gap-3 border-t border-line pt-8">
        <Link href="/size-guide" className={buttonClass("dark", "md")}>
          Tư vấn size
        </Link>
        <Link href="/blog" className={buttonClass("secondary", "md")}>
          Bài viết khác
        </Link>
      </div>
    </article>
  );
}

export default function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <div className={cx(container, "py-8 lg:py-12")}>
      <Suspense
        fallback={
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-6 aspect-[16/9] w-full rounded-md" />
          </div>
        }
      >
        <Article params={params} />
      </Suspense>
    </div>
  );
}
