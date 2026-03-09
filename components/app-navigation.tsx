"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavigationMenu } from "radix-ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/archive", label: "Archive" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b border-(--border) bg-(--background)/90">
      <div className="mx-auto w-full max-w-7xl px-6">
        <NavigationMenu.Root className="w-full">
          <NavigationMenu.List className="flex min-h-14 items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <NavigationMenu.Item key={item.href}>
                  <NavigationMenu.Link asChild active={isActive}>
                    <Link
                      href={item.href}
                      className={`inline-flex rounded-md px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-(--accent) text-(--textdark)"
                          : "text-(--textmain) hover:text-white"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenu.Link>
                </NavigationMenu.Item>
              );
            })}
          </NavigationMenu.List>
        </NavigationMenu.Root>
      </div>
    </div>
  );
}
