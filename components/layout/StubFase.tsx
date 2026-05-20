import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function StubFase({ fase, descricao }: { fase: string; descricao: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Construction className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Em construção — {fase}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{descricao}</p>
      </CardContent>
    </Card>
  );
}
