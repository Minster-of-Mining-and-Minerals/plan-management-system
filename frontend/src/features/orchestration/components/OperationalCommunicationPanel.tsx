"use client";

import { MessageSquare, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetOperationalMessagesQuery, type OperationalMessage } from "@/redux/api/incidentApi";

export function OperationalCommunicationPanel() {
  const { data: messages = [], isLoading } = useGetOperationalMessagesQuery();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 border-b bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-semibold">Operational Communication Hub</CardTitle>
          <Badge variant="outline" className="ml-auto text-[9px]">Live Broadcast</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3 text-xs space-y-2 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground animate-pulse">Loading operational messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No operational broadcasts recorded.</div>
        ) : (
          messages.map((m: OperationalMessage) => (
            <div key={m.message_id} className="p-2 border rounded space-y-1 hover:bg-slate-50/50">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-[9px]">{m.recipient_role}</Badge>
                <span className="text-[9px] text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[10px] text-slate-800 dark:text-slate-200">{m.content}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
