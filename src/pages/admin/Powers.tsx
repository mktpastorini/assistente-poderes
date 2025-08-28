"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle } from 'lucide-react';

const PowersPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Poderes da IA (APIs/Webhooks)</h1>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Novo Poder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="power-name">Nome do Poder</Label>
            <Input id="power-name" placeholder="Ex: data_hora, clima_cidade" />
          </div>
          <div>
            <Label htmlFor="power-description">Descrição (para o prompt da IA)</Label>
            <Textarea id="power-description" placeholder="Descreva o que este poder faz e como a IA deve usá-lo. Ex: 'Quando o usuário perguntar a hora, execute o poder data_hora.'" rows={3} />
          </div>
          <div>
            <Label htmlFor="power-type">Tipo de Requisição</Label>
            <Input id="power-type" placeholder="Ex: GET, POST, cURL" />
          </div>
          <div>
            <Label htmlFor="power-endpoint">Endpoint / Comando</Label>
            <Textarea id="power-endpoint" placeholder="URL da API, comando cURL ou JSON da requisição..." rows={5} />
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Poder
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Poderes Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum poder adicionado ainda. Adicione um acima para que a IA possa utilizá-lo.</p>
          {/* Placeholder for listing existing powers */}
        </CardContent>
      </Card>
    </div>
  );
};

export default PowersPage;