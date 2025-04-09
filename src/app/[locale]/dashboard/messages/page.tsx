"use client";

import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MessagesPage() {
  // Mock conversations data
  const conversations = [
    { id: "1", name: "John Doe", lastMessage: "Hi, I'd like to reschedule my appointment", time: "10:30 AM", unread: true },
    { id: "2", name: "Jane Smith", lastMessage: "Thanks for the confirmation", time: "Yesterday", unread: false },
    { id: "3", name: "Mike Johnson", lastMessage: "Do you have any availability next week?", time: "Yesterday", unread: false },
    { id: "4", name: "Sarah Williams", lastMessage: "I need to cancel my appointment", time: "Monday", unread: false },
    { id: "5", name: "David Brown", lastMessage: "Looking forward to my appointment!", time: "Sunday", unread: false },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with your clients
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Conversations</CardTitle>
                <Badge>{conversations.filter(c => c.unread).length}</Badge>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search messages..."
                  className="pl-8 w-full"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id} 
                    className={`p-4 cursor-pointer hover:bg-muted/50 ${conversation.unread ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-medium">{conversation.name}</h3>
                      <span className="text-xs text-muted-foreground">{conversation.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unread && (
                      <div className="flex justify-end mt-1">
                        <Badge variant="default" className="h-2 w-2 rounded-full p-0" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                  JD
                </div>
                <div>
                  <CardTitle>John Doe</CardTitle>
                  <CardDescription>Last active: 5 minutes ago</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[400px] flex items-center justify-center border-y">
                <p className="text-muted-foreground">Message history coming soon</p>
              </div>
              <div className="p-4 flex gap-2">
                <Input placeholder="Type your message..." className="flex-1" />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
