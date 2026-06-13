"use client"

import { useState } from "react";
import { Building2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOnboardingStore } from "@/stores/useVilletoStore";

import { HugeiconsIcon } from '@hugeicons/react';
import { BankIcon, Link04Icon } from '@hugeicons/core-free-icons';

export const ConnectBankModal = () => {
    const {
        showConnectModal,
        setShowConnectModal,
        setBankConnected,
        setBankProcessing,
        addConnectedAccount
    } = useOnboardingStore();

    const [quickbookUrl, setQuickbookUrl] = useState('');
    const [sageUrl, setSageUrl] = useState('');

    const handleClose = () => {
        setShowConnectModal(false);
        setQuickbookUrl('');
        setSageUrl('');
    };

    const handleConnect = () => {
        const accounts = [];

        if (quickbookUrl.trim()) {
            accounts.push({
                id: Math.random().toString(36).substr(2, 9),
                name: 'QuickBooks',
                url: quickbookUrl.trim(),
                type: 'quickbook' as const,
            });
        }

        if (sageUrl.trim()) {
            accounts.push({
                id: Math.random().toString(36).substr(2, 9),
                name: 'Sage',
                url: sageUrl.trim(),
                type: 'sage' as const,
            });
        }

        accounts.forEach(account => addConnectedAccount(account));

        if (accounts.length > 0) {
            setBankConnected(true); // Assuming manual entry also counts as connecting
             // Simulate processing delay if needed, or just close
        }

        handleClose();
    };

    const handleDirectConnect = () => {
        setBankConnected(true);
        setBankProcessing(false);
        addConnectedAccount({
            id: Math.random().toString(36).substr(2, 9),
            name: 'Mono Bank',
            url: 'bank.mono.com',
            type: 'quickbook', // Using existing type for now
        });
        handleClose();
    };

    return (
        <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
            <DialogContent className="p-0 rounded-2xl max-w-[600px] overflow-hidden gap-0">
                 {/* Header */}
                <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                             <HugeiconsIcon icon={BankIcon} className="w-6 h-6 text-black" />
                        </div>
                        <div>
                             <DialogTitle className="text-xl font-bold text-black mb-1">Connect Bank</DialogTitle>
                             <p className="text-sm text-muted-foreground font-normal">We have provided two options to connect your bank</p>
                        </div>
                    </div>
                   
                </div>

                <div className="p-8 space-y-8">
                    {/* Connect Directly Option */}
                    <div className="space-y-4">
                         <h4 className="text-base font-normal text-black">
                            Connect Directly<span className="text-red-500">*</span>
                        </h4>

                        {/* Info Box */}
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-teal-50 border border-teal-500">
                             <div className="mt-0.5 border border-teal-500 rounded text-[10px] w-4 h-4 flex items-center justify-center flex-shrink-0 text-teal-600 font-bold">i</div>
                             <p className="text-sm text-black">We need this to better understand your finances and make payments</p>
                        </div>

                         {/* Action Button */}
                        <button
                            onClick={handleDirectConnect}
                            className="w-full bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <Building2 className="w-5 h-5 text-black" />
                            <span className="text-black font-normal">Click here to connect your bank directly using Mono</span>
                        </button>
                    </div>

                    {/* Bank Statement Option */}
                    <div className="space-y-4">
                         <h4 className="text-base font-normal text-black">
                            Bank Statement<span className="text-red-500">*</span>
                        </h4>

                         {/* Info Box */}
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-teal-50 border border-teal-500">
                             <div className="mt-0.5 border border-teal-500 rounded text-[10px] w-4 h-4 flex items-center justify-center flex-shrink-0 text-teal-600 font-bold">i</div>
                             <p className="text-sm text-black">We need this to add your accounting details to access your credit info</p>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                     <HugeiconsIcon icon={Link04Icon} className="w-5 h-5" />
                                </div>
                                <Input
                                    placeholder="Enter quickbook account link"
                                    value={quickbookUrl}
                                    onChange={(e) => setQuickbookUrl(e.target.value)}
                                    className="pl-12 h-12 bg-white border-gray-200 rounded-lg placeholder:text-gray-400"
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                     <HugeiconsIcon icon={Link04Icon} className="w-5 h-5" />
                                </div>
                                <Input
                                    placeholder="Enter sage account link"
                                    value={sageUrl}
                                    onChange={(e) => setSageUrl(e.target.value)}
                                    className="pl-12 h-12 bg-white border-gray-200 rounded-lg placeholder:text-gray-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Connect Button */}
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleConnect}
                            className="bg-[#00BFA5] hover:bg-[#00AB94] text-white px-8 py-2 h-12 rounded-lg flex items-center gap-2 text-base font-normal"
                        >
                            Connect
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};