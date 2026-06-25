import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { authService } from "@/services/authService";
import { notificationService } from "@/services/notificationService";
import { Bell, LogOut, User, Menu, X, ChevronDown, Instagram, Twitter, Linkedin, MessageCircle, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function Navigation() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadUnreadCount();
      
      const channel = notificationService.subscribeToNotifications(user.id, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const loadUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const loadNotifications = async () => {
    const { data } = await notificationService.getMyNotifications();
    if (data) setNotifications(data);
  };

  const loadUnreadCount = async () => {
    const { count } = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  const handleSignOut = async () => {
    await authService.signOut();
    router.push("/auth/login");
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await notificationService.markAsRead(notification.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    }
    if (notification.link) {
      router.push(notification.link);
      setNotifOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (!user) {
    return null;
  }

  const aboutItems = [
    { href: "https://eymeder.com/baskanin-mesaji", label: "Başkanın Mesajı", external: true },
    { href: "https://eymeder.com/yonetim-kurulu", label: "Yönetim Kurulu", external: true },
  ];

  const membershipItems = [
    { href: "http://eymeder.com/neden-uye-olmaliyim", label: "Neden Üye Olmalıyım?", external: true },
    { href: "https://fonzip.com/eymeder/form/uyelik-basvuru-formu", label: "Üyelik Başvuru", external: true },
    { href: "https://fonzip.com/eymeder/odeme", label: "Aidat Öde", external: true },
    { href: "https://fonzip.com/eymeder/bagis-yap", label: "Bağış Yap", external: true },
  ];

  return (
    <nav className="border-b bg-card sticky top-0 z-50 shadow-sm" role="navigation" aria-label="Ana navigasyon">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo - Left Side */}
        <Link href="/" className="flex items-center flex-shrink-0" aria-label="Ana sayfaya dön">
          <img 
            src="/logo.jpg" 
            alt="Eyüboğlu Mezunlar Derneği logosu" 
            className="h-14 w-auto"
            onError={(e) => {
              console.error("Logo yüklenemedi");
              e.currentTarget.style.display = "none";
            }}
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6 flex-1 justify-center" role="menubar">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Ana Sayfa
          </Link>
          
          {/* Hakkımızda Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1"
                aria-label="Hakkımızda menüsü"
                aria-haspopup="true"
              >
                Hakkımızda
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" role="menu">
              {aboutItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <a 
                    href={item.href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                    role="menuitem"
                  >
                    {item.label}
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/store" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Mezun Store
          </Link>
          <Link href="/directory" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Üyeler
          </Link>
          <Link href="/brands" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            İndirimli Markalar
          </Link>
          <NavigationMenuItem>
            <Link
              href="/events"
              className={cn(
                "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "text-base",
                router.pathname === "/events" && "bg-accent text-accent-foreground"
              )}
              aria-current={router.pathname === "/events" ? "page" : undefined}
            >
              Etkinlikler
            </Link>
          </NavigationMenuItem>
          <Link href="/jobs" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            EYB IK
          </Link>
          <Link href="/gallery" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Galeri
          </Link>
          <Link href="/news" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Haberler
          </Link>
          <Link href="/testimonials" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Başarı Hikayeleri
          </Link>
          <Link href="/groups" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Gruplar
          </Link>
          <Link href="/mentorship" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Mentorluk
          </Link>
          <Link href="/messages" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Mesajlar
          </Link>
          
          {/* Üyelik Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" aria-label="Üyelik menüsü" aria-haspopup="true">
              Üyelik
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64" role="menu">
              {membershipItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  {item.external ? (
                    <a 
                      href={item.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="cursor-pointer"
                      role="menuitem"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link href={item.href} className="cursor-pointer" role="menuitem">
                      {item.label}
                    </Link>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <>
              <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors hidden lg:block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
                Admin
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </Button>

          {user && (
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label={`Bildirimler${unreadCount > 0 ? `, ${unreadCount} okunmamış` : ""}`}
                  aria-haspopup="true"
                  aria-expanded={notifOpen}
                >
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      aria-label={`${unreadCount} okunmamış bildirim`}
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" role="dialog" aria-label="Bildirimler">
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold" id="notifications-heading">Bildirimler</h3>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllRead} aria-label="Tüm bildirimleri okundu işaretle">
                      Tümünü Okundu İşaretle
                    </Button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto" role="list" aria-labelledby="notifications-heading">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground" role="listitem">
                      Henüz bildiriminiz yok
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary ${
                          !notif.is_read ? "bg-primary/5" : ""
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleNotificationClick(notif);
                          }
                        }}
                        tabIndex={0}
                        role="listitem"
                        aria-label={`${notif.title}, ${notif.message}${!notif.is_read ? ", okunmadı" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-sm text-muted-foreground">{notif.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notif.created_at), { 
                                addSuffix: true,
                                locale: tr 
                              })}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" aria-label="Okunmadı" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-10 w-10 rounded-full focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={`Kullanıcı menüsü: ${user?.email}`}
                aria-haspopup="true"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.user_metadata?.avatar_url} alt={`${user?.email} profil resmi`} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" role="menu">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")} role="menuitem">
                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                Profilim
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} role="menuitem">
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                Çıkış Yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-card" id="mobile-menu" role="menu" aria-label="Mobil navigasyon">
          <div className="container py-4 space-y-3">
            <Link 
              href="/" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Ana Sayfa
            </Link>
            
            <div className="space-y-1">
              <div className="px-4 py-2 text-sm font-medium text-muted-foreground" role="presentation">Hakkımızda</div>
              {aboutItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-8 py-2 hover:bg-muted rounded-md transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={() => setMobileMenuOpen(false)}
                  role="menuitem"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <Link 
              href="/store" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Mezun Store
            </Link>
            <Link 
              href="/directory" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Üyeler
            </Link>
            <Link 
              href="/brands" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              İndirimli Markalar
            </Link>
            <Link 
              href="/events" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Etkinlikler
            </Link>
            <Link 
              href="/jobs" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              EYB IK
            </Link>
            <Link 
              href="/gallery" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Galeri
            </Link>
            <Link 
              href="/news" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Haberler
            </Link>
            <Link 
              href="/testimonials" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Başarı Hikayeleri
            </Link>
            <Link 
              href="/groups" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Gruplar
            </Link>
            <Link 
              href="/mentorship" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Mentorluk
            </Link>
            <Link 
              href="/messages" 
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Mesajlar
            </Link>

            <div className="space-y-1">
              <div className="px-4 py-2 text-sm font-semibold text-muted-foreground" role="presentation">Üyelik</div>
              {membershipItems.map((item) => (
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block pl-8 pr-4 py-2 text-sm hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={() => setMobileMenuOpen(false)}
                    role="menuitem"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block pl-8 pr-4 py-2 text-sm hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={() => setMobileMenuOpen(false)}
                    role="menuitem"
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </div>

            <div className="space-y-1">
              <Link 
                href="/admin" 
                className="block px-4 py-2 hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}