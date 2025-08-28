"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ConversationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Conversas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Conversas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">O histórico de conversas aparecerá aqui. Futuramente, você poderá interagir via chat.</p>
          {/* Placeholder for conversation list */}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConversationsPage;