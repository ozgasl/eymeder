import { MessageCircle } from "lucide-react";

export function WhatsAppFloating() {
  return (
    <a
      href="https://wa.me/905403963337"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 group"
      aria-label="WhatsApp ile iletişime geç"
    >
      <div className="relative">
        {/* Pulse animation ring */}
        <div className="absolute inset-0 bg-[#25D366] rounded-full opacity-75 animate-ping" />
        
        {/* Main button */}
        <div className="relative bg-[#25D366] hover:bg-[#20BA5A] text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl">
          <MessageCircle className="h-7 w-7" />
        </div>

        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          WhatsApp ile iletişime geç
          <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900" />
        </div>
      </div>
    </a>
  );
}