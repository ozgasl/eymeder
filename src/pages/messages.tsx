import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { authService } from "@/services/authService";
import { messageService, type Message, type ConversationPreview } from "@/services/messageService";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MessagesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedPartnerId) {
      loadConversation();
      subscribeToNewMessages();
    }
  }, [selectedPartnerId]);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    setUser(currentUser);
    loadConversations();
  };

  const loadConversations = async () => {
    const { data } = await messageService.getConversations();
    setConversations(data || []);
    setLoading(false);
  };

  const loadConversation = async () => {
    if (!selectedPartnerId) return;

    const { data } = await messageService.getConversation(selectedPartnerId);
    setMessages(data || []);
    await messageService.markAsRead(selectedPartnerId);
  };

  const subscribeToNewMessages = () => {
    if (!selectedPartnerId || !user) return;

    const channel = messageService.subscribeToMessages(user.id, selectedPartnerId, (message) => {
      setMessages((prev) => [...prev, message]);
      messageService.markAsRead(selectedPartnerId);
    });

    return () => {
      channel?.unsubscribe();
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPartnerId) return;

    setSending(true);
    const { data, error } = await messageService.sendMessage(selectedPartnerId, newMessage.trim());

    if (error) {
      toast({
        title: "Hata",
        description: "Mesaj gönderilemedi.",
        variant: "destructive",
      });
    } else if (data) {
      setMessages((prev) => [...prev, data]);
      setNewMessage("");
    }
    setSending(false);
  };

  const selectedConversation = conversations.find((c) => c.partnerId === selectedPartnerId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Mesajlar - Mezunlar Derneği"
        description="Mezunlarla sohbet edin"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <h1 className="text-3xl font-heading font-bold mb-6">Mesajlar</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-16rem)]">
            {/* Conversations List */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Sohbetler
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Henüz mesajınız yok
                    </div>
                  ) : (
                    <div className="divide-y">
                      {conversations.map((conv) => (
                        <button
                          key={conv.partnerId}
                          onClick={() => setSelectedPartnerId(conv.partnerId)}
                          className={`w-full p-4 hover:bg-muted/50 transition-colors text-left ${
                            selectedPartnerId === conv.partnerId ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarImage src={conv.partnerAvatar || undefined} alt={conv.partnerName} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {conv.partnerName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-semibold truncate">{conv.partnerName}</h3>
                                {conv.unreadCount > 0 && (
                                  <Badge variant="default" className="ml-2">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.lastMessage}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(conv.lastMessageTime).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Active Conversation */}
            <Card className="md:col-span-2 flex flex-col">
              {selectedConversation ? (
                <>
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedConversation.partnerAvatar || undefined} alt={selectedConversation.partnerName} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {selectedConversation.partnerName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{selectedConversation.partnerName}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isSent = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSent ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isSent
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${isSent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>

                  <CardContent className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                      <Input
                        placeholder="Mesajınızı yazın..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={sending}
                      />
                      <Button type="submit" disabled={sending || !newMessage.trim()}>
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex-1 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Bir sohbet seçin</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}