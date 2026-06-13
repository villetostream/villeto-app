import React from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'

interface SuccessModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    buttonText?: string
    onClick?: () => void
}

const SuccessModal: React.FC<SuccessModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    buttonText = "Continue",
    onClick
}) => {
    const handleButtonClick = () => {
        if (onClick) {
            onClick()
        }
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md !rounded-[10px] !p-5">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className=" my-4 flex items-center justify-center">
                    <Image
                        src="/images/success.png"
                        alt="success"
                        width={320}
                        height={144}
                        className="w-full h-auto max-h-36 object-contain animate-pulse"
                        priority
                    />
                </div>
                <div className="flex flex-col items-center text-center">

                    {/* Success Icon */}

                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
                    {description && <DialogDescription className="text-gray-600 mb-6">{description}</DialogDescription>}

                    <Button
                        onClick={handleButtonClick}
                        className="w-full"
                    >
                        {buttonText}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default SuccessModal