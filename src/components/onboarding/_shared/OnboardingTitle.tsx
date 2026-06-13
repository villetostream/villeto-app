import React from 'react'

const OnboardingTitle = ({ title, subtitle }: { title: string, subtitle: string }) => {
    return (
        <div>
            <h1 className="text-3xl leading-[100%] font-bold text-black mb-3.5">{title}</h1>
            <p className="text-base font-normal leading-[100%] text-muted-foreground">
                {subtitle}
            </p></div>
    )
}

export default OnboardingTitle