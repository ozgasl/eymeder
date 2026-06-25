import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "tr" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  tr: {
    // Navigation
    nav: {
      home: "Ana Sayfa",
      directory: "Mezun Dizini",
      messages: "Mesajlar",
      events: "Etkinlikler",
      membership: "Üyelik Başvurusu",
      profile: "Profil",
      signout: "Çıkış Yap",
      admin: "Admin Panel",
    },
    
    // Home
    "home.welcome": "Hoş Geldiniz",
    "home.subtitle": "Mezunlar Derneği Ağınızı Keşfedin",
    "home.stats.members": "Üye",
    "home.stats.messages": "Mesaj",
    "home.stats.events": "Etkinlik",
    "home.stats.connections": "Bağlantı",
    "home.quickActions": "Hızlı Erişim",
    "home.findAlumni": "Mezun Bul",
    "home.findAlumni.desc": "Mezunlar arasında ara",
    "home.sendMessage": "Mesaj Gönder",
    "home.sendMessage.desc": "Yeni bir sohbet başlat",
    "home.viewEvents": "Etkinliklere Göz At",
    "home.viewEvents.desc": "Yaklaşan etkinlikleri keşfet",
    "home.applyMembership": "Üyelik Başvurusu",
    "home.applyMembership.desc": "Derneğe katıl",
    
    // Profile
    "profile.title": "Profilim",
    "profile.edit": "Profili Düzenle",
    "profile.save": "Kaydet",
    "profile.cancel": "İptal",
    "profile.saving": "Kaydediliyor...",
    "profile.stats.totalPoints": "Toplam Puan",
    "profile.stats.badges": "Rozet",
    "profile.stats.level": "Seviye",
    "profile.stats.rank": "Rütbe",
    "profile.earnedBadges": "Kazanılan Rozetler",
    "profile.fullName": "Ad Soyad",
    "profile.phone": "Telefon",
    "profile.graduationYear": "Mezuniyet Yılı",
    "profile.department": "Bölüm",
    "profile.profession": "Meslek",
    "profile.company": "Şirket",
    "profile.city": "Şehir",
    "profile.bio": "Hakkımda",
    "profile.bio.placeholder": "Kendinizi tanıtın...",
    "profile.success": "Başarılı",
    "profile.success.message": "Profiliniz güncellendi.",
    "profile.error": "Hata",
    "profile.error.message": "Profil güncellenemedi. Lütfen tekrar deneyin.",
    "profile.avatar.success": "Profil fotoğrafınız güncellendi.",
    "profile.avatar.error": "Profil fotoğrafı yüklenemedi.",
    
    // Directory
    "directory.title": "Mezunlar Rehberi",
    "directory.search": "Mezun ara...",
    "directory.filter.all": "Tüm Mezunlar",
    "directory.filter.year": "Mezuniyet Yılı",
    "directory.filter.department": "Bölüm",
    "directory.filter.city": "Şehir",
    "directory.filter.profession": "Meslek",
    "directory.viewProfile": "Profili Görüntüle",
    "directory.sendMessage": "Mesaj Gönder",
    "directory.connect": "Bağlan",
    "directory.noResults": "Sonuç bulunamadı",
    "directory.noResults.message": "Arama kriterlerinize uygun mezun bulunamadı.",
    
    // Messages
    "messages.title": "Mesajlar",
    "messages.selectConversation": "Mesajlaşmaya Başlayın",
    "messages.selectConversation.message": "Sol taraftan bir sohbet seçin veya yeni bir mesaj gönderin.",
    "messages.typeMessage": "Mesajınızı yazın...",
    "messages.send": "Gönder",
    "messages.noConversations": "Henüz mesajınız yok",
    "messages.noConversations.message": "Mezunlar dizininden bağlantılarınıza mesaj gönderin.",
    
    // Auth
    "auth.login.title": "Giriş Yap",
    "auth.login.subtitle": "Mezunlar ağınıza erişin",
    "auth.login.email": "E-posta",
    "auth.login.membershipNumber": "Üyelik Numarası (8 hane)",
    "auth.login.password": "Şifre",
    "auth.login.submit": "Giriş Yap",
    "auth.login.noAccount": "Hesabınız yok mu?",
    "auth.login.signup": "Kayıt Ol",
    
    "auth.signup.title": "Kayıt Ol",
    "auth.signup.subtitle": "Mezunlar ağına katılın",
    "auth.signup.fullName": "Ad Soyad",
    "auth.signup.phone": "Telefon (Opsiyonel)",
    "auth.signup.submit": "Kayıt Ol",
    "auth.signup.hasAccount": "Zaten hesabınız var mı?",
    "auth.signup.login": "Giriş Yap",
    
    // Fonzip
    "fonzip.membership.title": "Üyelik Başvurusu",
    "fonzip.membership.description": "Derneğimize katılmak için başvuru formunu doldurun.",
    "fonzip.events.title": "Etkinlikler",
    "fonzip.events.description": "Yaklaşan etkinliklerimize göz atın ve kayıt olun.",
  },
  en: {
    // Navigation
    nav: {
      home: "Home",
      directory: "Alumni Directory",
      messages: "Messages",
      events: "Events",
      membership: "Membership Application",
      profile: "Profile",
      signout: "Sign Out",
      admin: "Admin Panel",
    },
    
    // Home
    "home.welcome": "Welcome",
    "home.subtitle": "Explore Your Alumni Network",
    "home.stats.members": "Members",
    "home.stats.messages": "Messages",
    "home.stats.events": "Events",
    "home.stats.connections": "Connections",
    "home.quickActions": "Quick Actions",
    "home.findAlumni": "Find Alumni",
    "home.findAlumni.desc": "Search through our alumni",
    "home.sendMessage": "Send Message",
    "home.sendMessage.desc": "Start a new conversation",
    "home.viewEvents": "Browse Events",
    "home.viewEvents.desc": "Discover upcoming events",
    "home.applyMembership": "Membership Application",
    "home.applyMembership.desc": "Join our association",
    
    // Profile
    "profile.title": "My Profile",
    "profile.edit": "Edit Profile",
    "profile.save": "Save",
    "profile.cancel": "Cancel",
    "profile.saving": "Saving...",
    "profile.stats.totalPoints": "Total Points",
    "profile.stats.badges": "Badges",
    "profile.stats.level": "Level",
    "profile.stats.rank": "Rank",
    "profile.earnedBadges": "Earned Badges",
    "profile.fullName": "Full Name",
    "profile.phone": "Phone",
    "profile.graduationYear": "Graduation Year",
    "profile.department": "Department",
    "profile.profession": "Profession",
    "profile.company": "Company",
    "profile.city": "City",
    "profile.bio": "About Me",
    "profile.bio.placeholder": "Tell us about yourself...",
    "profile.success": "Success",
    "profile.success.message": "Your profile has been updated.",
    "profile.error": "Error",
    "profile.error.message": "Failed to update profile. Please try again.",
    "profile.avatar.success": "Your profile photo has been updated.",
    "profile.avatar.error": "Failed to upload profile photo.",
    
    // Directory
    "directory.title": "Alumni Directory",
    "directory.search": "Search alumni...",
    "directory.filter.all": "All Alumni",
    "directory.filter.year": "Graduation Year",
    "directory.filter.department": "Department",
    "directory.filter.city": "City",
    "directory.filter.profession": "Profession",
    "directory.viewProfile": "View Profile",
    "directory.sendMessage": "Send Message",
    "directory.connect": "Connect",
    "directory.noResults": "No results found",
    "directory.noResults.message": "No alumni found matching your search criteria.",
    
    // Messages
    "messages.title": "Messages",
    "messages.selectConversation": "Start Messaging",
    "messages.selectConversation.message": "Select a conversation from the left or send a new message.",
    "messages.typeMessage": "Type your message...",
    "messages.send": "Send",
    "messages.noConversations": "No conversations yet",
    "messages.noConversations.message": "Send messages to your connections from the alumni directory.",
    
    // Auth
    "auth.login.title": "Sign In",
    "auth.login.subtitle": "Access your alumni network",
    "auth.login.email": "Email",
    "auth.login.membershipNumber": "Membership Number (8 digits)",
    "auth.login.password": "Password",
    "auth.login.submit": "Sign In",
    "auth.login.noAccount": "Don't have an account?",
    "auth.login.signup": "Sign Up",
    
    "auth.signup.title": "Sign Up",
    "auth.signup.subtitle": "Join the alumni network",
    "auth.signup.fullName": "Full Name",
    "auth.signup.phone": "Phone (Optional)",
    "auth.signup.submit": "Sign Up",
    "auth.signup.hasAccount": "Already have an account?",
    "auth.signup.login": "Sign In",
    
    // Fonzip
    "fonzip.membership.title": "Membership Application",
    "fonzip.membership.description": "Fill out the application form to join our association.",
    "fonzip.events.title": "Events",
    "fonzip.events.description": "Browse and register for our upcoming events.",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("tr");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && (saved === "tr" || saved === "en")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}