import { ChevronRight } from "lucide-react";

export default function PageCrumbs({
  title,
  icon,
  href,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <div className="flex gap-2 items-center font-semibold text-lg">
      <a
        href={href}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {icon}
      </a>
      <ChevronRight />
      {title}
    </div>
  );
}
