import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "bg-transparent text-gray-700 dark:text-gray-200 shadow-xs hover:bg-muted/40",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "relative overflow-hidden text-white group",
        add: "bg-gradient-to-r from-green-400 via-lime-400 to-green-600 text-white shadow-xs hover:opacity-90",
        edit: "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white shadow-xs hover:opacity-90",
        delete: "bg-gradient-to-r from-red-500 via-pink-500 to-yellow-500 text-white shadow-xs hover:opacity-90",
        import: "bg-gradient-to-r from-blue-500 via-cyan-400 to-green-400 text-white shadow-xs hover:opacity-90",
        export: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xs hover:opacity-90",
        view: "bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400 text-white shadow-xs hover:opacity-90",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Map màu gradient cho từng variant đặc biệt
const gradientClassMap: Record<string, string> = {
  gradient: "bg-gradient-to-r from-fuchsia-600 via-pink-400 to-rose-500",
  add: "bg-gradient-to-r from-green-400 via-lime-400 to-green-600",
  edit: "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400",
  delete: "bg-gradient-to-r from-red-500 via-pink-500 to-yellow-500",
  import: "bg-gradient-to-r from-blue-500 via-cyan-400 to-green-400",
  export: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
  view: "bg-gradient-to-r from-gray-400 via-gray-200 to-gray-400",
};

const gradientVariants = [
  "gradient",
  "add",
  "edit",
  "delete",
  "import",
  "export",
  "view",
];

function Button({
  className,
  variant = "default",
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  const variantKey = (variant ?? "default") as keyof typeof gradientClassMap;
  const showGradient = gradientVariants.includes(variantKey);
  const gradientClass = gradientClassMap[variantKey];

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        className,
        showGradient && "relative overflow-hidden group"
      )}
      {...props}
    >
      {showGradient && (
        <span
          className={
            "absolute inset-0 animate-gradient-x transition-all duration-200 group-hover:blur-sm group-hover:scale-125 z-0 rounded-md " +
            gradientClass
          }
        />
      )}
      <span className={showGradient ? "relative z-10" : undefined}>
        {children}
      </span>
    </Comp>
  );
}

export { Button, buttonVariants };