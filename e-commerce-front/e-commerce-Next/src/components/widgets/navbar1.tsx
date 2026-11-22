"use client";

import { Cctv, Heart, LogOut, Menu, Search, ShoppingCart, User as UserIcon, X } from "lucide-react";
import { useContext, useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { User } from "@/contexts/UserContext";
import Cookies from "js-cookie";
import api from "@/lib/api";
import { getLocalizedField, type Locale } from "@/lib/locale";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/base/accordion";
import { Button } from "@/components/base/button";
import { Input } from "@/components/base/input";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/base/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/base/sheet";
import { LocaleSwitcher } from "@/components/widgets/locale-switcher";
import { ModeToggle } from "@/components/widgets/mode-toggle";
import { TopUtilityBar } from "@/components/widgets/top-utility-bar";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
}

interface Navbar1Props {
  className?: string;
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
    className?: string;
  };
  menu?: MenuItem[];
  auth?: {
    login: {
      title: string;
      url: string;
    };
    signup: {
      title: string;
      url: string;
    };
  };
}

const BrandLogo = ({
  logo,
  locale,
}: {
  logo: { url: string; src: string; alt: string; title: string };
  locale: string;
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={logo.url} className="flex items-center gap-2.5 group shrink-0">
      {logo.src && !imgError ? (
        <div className="relative size-10 rounded-xl overflow-hidden flex items-center justify-center bg-card border border-border shadow-xs">
          <Image
            src={logo.src}
            alt={logo.alt}
            width={40}
            height={40}
            unoptimized={logo.src.endsWith(".svg")}
            className="size-10 object-contain p-0.5 transition-transform duration-200 group-hover:scale-105"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#101D35] to-[#2563EB] text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
          <Cctv className="size-5 text-white" />
        </div>
      )}
      <div className="flex flex-col text-start">
        <span className="font-bold text-base md:text-lg tracking-tight text-foreground leading-tight">
          الحارث الذكي
        </span>
        <span className="text-[11px] font-medium text-muted-foreground leading-none">
          {locale === "ar" ? "لكاميرات المراقبة" : "CCTV & Security"}
        </span>
      </div>
    </Link>
  );
};

const Navbar1 = ({
  logo = {
    url: "/",
    src: "/logo.svg",
    alt: "الحارث الذكي",
    title: "الحارث الذكي",
  },
  menu: menuProp,
  auth = {
    login: { title: "Login", url: "/login" },
    signup: { title: "Sign up", url: "/signup" },
  },
  className,
}: Navbar1Props) => {
  const t = useTranslations("nav");
  const locale = useLocale();
  const { userToken, userData, setUserToken, setUserData, setUserRole } = useContext(User)!;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    api
      .get("/category")
      .then((res) => {
        const data = res.data?.data || res.data;
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const isLoggedIn = mounted && !!userToken && !!userData;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`);
      setSearchQuery("");
    }
  };

  const getLocaleName = (item: any) =>
    getLocalizedField(item, "name", locale as Locale) || item.name || "";

  const menu = menuProp ?? [
    { title: t("home"), url: "/" },
    {
      title: t("shop"),
      url: "/products",
      items: [
        { title: t("all"), url: "/products", isAll: true },
        ...categories.map((cat: any) => ({
          title: getLocaleName(cat),
          url: `/products?category=${cat._id || cat.id}`,
          isAll: false,
        })),
      ],
    },
    { title: t("contactUs"), url: "/contact" },
  ];

  const handleLogout = () => {
    setUserToken(null);
    setUserData(null);
    setUserRole(null);
    Cookies.remove("refreshToken");
    router.push("/");
  };

  return (
    <header className={cn("sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border shadow-xs", className)}>
      <TopUtilityBar />

      <div className="container mx-auto px-4 py-3">
        {/* Desktop Menu */}
        <nav className="hidden items-center justify-between gap-4 lg:flex">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6">
            <BrandLogo logo={logo} locale={locale} />
            <NavigationMenu>
              <NavigationMenuList>
                {menu.map((item) => renderMenuItem(item))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative flex-1 max-w-md mx-4">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef as any}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search")}
              className="w-full ps-9 pe-8 h-10 rounded-lg bg-muted/50 focus:bg-background border-border transition-colors text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </form>

          {/* Actions & Profile */}
          <div className="flex items-center gap-2 shrink-0">
            <ModeToggle />
            <LocaleSwitcher />
            <CartIcon />
            <WishlistIcon />
            {isLoggedIn ? (
              <>
                <Button size="sm" render={<Link href="/profile" />} nativeButton={false}>
                  <UserIcon className="size-4" />
                  {userData?.name || t("profile")}
                </Button>
                <Button size="sm" variant="outline" onClick={handleLogout}>
                  <LogOut className="size-4" />
                  {t("logout")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" render={<Link href={auth.login.url} />} nativeButton={false}>
                  {t("login")}
                </Button>
                <Button size="sm" render={<Link href={auth.signup.url} />} nativeButton={false}>
                  {t("signup")}
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <BrandLogo logo={logo} locale={locale} />
            <div className="flex items-center gap-1.5">
              <CartIcon />
              <WishlistIcon />
              <Sheet>
                <SheetTrigger render={<Button variant="outline" size="icon" />}>
                  <Menu className="size-4" />
                </SheetTrigger>
                <SheetContent className="overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>
                      <BrandLogo logo={logo} locale={locale} />
                    </SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-6 p-4">
                    <form onSubmit={handleSearch} className="relative">
                      <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t("search")}
                        className="w-full ps-9 h-10"
                      />
                    </form>

                    <Accordion className="flex w-full flex-col gap-4">
                      {menu.map((item) => renderMobileMenuItem(item))}
                    </Accordion>

                    <div className="flex flex-col gap-3 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <ModeToggle />
                        <LocaleSwitcher />
                      </div>
                      {isLoggedIn ? (
                        <>
                          <Button render={<Link href="/profile" />} nativeButton={false}>
                            <UserIcon className="size-4" />
                            {userData?.name || t("profile")}
                          </Button>
                          <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="size-4" />
                            {t("logout")}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" render={<Link href={auth.login.url} />} nativeButton={false}>
                            {t("login")}
                          </Button>
                          <Button render={<Link href={auth.signup.url} />} nativeButton={false}>
                            {t("signup")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="text-sm font-medium">{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 w-max max-w-[calc(100vw-2rem)]">
            {item.items.map((subItem: any) => (
              <NavigationMenuLink
                key={subItem.title}
                href={subItem.url}
                className={`text-sm font-medium hover:text-primary transition-colors ${subItem.isAll ? "text-primary font-semibold" : ""}`}
              >
                {subItem.title}
              </NavigationMenuLink>
            ))}
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink
        href={item.url}
        className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-accent-foreground"
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2 flex flex-col gap-2">
          {item.items.map((subItem: any) => (
            <Link
              key={subItem.title}
              href={subItem.url}
              className={`text-sm font-medium hover:text-primary transition-colors ${subItem.isAll ? "text-primary font-semibold" : ""}`}
            >
              {subItem.title}
            </Link>
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <Link key={item.title} href={item.url} className="text-md font-semibold">
      {item.title}
    </Link>
  );
};

const CartIcon = () => {
  const { itemCount } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <Link
      href="/cart"
      className="relative flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted text-foreground"
    >
      <ShoppingCart className="size-5" />
      {mounted && itemCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Link>
  );
};

const WishlistIcon = () => {
  const { items } = useWishlist();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return (
    <Link
      href="/wishlist"
      className="relative flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-muted text-foreground"
    >
      <Heart className="size-5" />
      {mounted && items.length > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
          {items.length > 9 ? "9+" : items.length}
        </span>
      )}
    </Link>
  );
};

export { Navbar1 };
