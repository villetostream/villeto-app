import React, { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Button, type ButtonProps as UIButtonProps } from '../ui/button'
import { LucideIcon } from 'lucide-react' // or your icon library
import { ArrowDown2, Filter } from 'iconsax-reactjs'

interface ModalComponentInterface {
    buttonText: string
    isOpen: boolean
    onOpen: () => void;
    title: string
    description?: string
    children: ReactNode
    variant?: UIButtonProps['variant']
    icon?: LucideIcon
    iconPosition?: 'left' | 'right'
}

const ModalComponent = ({
    title,
    description,
    buttonText: _buttonText,
    children,
    isOpen,
    onOpen,
    variant = "outline",
    icon: _Icon,
    iconPosition: _iconPosition = 'left'
}: ModalComponentInterface) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} size="md" className="flex items-center gap-2">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                    <ArrowDown2 />
                </Button>
            </DialogTrigger>
            <DialogContent className='!p-6 max-h-[80%] overflow-y-auto rounded-lg'>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription>
                            {description}
                        </DialogDescription>
                    )}
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    )
}

export default ModalComponent