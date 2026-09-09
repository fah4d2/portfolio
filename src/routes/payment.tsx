import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, ShieldCheck, Lock } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/payment")({
  head: () => ({
    meta: [
      { title: "Test Payment — Fahad Alazmi" },
      {
        name: "description",
        content: "Test payment integration page for testing checkout and payment gateway flow.",
      },
      { property: "og:title", content: "Test Payment — Fahad Alazmi" },
      { property: "og:description", content: "Test payment integration page." },
    ],
  }),
  component: PaymentPage,
});

function PaymentPage() {
  const [amount, setAmount] = useState<string>("50.00");
  const [cardName, setCardName] = useState<string>("Test User");
  const [cardNumber, setCardNumber] = useState<string>("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState<string>("12/28");
  const [cvc, setCvc] = useState<string>("123");
  const [processing, setProcessing] = useState<boolean>(false);
  const [completed, setCompleted] = useState<boolean>(false);

  function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      setCompleted(true);
      toast.success("Test Payment Processed Successfully!", {
        description: `Charged $${amount} USD in test mode.`,
      });
    }, 1500);
  }

  function resetForm() {
    setCompleted(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-12">
        <Card className="w-full border-border/60 bg-card/60 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-2 border-b border-border/40 pb-6">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 px-3 py-1">
                <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Test Mode Active
              </Badge>
              <div className="flex items-center text-xs text-muted-foreground gap-1">
                <Lock className="h-3 w-3" /> 256-bit Encrypted
              </div>
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Test Payment Checkout</CardTitle>
            <CardDescription>
              Demonstration payment portal to test checkout integration & publishable API keys.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 md:p-8">
            {completed ? (
              <div className="py-8 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Payment Completed</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Your test transaction of <span className="font-semibold text-foreground">${amount} USD</span> was processed successfully.
                </p>

                <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-left font-mono space-y-1.5 max-w-md mx-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-emerald-500 font-semibold">succeeded (test)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span>${amount} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card:</span>
                    <span>Visa ending in 4242</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span>tx_test_{Math.random().toString(36).substring(2, 10)}</span>
                  </div>
                </div>

                <div className="pt-4 flex justify-center gap-3">
                  <Button onClick={resetForm} variant="outline">
                    Test Another Payment
                  </Button>
                  <Button asChild>
                    <Link to="/">Return to Home</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePayment} className="space-y-6">
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service / Item:</span>
                    <span className="font-medium">Cybersecurity Consultation (Test)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Due:</span>
                    <span className="font-bold text-lg text-primary">${amount} USD</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Custom Test Amount ($ USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardName">Cardholder Name</Label>
                    <Input
                      id="cardName"
                      placeholder="Jane Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                      />
                      <CreditCard className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expires</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvc">CVC / CVV</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        maxLength={4}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full text-base font-semibold py-6" disabled={processing}>
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Processing Test Payment...
                    </span>
                  ) : (
                    `Pay $${amount} USD (Test)`
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
