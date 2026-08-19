import { ReactNode, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  CreditCard, 
  Calendar, 
  DollarSign,
  Zap,
  Settings,
  AlertTriangle
} from "lucide-react";

interface AutoPaySetupProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AutoPaySetup({ children, open, onOpenChange }: AutoPaySetupProps) {
  const [enableAutoPay, setEnableAutoPay] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState([5000]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDay, setPaymentDay] = useState("");

  const predefinedAmounts = [
    { value: "1000", label: "$1,000" },
    { value: "2500", label: "$2,500" },
    { value: "5000", label: "$5,000" },
    { value: "10000", label: "$10,000" },
    { value: "15000", label: "$15,000" },
    { value: "25000", label: "$25,000" },
    { value: "50000", label: "$50,000" }
  ];

  const paymentDays = [
    { value: "1", label: "1st of the month" },
    { value: "5", label: "5th of the month" },
    { value: "10", label: "10th of the month" },
    { value: "15", label: "15th of the month" },
    { value: "20", label: "20th of the month" },
    { value: "25", label: "25th of the month" },
    { value: "last", label: "Last day of the month" }
  ];

  const handleAmountSelect = (value: string) => {
    setPaymentAmount([parseInt(value)]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-[500px] sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold text-dashboard-text-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-dashboard-accent" />
            Setup Auto-Pay
          </SheetTitle>
          <SheetDescription className="text-dashboard-text-secondary">
            Configure automatic payment processing for your expense management
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Enable Auto-Pay */}
          <Card className="bg-dashboard-card border-dashboard-border">
            <CardHeader>
              <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Auto-Pay Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Auto-Pay</Label>
                  <p className="text-sm text-dashboard-text-secondary">
                    Automatically process payments on schedule
                  </p>
                </div>
                <Switch checked={enableAutoPay} onCheckedChange={setEnableAutoPay} />
              </div>

              {enableAutoPay && (
                <div className="p-4 bg-dashboard-hover rounded-lg border border-dashboard-accent/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-dashboard-accent" />
                    <span className="text-sm font-medium text-dashboard-text-primary">Auto-Pay Enabled</span>
                  </div>
                  <p className="text-xs text-dashboard-text-secondary">
                    Payments will be processed automatically based on your settings below.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {enableAutoPay && (
            <>
              {/* Payment Amount */}
              <Card className="bg-dashboard-card border-dashboard-border">
                <CardHeader>
                  <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payment Amount
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Quick Amount Selection */}
                  <div className="space-y-3">
                    <Label>Quick Select Amount</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {predefinedAmounts.map((amount) => (
                        <Button
                          key={amount.value}
                          variant={paymentAmount[0] === parseInt(amount.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAmountSelect(amount.value)}
                          className="justify-center"
                        >
                          {amount.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Slider for Custom Amount */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Custom Amount</Label>
                      <span className="text-lg font-semibold text-dashboard-text-primary">
                        ${paymentAmount[0].toLocaleString()}
                      </span>
                    </div>
                    <Slider
                      value={paymentAmount}
                      onValueChange={setPaymentAmount}
                      max={100000}
                      min={1000}
                      step={500}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-dashboard-text-secondary">
                      <span>$1,000</span>
                      <span>$100,000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Schedule */}
              <Card className="bg-dashboard-card border-dashboard-border">
                <CardHeader>
                  <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Payment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Day</Label>
                    <Select value={paymentDay} onValueChange={setPaymentDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment day" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentDays.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentDay && (
                    <div className="p-3 bg-dashboard-hover rounded-lg">
                      <p className="text-sm text-dashboard-text-secondary">
                        Next payment: <span className="font-medium text-dashboard-text-primary">
                          {paymentDay === "last" ? "December 31, 2024" : `December ${paymentDay}, 2024`}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="bg-dashboard-card border-dashboard-border">
                <CardHeader>
                  <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Payment Source</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-5 bg-blue-500 rounded text-white text-xs flex items-center justify-center">
                              BANK
                            </div>
                            Chase Business Account •••• 4567
                          </div>
                        </SelectItem>
                        <SelectItem value="bank-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-5 bg-green-500 rounded text-white text-xs flex items-center justify-center">
                              BANK
                            </div>
                            Wells Fargo Checking •••• 8901
                          </div>
                        </SelectItem>
                        <SelectItem value="credit-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center">
                              VISA
                            </div>
                            Corporate Credit Card •••• 2345
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod && (
                    <div className="p-3 bg-dashboard-hover rounded-lg">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-dashboard-accent" />
                        <span className="text-sm font-medium text-dashboard-text-primary">
                          Payment method selected
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warning Notice */}
              <Card className="bg-status-warning/10 border-status-warning/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-dashboard-text-primary">
                        Important Notice
                      </p>
                      <p className="text-xs text-dashboard-text-secondary">
                        Auto-pay will process payments automatically. Ensure sufficient funds are available 
                        in your selected payment method. You can modify or cancel auto-pay settings at any time.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" className="px-6" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  className="px-6 bg-dashboard-accent hover:bg-dashboard-accent/90"
                  disabled={!paymentDay || !paymentMethod}
                >
                  Setup Auto-Pay
                </Button>
              </div>
            </>
          )}

          {!enableAutoPay && (
            <div className="text-center py-8">
              <p className="text-dashboard-text-secondary">
                Enable auto-pay to configure automatic payment processing
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}