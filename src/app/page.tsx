'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { generatePixCharge } from '@/ai/flows/generate-pix-charge';
import { checkPixStatus } from '@/ai/flows/check-pix-status';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Add a declaration for the Facebook Pixel function
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

export default function Home() {
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  const recipientName = "Camilla Gomes";
  const amount = "40.00";

  useEffect(() => {
    if (transactionId && paymentStatus !== 'paid') {
      statusCheckInterval.current = setInterval(async () => {
        try {
          const { status } = await checkPixStatus({ transactionId });
          if (status === 'paid') {
            setPaymentStatus('paid');
            if (window.fbq) {
              window.fbq('track', 'Purchase', { currency: "BRL", value: parseFloat(amount) });
            }
            toast({
              title: "Pagamento Confirmado!",
              description: "Seu pagamento foi recebido com sucesso.",
              variant: "default",
              className: "bg-green-500 text-white"
            });
            if (statusCheckInterval.current) {
              clearInterval(statusCheckInterval.current);
            }
          }
        } catch (error) {
          console.error('Error checking PIX status:', error);
        }
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, [transactionId, paymentStatus, toast, amount]);

  const handleGeneratePix = async () => {
    setIsLoading(true);
    setIsCopied(false);
    setPixKey(null);
    setTransactionId(null);
    setPaymentStatus(null);
    
    if (window.fbq) {
        window.fbq('track', 'AddToCart');
    }

    try {
      const { copyPasteKey, transactionId: newTransactionId } = await generatePixCharge({});
      setPixKey(copyPasteKey);
      setTransactionId(newTransactionId);
    } catch (error) {
      console.error('Error generating PIX key:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a chave PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!pixKey) return;
    if (window.fbq) {
        window.fbq('track', 'InitiateCheckout');
    }
    navigator.clipboard.writeText(pixKey).then(() => {
      setIsCopied(true);
      toast({
        title: "Copiado!",
        description: "Chave PIX copiada para a área de transferência.",
      });
      setTimeout(() => setIsCopied(false), 3000);
    });
  };
  
  const renderContent = () => {
    if (paymentStatus === 'paid') {
      return (
        <div className="text-center space-y-4 animate-in fade-in duration-500">
            <Check className="h-16 w-16 text-green-500 mx-auto bg-green-100 rounded-full p-2"/>
            <h2 className="text-2xl font-bold">Pagamento Aprovado!</h2>
            <p className="text-muted-foreground">Obrigado por sua confiança.</p>
             <Button onClick={() => window.location.reload()} className="w-full" size="lg">
                Gerar Nova Cobrança
            </Button>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="relative flex h-[300px] w-[300px] items-center justify-center rounded-lg bg-transparent">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      );
    }

    if (pixKey) {
      return (
        <>
          <div className="flex items-center justify-center transition-all duration-300 ease-in-out">
            <Image src="https://gorgeous-pastelito-593971.netlify.app/texto-seu-paragrafo.png" alt="PIX" width={300} height={300} />
          </div>
          <div className="w-full animate-in fade-in duration-500 space-y-4 text-center">
            <div className="text-sm text-muted-foreground">
              <p><span className="font-semibold text-foreground">Beneficiário:</span> {recipientName}</p>
            </div>
            <div className="relative w-full">
              <Input
                readOnly
                value={pixKey}
                className="pr-12 text-sm"
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2" onClick={handleCopy}>
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="w-full space-y-4 text-center">
            <p className="font-semibold text-foreground text-2xl">R$ {amount.replace('.', ',')}</p>
            <Button onClick={handleCopy} disabled={isLoading} className="w-full" size="lg">
              {isCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copiado!
                </>
              ) : (
                "Copiar Pix Copia e Cola"
              )}
            </Button>
          </div>
        </>
      );
    }

    return (
      <div className="w-full space-y-4 text-center">
        <p className="font-semibold text-foreground text-2xl">R$ {amount.replace('.', ',')}</p>
        <Button onClick={handleGeneratePix} disabled={isLoading} className="w-full" size="lg">
          Gerar Cobrança PIX
        </Button>
      </div>
    );
  }

  return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 font-body">
        <header className="absolute top-6 flex flex-col items-center gap-4 text-foreground sm:top-8">
          <Avatar className="h-32 w-32 border-4 border-primary/20">
            <AvatarImage src="https://gorgeous-pastelito-593971.netlify.app/fyp-explore.jpg" alt="Camilla Gomes" />
            <AvatarFallback>CG</AvatarFallback>
          </Avatar>
          <h1 className="text-4xl font-bold tracking-tight mb-8">Camilla Gomes</h1>
        </header>

        <Card className="mt-72 w-full max-w-sm rounded-xl shadow-2xl shadow-black/5 sm:max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Área de Pagamento</CardTitle>
            <CardDescription>
              {pixKey ? (paymentStatus === 'paid' ? 'Pagamento confirmado!' : 'Copie a chave para pagar') : 'Gere uma cobrança para começar'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {renderContent()}
          </CardContent>
          <CardFooter>
             <p className="w-full text-center text-xs text-muted-foreground">
                Plataforma segura para pagamentos instantâneos.
             </p>
          </CardFooter>
        </Card>
      </main>
  );
}
