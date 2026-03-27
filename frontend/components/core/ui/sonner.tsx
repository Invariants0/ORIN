"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      icons={{
        success: (
          <CircleCheckIcon className="size-4 stroke-[3px]" />
        ),
        info: (
          <InfoIcon className="size-4 stroke-[3px]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 stroke-[3px]" />
        ),
        error: (
          <OctagonXIcon className="size-4 stroke-[3px]" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin stroke-[3px]" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          title: "font-black uppercase tracking-widest",
          description: "font-bold text-black/50 lowercase",
          actionButton: "bg-black text-white font-black uppercase rounded-none border-2 border-black",
          cancelButton: "bg-white text-black font-black uppercase rounded-none border-2 border-black",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
