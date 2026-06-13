import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { HugeiconsIcon } from '@hugeicons/react';
import { LinkSquare01FreeIcons, BankIcon, Delete01Icon, PencilEdit02Icon, Link01Icon } from '@hugeicons/core-free-icons';
export const BankConnection = () => {
    const {
        bankConnected,
        bankProcessing,
        connectedAccounts,
        setShowConnectModal,
        removeConnectedAccount
    } = useOnboardingStore();

    const handleConnect = () => {
        setShowConnectModal(true);
    };

    const handleRemoveAccount = (id: string) => {
        removeConnectedAccount(id);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-normal leading-[100%] tracking-[0%] mb-2">
                    Bank Connection<span className="text-red-500">*</span>
                </h3>
            </div>

            {!bankConnected && connectedAccounts.length === 0 ? (
                // Initial state - not connected
                <div

                    className="w-full bg-[#FBFBFB] border border-[#D7D7D750] transition-colors duration-200  p-5 rounded-xl"
                >
                    <div className="flex items-start gap-3">
                        <HugeiconsIcon icon={BankIcon} className="w-5 h-5 text-villeto-gray mt-1" />
                        <div className="text-left">
                            <div className="font-normal tracking-[0%] leading-[100%] text-black text-base mb-1.5">Connect your bank</div>
                            <div className="text-[13px] tracking-[0%] leading-[100%] text-muted-foreground">View two ways to connect your bank</div>
                        </div>
                        <Button variant="ghost"
                            onClick={handleConnect} className="bg-gray-100 hover:bg-gray-200 text-black ml-auto" >
                            Connect
                            <HugeiconsIcon icon={LinkSquare01FreeIcons} className="size-4 text-black" />
                        </Button>
                    </div>
                </div>
            ) : (
                // Connected state
                <div className="space-y-4">
                    {/* Bank authorization status */}
                    {bankProcessing ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Building2 className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <div className="font-medium text-amber-800">Bank Authorization</div>
                                    <div className="text-sm text-amber-700 mt-1">
                                        Your bank is processing the request to connect your bank account.                                         You&apos;ll be notified when we have a response.
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-green-600" />
                                <div>
                                    <div className="font-medium text-green-800">Bank Authorization</div>
                                    <div className="text-sm text-green-700">Your bank authorized the connection!</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connected accounts */}
                    {connectedAccounts.map((account) => (
                        <div
                            key={account.id}
                            className="flex items-center gap-3 p-3 px-5 border border-[#D7D7D7] rounded-lg"
                        >
                            <div className="w-8 h-8 bg-villeto-light-gray rounded flex items-center justify-center">
                                <HugeiconsIcon icon={Link01Icon} className="w-4 h-4 text-black" />
                            </div>
                            <div className="flex-1">
                                <div className="font-normal tracking-[0%] leading-[100%] text-black">{account.url}</div>
                            </div>
                            <Button variant="ghost" size="sm" className="-10 h-10 rounded-full bg-muted">
                                <HugeiconsIcon icon={PencilEdit02Icon} className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAccount(account.id)}
                                className="text-gray hover:text-red-500 w-10 h-10 rounded-full bg-muted"
                            >
                                <HugeiconsIcon icon={Delete01Icon} className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};