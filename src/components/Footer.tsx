import { MapPin, Phone, Mail, Instagram, Twitter, Linkedin, MessageCircle, Facebook, Globe } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="space-y-4">
            <img 
              src="/logo.jpg" 
              alt="Eyüboğlu Logo" 
              className="h-12 w-auto"
            />
            <p className="text-sm text-gray-400">
              Eyüboğlu Eğitim Kurumları Mezunlar Derneği - Mezunlarımız arasında güçlü bir bağ oluşturuyoruz.
            </p>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">İletişim</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  Esenevler Mahallesi Dr. Rüstem Eyüboğlu Sokak No:8<br />
                  Ümraniye / İstanbul
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 flex-shrink-0" />
                <a href="tel:+905403963337" className="text-sm hover:text-white transition-colors">
                  +90 540 396 33 37
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0" />
                <a href="mailto:info@eymeder.com" className="text-sm hover:text-white transition-colors">
                  info@eymeder.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Globe className="h-5 w-5 flex-shrink-0" />
                <a href="https://www.eymeder.com" target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">
                  www.eymeder.com
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Hızlı Erişim</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about/baskanin-mesaji" className="text-sm hover:text-white transition-colors">
                  Başkanın Mesajı
                </Link>
              </li>
              <li>
                <Link href="/about/yonetim-kurulu" className="text-sm hover:text-white transition-colors">
                  Yönetim Kurulu
                </Link>
              </li>
              <li>
                <Link href="/directory" className="text-sm hover:text-white transition-colors">
                  Mezun Dizini
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-sm hover:text-white transition-colors">
                  Etkinlikler
                </Link>
              </li>
              <li>
                <Link href="/fonzip-signup" className="text-sm hover:text-white transition-colors">
                  Üyelik
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Bizi Takip Edin</h3>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/eyuboglumezunlardernegi/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-primary p-3 rounded-full transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://x.com/EyubogluMD"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-primary p-3 rounded-full transition-colors"
                aria-label="Twitter/X"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/eyüboğlu-mezunlar-derneği-578092131/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-primary p-3 rounded-full transition-colors"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="https://wa.me/905403963337"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-[#25D366] p-3 rounded-full transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=100013915756652"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-primary p-3 rounded-full transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Sosyal medyada bizi takip ederek güncel haberlerden haberdar olun!
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Eyüboğlu Eğitim Kurumları Mezunlar Derneği. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}